"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { worldRequest } from "@/lib/group-chat/client";
import {
  maxPriorContextLength,
  type WorldConfig,
  type WorldRoom,
} from "@/lib/group-chat/model";
import type {
  NovelRunPhase,
  NovelRunToolCall,
} from "@/lib/group-chat/novel-run-contract";
import type { ChapterDraftBackup } from "./chapter-draft-backup";
import {
  type CompressionOptions,
  compressedChapterPrompt,
  fitsNovelRequest,
  initialCompressionCursor,
  isNovelRequestTooLarge,
  novelRequestBudget,
  novelWithCompression,
  planCompressionBatch,
  smallerNovelBudget,
} from "./context-compression";
import { createImportedNovel, type ImportedNovel } from "./import-novel";
import {
  createBackground,
  maxChapterLength,
  maxNovelSummaryLength,
  type Novel,
  type NovelBackground,
  type NovelTask,
  novelCheckpointCount,
  novelRequest,
  summaryPrompt,
} from "./model";
import { createNovelChapterActions } from "./novel-chapter-actions";
import {
  archiveNovelRunOutput,
  archiveNovelRunStart,
} from "./novel-history-run";
import {
  type ChapterRun,
  type Compression,
  editableNovelState,
  type NovelRun,
  type RestoredNovelRun,
  rebindNovelRun,
  sourceNovel,
  storedNovelRun,
} from "./novel-run";
import type { PendingResultBackup } from "./pending-result-backup";
import {
  type PlotDraft,
  plotDraftEditableText,
  readPlotDraft,
} from "./plot-edit";
import { incompleteNovelDraftNotice } from "./restore-pending-result";
import {
  createThinkingHistoryStore,
  type ThinkingHistoryEntry,
} from "./thinking-history";
import { addNovelCopy, useNovelStorage } from "./use-novel-storage";
import { useNovelTask } from "./use-novel-task";

export function useNovel(
  room: WorldRoom,
  onBusyChange: (busy: boolean) => void,
  onBackgroundReady: (background: NovelBackground) => void,
  onDraftRestored: (draft: ChapterDraftBackup) => void,
  onPendingRestored: (pending: PendingResultBackup) => void = () => {},
  onRunRestored: (run: RestoredNovelRun) => void = () => {},
) {
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [toolCalls, setToolCalls] = useState<NovelRunToolCall[]>([]);
  const [runPhase, setRunPhase] = useState<NovelRunPhase | undefined>();
  const [thinkingHistory, setThinkingHistory] = useState<
    ThinkingHistoryEntry[]
  >([]);
  const [task, setTask] = useState<NovelTask>("chapter");
  const [generationStopped, setGenerationStopped] = useState(false);
  const [draftIncomplete, setDraftIncomplete] = useState(false);
  const [rewriteReady, setRewriteReady] = useState(false);
  const [plotDraft, setPlotDraft] = useState<PlotDraft | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [checkpointCandidate, setCheckpointCandidate] = useState<{
    source: Novel;
    checkpoint: NonNullable<Novel["checkpoint"]>;
  } | null>(null);
  const [backgroundExport, setBackgroundExport] =
    useState<NovelBackground | null>(null);
  const input = useRef<NovelRun | null>(null);
  const output = useRef("");
  const generating = useRef(false);
  const currentRoom = useRef(room);
  currentRoom.current = room;
  const {
    key,
    lineage,
    chapterHistoryError,
    storageVersion,
    missingLocal,
    syncReadFailed,
    conflictedPlot,
    novel,
    latest,
    update,
    updateChapterGoal,
    renameChapter,
    updateContext,
    ready: storageReady,
    loadFailed,
    saving,
    syncPrompt,
    serverSynced,
    hasLocalBackup,
    saveToServer,
    syncFromServer,
    restoreLocalBackup,
    draftBackupFailed,
    backup,
    pendingBackup,
  } = useNovelStorage(room, {
    generating,
    onError: setError,
    onUpdate: () => setBackgroundExport(null),
    onDraftRestored,
    onPendingRestored(pending, restoredPending) {
      input.current = restoredPending.run;
      setPreview(restoredPending.preview);
      setTask(restoredPending.task);
      setPlotDraft(restoredPending.plotDraft);
      setRewriteReady(true);
      setDraftIncomplete(restoredPending.incomplete);
      setError(restoredPending.notice);
      onPendingRestored(pending);
    },
  });

  const thinkingHistoryStore = useMemo(
    () => createThinkingHistoryStore(key),
    [key],
  );
  useEffect(() => {
    setThinkingHistory(thinkingHistoryStore.list());
  }, [thinkingHistoryStore]);
  const clearThinkingHistory = useCallback(() => {
    setThinkingHistory(thinkingHistoryStore.clear());
  }, [thinkingHistoryStore]);

  function end() {
    generating.current = false;
    setBusy(false);
    setCompressing(false);
    onBusyChange(false);
  }

  function recoverEmptyContinuation() {
    const previous = backup.cancelEmptyReplacement();
    if (!previous) return false;
    setPreview(previous.text);
    setGenerationStopped(true);
    return true;
  }

  function keepPlotDraft(
    run: Extract<NovelRun, { plot: unknown }>,
    draft: PlotDraft,
    cutShort = false,
  ) {
    setPlotDraft(draft);
    setDraftIncomplete(cutShort);
    setRewriteReady(true);
    pendingBackup.write({
      kind: "plot",
      mode: run.plot.mode,
      ids: [...run.plotIds],
      requirements: run.plotRequirements,
      draft,
      version: run.version,
      storageVersion: run.storageVersion,
      incomplete: cutShort || undefined,
    });
  }
  function receiveText(text: string) {
    if (output.current === text) return;
    output.current = text;
    const run = input.current;
    if (run && "plot" in run) return;
    if (run?.task === "summary" && "batch" in run) return;
    if (run?.task === "chapter") backup.write(text);
    if (run?.task === "chapter" && run.onFirstText && text.trim()) {
      const onFirstText = run.onFirstText;
      run.onFirstText = undefined;
      flushSync(() => {
        setPreview(text);
        onFirstText();
      });
      return;
    }
    setPreview(text);
  }
  function complete(cutShort: boolean, version: number, runId: string) {
    const text = output.current.trim();
    const captured = input.current;
    if (captured?.task === "summary" && "batch" in captured) {
      if (cutShort || !text || text.length > maxNovelSummaryLength) {
        end();
        setError("剧情摘要未生成完整或过长，请重试压缩。");
        return;
      }
      const compression = {
        ...captured.compression,
        cursor: {
          index: captured.batch.index,
          offset: captured.batch.offset,
          summary: text,
        },
      };
      const continuation = captured.continuation;
      const needsNext =
        Boolean(continuation) || compression.cursor.index < compression.through;
      if (
        needsNext &&
        (latest.current !== compression.novel ||
          currentRoom.current.status === "ended" ||
          currentRoom.current.version !== version)
      ) {
        end();
        setError("小说或世界设定已变更，无法继续压缩，请重新发起。");
        return;
      }
      if (continuation) {
        if (!continueChapter({ ...continuation, compression })) end();
      } else if (compression.cursor.index < compression.through) {
        if (!compress(compression, undefined, captured.exportBackground)) end();
      } else {
        if (captured.exportBackground)
          publishBackground(
            captured.compression.config,
            compression.novel,
            text,
          );
        else {
          const { checkpoint } = novelWithCompression(
            compression.novel,
            compression.cursor,
          );
          if (checkpoint)
            setCheckpointCandidate({ source: compression.novel, checkpoint });
        }
        end();
      }
      return;
    }
    end();
    if (!text) {
      const recovered = !text && recoverEmptyContinuation();
      backup.flush();
      setDraftIncomplete(Boolean(text) && !recovered);
      setError(
        recovered
          ? "没有收到新正文，已恢复重新生成前的草稿。"
          : "连接提前结束或没有生成内容。已收到的正文仍可编辑。",
      );
      return;
    }
    if (!captured) return;
    const cutShortNotice = incompleteNovelDraftNotice;
    if ("plot" in captured) {
      try {
        keepPlotDraft(
          captured,
          readPlotDraft(captured.plot, text, runId),
          cutShort,
        );
      } catch (error) {
        setDraftIncomplete(false);
        setError(error instanceof Error ? error.message : "无法读取剧情草稿。");
        return;
      }
      setError(cutShort ? cutShortNotice : "");
      return;
    }
    if (captured.task === "summary") {
      setDraftIncomplete(false);
      if (cutShort) {
        setError(
          "输出未写完，请缩减范围后重新生成，或改用手动输入。摘要未采用。",
        );
        setPreview("");
        return;
      }
      publishBackground(captured.config, captured.novel, text);
      return;
    }
    if (captured.task === "chapter") saveCheckpoint(captured.compression);
    if (text.length > maxChapterLength) {
      setError(`草稿超过 ${maxChapterLength} 字，请缩短后保存。`);
      setDraftIncomplete(cutShort);
    } else {
      setDraftIncomplete(cutShort);
      setError(cutShort ? cutShortNotice : "");
    }
    if (captured.task === "chapter") {
      backup.write(text);
      backup.flush();
    }
    setPreview(text);
  }

  function fail(message: string, version: number) {
    const run = input.current;
    const canRetry =
      run &&
      sourceNovel(run) === latest.current &&
      currentRoom.current.version === version &&
      currentRoom.current.status !== "ended";
    if (
      canRetry &&
      run.task === "summary" &&
      !("batch" in run) &&
      isNovelRequestTooLarge(message)
    ) {
      const compression = createCompression(
        run.novel,
        run.novel.chapters.length,
      );
      compression.budget = smallerNovelBudget(
        room.id,
        summaryPrompt(run.config, run.novel),
        "summary",
        compression.budget,
      );
      if (compress(compression, undefined, true)) return;
      end();
      return;
    }
    if (
      canRetry &&
      !("plot" in run) &&
      "compression" in run &&
      isNovelRequestTooLarge(message)
    ) {
      const current = run.compression;
      const noChapterText = !output.current.trim();
      if (current.retries < 4 && (run.task === "summary" || noChapterText)) {
        const prompt =
          run.task === "summary"
            ? run.batch.prompt
            : continuationPrompt(current);
        const next = {
          ...current,
          retries: current.retries + 1,
          budget: smallerNovelBudget(room.id, prompt, run.task, current.budget),
        };
        if (
          compress(
            next,
            run.task === "chapter" ? run : run.continuation,
            run.task === "summary" && run.exportBackground,
          )
        )
          return;
        end();
        return;
      }
    }
    backup.flush();
    end();
    const recovered = recoverEmptyContinuation();
    setDraftIncomplete(!recovered && Boolean(output.current.trim()));
    setError(recovered ? `${message} 已恢复重新生成前的草稿。` : message);
  }

  function prepare(run: NovelRun) {
    input.current = run;
    setError("");
    const archiving = run.task === "summary" && "batch" in run;
    setCompressing(archiving);
    setTask(archiving && run.continuation ? "chapter" : run.task);
    setGenerationStopped(false);
    setDraftIncomplete(false);
    if (!("plot" in run) && run.task !== "rewrite") setBackgroundExport(null);
    setRewriteReady(false);
    setPlotDraft(null);
    pendingBackup.clear();
    output.current = "";
    setPreview("");
    setToolCalls([]);
    setRunPhase("preparing");
    generating.current = true;
    setBusy(true);
    onBusyChange(true);
  }

  function persistRewrite(incomplete: boolean) {
    const run = input.current;
    if (run?.task !== "rewrite" || "plot" in run || !output.current.trim())
      return true;
    const chapter = run.novel.chapters.find(({ id }) => id === run.chapterId);
    if (!chapter) return false;
    return pendingBackup.write({
      kind: "selection",
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      baseText: chapter.text,
      range: run.range,
      preview: output.current.trim(),
      version: run.version,
      incomplete: incomplete || undefined,
    });
  }

  const taskConnection = useNovelTask<NovelRun>({
    key,
    storageReady,
    onError: setError,
    onText: receiveText,
    onTools: setToolCalls,
    onPhase: setRunPhase,
    async onStart(entry) {
      try {
        await archiveNovelRunStart(entry);
      } catch {
        setHistoryError("本机历史写入失败，请检查浏览器存储空间。");
      }
    },
    onProgress: archiveNovelRunOutput,
    async onResult(entry, snapshot, message) {
      const { version, runId } = entry.request;
      const archive = archiveNovelRunOutput(
        entry,
        snapshot ?? {
          status: "failed",
          text: output.current,
          incomplete: Boolean(output.current.trim()),
          tools: toolCalls,
          error: message ?? null,
        },
      ).then(
        () => {
          setHistoryError("");
          return true;
        },
        () => {
          setHistoryError(
            "本次结果未能存入历史，请保留草稿并检查浏览器存储空间。",
          );
          return false;
        },
      );
      const run = input.current;
      if (snapshot) {
        receiveText(snapshot.text);
        setToolCalls(snapshot.tools ?? []);
        setRunPhase(snapshot.phase);
      }
      if (snapshot?.status === "completed") {
        complete(snapshot.incomplete, version, runId);
      } else if (snapshot?.status === "cancelled") {
        stopLocally();
      } else {
        fail(message ?? snapshot?.error ?? "小说生成未完成。", version);
      }

      if (run !== input.current) return archive;
      const isContinuation = run?.task === "chapter" && !("plot" in run);
      const draftSaved = persistRewrite(
        snapshot?.status !== "completed" || snapshot.incomplete,
      );
      const chapterSaved =
        !isContinuation ||
        !output.current.trim() ||
        (await backup.checkpoint()) !== undefined;
      return (await archive) && draftSaved && chapterSaved;
    },
    onRestore(entry) {
      const current = latest.current;
      let run = entry.run;
      if (editableNovelState(sourceNovel(run)) === editableNovelState(current))
        run = rebindNovelRun(run, current);
      if ("plot" in run) {
        onRunRestored({
          kind: "plot",
          mode: run.plot.mode,
          ids: run.plotIds,
          requirements: run.plotRequirements,
        });
      } else if (run.task === "rewrite") {
        const chapter = run.novel.chapters.find(
          ({ id }) => id === run.chapterId,
        );
        if (chapter)
          onRunRestored({ kind: "rewrite", chapter, range: run.range });
      } else {
        const chapterRun =
          run.task === "chapter"
            ? run
            : "batch" in run
              ? run.continuation
              : undefined;
        if (chapterRun) {
          if (
            current.chapters.some(
              ({ id }) => id === chapterRun.draft.chapter.id,
            )
          ) {
            return false;
          }
          backup.start(chapterRun.draft);
          onRunRestored({ kind: "chapter", draft: chapterRun.draft });
        }
      }
      prepare(run);
      return true;
    },
  });
  const { ready, reconnecting, stop } = taskConnection;

  function start(run: NovelRun, prompt: string): void {
    prepare(run);
    taskConnection.start(
      {
        ...novelRequest(room.id, prompt, run.task),
        version: currentRoom.current.version,
      },
      storedNovelRun(run),
    );
  }

  function createCompression(novel: Novel, through: number): Compression {
    return {
      novel,
      config: room.config,
      through,
      cursor: initialCompressionCursor(novel, through),
      budget: novelRequestBudget,
      retries: 0,
    };
  }

  function continuationPrompt({ config, novel, through, cursor }: Compression) {
    return compressedChapterPrompt(config, novel, through, cursor);
  }

  function continueChapter(run: ChapterRun): boolean {
    const { compression } = run;
    if (!compression.cursor.offset) {
      const prompt = continuationPrompt(compression);
      if (fitsNovelRequest(room.id, prompt, "chapter", compression.budget)) {
        start(run, prompt);
        return true;
      }
    }
    return compress(compression, run);
  }

  function compress(
    compression: Compression,
    continuation?: ChapterRun,
    exportBackground = false,
  ): boolean {
    const { config, novel, cursor, through, budget } = compression;
    const batch = planCompressionBatch(
      room.id,
      config,
      novel,
      cursor,
      continuation && cursor.index < through - 1 ? through - 1 : through,
      budget,
      compression.options,
    );
    if (!batch) {
      setError("上下文仍超限，请缩短世界设定、导入背景或本次写作要求后重试。");
      return false;
    }
    start(
      { task: "summary", compression, batch, continuation, exportBackground },
      batch.prompt,
    );
    return true;
  }

  function saveCheckpoint({ novel, cursor }: Compression) {
    const current = latest.current;
    if (
      current.chapters !== novel.chapters ||
      current.background !== novel.background ||
      novelCheckpointCount(current) > cursor.index
    )
      return;
    const { checkpoint } = novelWithCompression(novel, cursor);
    if (
      checkpoint &&
      (current.checkpoint?.throughChapterId !== checkpoint.throughChapterId ||
        current.checkpoint?.summary !== checkpoint.summary)
    )
      void update({ ...current, checkpoint }, { touch: false });
  }

  function publishBackground(config: WorldConfig, novel: Novel, text: string) {
    if (text.length > maxPriorContextLength) {
      setError("总结超过前置剧情的字数上限。可复制下方草稿，缩短后导入。");
      setPreview(text);
      return;
    }
    try {
      const background = createBackground(config, novel, text);
      setBackgroundExport(background);
      setPreview("");
      onBackgroundReady(background);
    } catch {
      setError("总结导出失败，请缩减内容后重试。");
    }
  }

  function generateBackground() {
    if (!ready || generating.current || room.status === "ended") return;
    setError("");
    const current = latest.current;
    if (!current.chapters.length) {
      setError("请先完成至少一章，再总结导出背景。");
      return;
    }
    const prompt = summaryPrompt(room.config, current);
    if (!fitsNovelRequest(room.id, prompt, "summary")) {
      const through = current.chapters.length;
      compress(createCompression(current, through), undefined, true);
      return;
    }
    start({ task: "summary", config: room.config, novel: current }, prompt);
  }

  function compressContext(options: CompressionOptions) {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    if (!current.chapters.length) return;
    setCheckpointCandidate(null);
    const through = Math.max(
      1,
      current.chapters.length - 1,
      novelCheckpointCount(current),
    );
    compress({
      ...createCompression(current, through),
      cursor: { index: 0, offset: 0, summary: "" },
      options,
    });
  }

  async function applyCheckpoint() {
    if (!checkpointCandidate || generating.current || saving) return;
    const { source, checkpoint } = checkpointCandidate;
    const current = latest.current;
    if (
      current.chapters !== source.chapters ||
      current.checkpoint !== source.checkpoint
    ) {
      setError("正文或摘要已修改，请重新压缩。");
      return;
    }
    if (
      await update(
        { ...current, checkpoint },
        { persistFirst: true, touch: false, backupPrevious: true },
      )
    ) {
      setCheckpointCandidate(null);
      setError("");
    }
  }

  async function createFork() {
    if (!ready || generating.current) throw new Error("当前暂不可复制小说。");
    const current = latest.current;
    generating.current = true;
    onBusyChange(true);
    try {
      const { room: created } = await worldRequest<{ room: WorldRoom }>(
        "rooms",
        "POST",
        { ...room.config, kind: "novel" },
      );
      try {
        await addNovelCopy(`${created.ownerId}:${created.id}`, current);
      } catch {
        try {
          await worldRequest(`rooms/${created.id}`, "DELETE");
        } catch {
          throw new Error(
            "本地小说写入失败，新建的空房间未能清理；原小说未改动。",
          );
        }
        throw new Error("无法保存小说副本，请检查浏览器存储空间。");
      }
      return created.id;
    } finally {
      generating.current = false;
      onBusyChange(false);
    }
  }

  function stopLocally() {
    backup.flush();
    end();
    const run = input.current;
    const recovered = recoverEmptyContinuation();
    if (recovered) {
      setError("未收到新正文，已恢复上一份草稿。");
      return;
    }
    if (run?.task === "summary" && "batch" in run) {
      setError("已停止压缩上下文，原正文和摘要已保留。");
      return;
    }
    if (
      run &&
      !("plot" in run) &&
      (run.task === "chapter" || run.task === "rewrite")
    ) {
      setGenerationStopped(true);
    } else {
      setError("已停止，本次草稿未计入正文或导出文件，可以重新生成。");
    }
  }

  const chapterActions = createNovelChapterActions({
    room,
    storage: { latest, storageVersion, backup, pendingBackup, update },
    ready,
    generating,
    input,
    plotDraft,
    draftIncomplete,
    start,
    createCompression,
    continueChapter,
    keepPlotDraft,
    setDraftIncomplete,
    setError,
    setPlotDraft,
    setPreview,
    setRewriteReady,
  });

  return {
    ...chapterActions,
    novel,
    lineage,
    stageHistoryContinuation: backup.stageHistory,
    isCurrentNovel: (source: Novel) => latest.current === source,
    missingLocal,
    syncReadFailed,
    conflictedPlot,
    update,
    updateChapterGoal,
    renameChapter,
    updateContext,
    ready,
    loadFailed,
    error: reconnecting
      ? "连接已断开，正在重连原生成任务…"
      : error || historyError || chapterHistoryError,
    syncPrompt,
    serverSynced,
    hasLocalBackup,
    saveToServer,
    syncFromServer,
    restoreLocalBackup,
    draftBackupFailed,
    backupDraftText: backup.write,
    checkpointDraftBackup: backup.checkpoint,
    clearDraftBackup: backup.clear,
    saving,
    busy,
    compressing,
    summarizingBackground:
      input.current?.task === "summary" &&
      (!("batch" in input.current) || Boolean(input.current.exportBackground)),
    preview,
    toolCalls,
    runPhase,
    thinkingHistory,
    historyError: historyError || chapterHistoryError,
    clearThinkingHistory,
    task,
    generationStopped,
    draftIncomplete,
    rewriteReady,
    plotDraft,
    editablePlotText:
      plotDraft && input.current && "plot" in input.current
        ? plotDraftEditableText(input.current.plot, plotDraft)
        : [],
    backgroundExport,
    checkpointCandidate: checkpointCandidate?.checkpoint,
    applyCheckpoint,
    discardCheckpoint: () => setCheckpointCandidate(null),
    async importNovel(imported: ImportedNovel) {
      if (!ready || generating.current)
        throw new Error("正在生成或读取小说，请稍后再导入。");
      setError("");
      const next = createImportedNovel(room.config, imported);
      if (!(await update(next, { persistFirst: true, backupPrevious: true }))) {
        return null;
      }
      input.current = null;
      setPreview("");
      setGenerationStopped(false);
      setDraftIncomplete(false);
      setRewriteReady(false);
      return next.chapters[0].id;
    },
    generateBackground,
    compressContext,
    createFork,
    stop,
  };
}
