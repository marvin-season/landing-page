"use client";

import { isDevelopment } from "@landing-page/utils";
import {
  aiSdkChatStreamAdapter,
  getChatStreamText,
  initialChatStreamState,
  reduceChatStreamState,
  useChatStreamCore,
} from "@landing-page/utils/stream";
import Dexie, { type Table } from "dexie";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { worldRequest } from "@/lib/group-chat/client";
import type { WorldConfig, WorldRoom } from "@/lib/group-chat/model";
import {
  type ChapterDraftBackup,
  createChapterDraftBackup,
} from "./chapter-draft-backup";
import type { ChapterTextRange } from "./chapter-text";
import {
  type CompressionCursor,
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
  applyChapterContinuation,
  type Chapter,
  continuationIndex,
  createBackground,
  createNovel,
  exportNovel,
  invalidateEditedCheckpoint,
  isChapterTargetValid,
  maxChapterLength,
  maxNovelPromptLength,
  maxNovelSummaryLength,
  type Novel,
  type NovelBackground,
  type NovelTask,
  type NovelWritingContext,
  novelCheckpointCount,
  novelRequest,
  rememberChapterBrief,
  renameChapter as renameStoredChapter,
  replaceChapter,
  replaceChapterText,
  rewritePrompt,
  summaryPrompt,
} from "./model";
import {
  loadServerNovel,
  restoreNovelBackup,
  type ServerNovel,
  saveNovelToServer,
  syncNovelFromServer,
} from "./novel-server-sync";
import { type NovelSyncDivergence, novelSyncStatus } from "./novel-sync";
import {
  createPendingResultBackup,
  type PendingResultBackup,
} from "./pending-result-backup";
import {
  applyPlotDraft,
  type PlotDraft,
  type PlotMode,
  type PlotSelection,
  preparePlotEdit,
  readPlotDraft,
} from "./plot-edit";
import { recordNovelPrompt } from "./prompt-history";
import {
  incompleteNovelDraftNotice,
  restorePendingResult,
} from "./restore-pending-result";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
const novels: Table<{ key: string; novel: Novel; previous?: Novel }, string> =
  db.table("novels");

type Compression = {
  novel: Novel;
  config: WorldConfig;
  through: number;
  cursor: CompressionCursor;
  budget: typeof novelRequestBudget;
  retries: number;
  options?: CompressionOptions;
};
type ChapterRun = {
  task: "chapter";
  compression: Compression;
  onFirstText?: () => void;
};
type CompressionRun = {
  task: "summary";
  compression: Compression;
  batch: NonNullable<ReturnType<typeof planCompressionBatch>>;
  continuation?: ChapterRun;
};
type NovelRun =
  | ChapterRun
  | { task: "summary"; config: WorldConfig; novel: Novel }
  | CompressionRun
  | {
      task: "rewrite" | "chapter";
      plot: ReturnType<typeof preparePlotEdit>;
      plotIds: PlotSelection;
      plotRequirements: string;
      novel: Novel;
      version: number;
    }
  | {
      task: "rewrite";
      chapterId: string;
      novel: Novel;
      version: number;
      range?: ChapterTextRange;
      draft?: Chapter;
      restoredBase?: Chapter;
    };

export function useNovel(
  room: WorldRoom,
  onBusyChange: (busy: boolean) => void,
  onBackgroundReady: (background: NovelBackground) => void,
  onDraftRestored: (draft: ChapterDraftBackup) => void,
  onPendingRestored: (pending: PendingResultBackup) => void = () => {},
) {
  const key = `${room.ownerId}:${room.id}`;
  const [novel, setNovel] = useState(() => createNovel(room.config));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [draftBackupFailed, setDraftBackupFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [task, setTask] = useState<NovelTask>("chapter");
  const [generationStopped, setGenerationStopped] = useState(false);
  const [draftIncomplete, setDraftIncomplete] = useState(false);
  const [rewriteReady, setRewriteReady] = useState(false);
  const [plotDraft, setPlotDraft] = useState<PlotDraft | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [backgroundExport, setBackgroundExport] =
    useState<NovelBackground | null>(null);
  const [syncPrompt, setSyncPrompt] = useState<NovelSyncDivergence | null>(
    null,
  );
  const [serverSynced, setServerSynced] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const input = useRef<NovelRun | null>(null);
  const state = useRef(initialChatStreamState);
  const finished = useRef(false);
  const incomplete = useRef(false);
  const generating = useRef(false);
  const continuationBrief = useRef<string | undefined>(undefined);
  const latest = useRef(novel);
  const writes = useRef(Promise.resolve());
  const previousRef = useRef<Novel | undefined>(undefined);
  const serverCopy = useRef<ServerNovel | null>(null);
  const serverSync = useRef<Promise<unknown> | null>(null);
  const backup = useMemo(
    () =>
      createChapterDraftBackup(
        key,
        () => window.localStorage,
        setDraftBackupFailed,
      ),
    [key],
  );
  const pendingBackup = useMemo(
    () =>
      createPendingResultBackup(
        key,
        () => window.localStorage,
        setDraftBackupFailed,
      ),
    [key],
  );
  const configRef = useRef(room.config);
  const roomIdRef = useRef(room.id);
  configRef.current = room.config;
  roomIdRef.current = room.id;
  const restoreEditor = useEffectEvent(onDraftRestored);
  const restorePending = useEffectEvent(onPendingRestored);
  function publishSync(novel: Novel) {
    const status = novelSyncStatus(
      novel,
      serverCopy.current,
      exportNovel(novel, "txt"),
    );
    setSyncPrompt(status.kind === "diverged" ? status.reason : null);
    setServerSynced(status.kind === "match");
    return status;
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      novels.get(key),
      isDevelopment ? loadServerNovel(roomIdRef.current) : null,
    ])
      .then(async ([saved, server]) => {
        if (!active) return;
        let novel = saved?.novel ?? createNovel(configRef.current);
        previousRef.current = saved?.previous;
        setHasLocalBackup(Boolean(saved?.previous));
        serverCopy.current = server;
        const status = novelSyncStatus(
          novel,
          server,
          exportNovel(novel, "txt"),
        );
        if (
          status.kind === "match" &&
          (novel.updatedAt !== status.updatedAt ||
            novel.syncedAt !== status.updatedAt)
        ) {
          novel = {
            ...novel,
            updatedAt: status.updatedAt,
            syncedAt: status.updatedAt,
          };
          await novels.put({
            key,
            novel,
            previous: previousRef.current,
          });
        }
        if (!active) return;
        latest.current = novel;
        setNovel(novel);
        setSyncPrompt(status.kind === "diverged" ? status.reason : null);
        setServerSynced(status.kind === "match");
        const restored = backup.read();
        let restoredEditor = false;
        if (restored) {
          const current = latest.current.chapters.find(
            ({ id }) => id === restored.chapter.id,
          );
          if (
            (restored.mode === "chapter" && current) ||
            current?.text === restored.text
          ) {
            backup.clear();
          } else {
            if (restored.mode === "rewrite") {
              input.current = {
                task: "rewrite",
                chapterId: restored.chapter.id,
                novel: latest.current,
                version: restored.version,
                restoredBase: restored.chapter,
              };
            }
            restoreEditor(restored);
            restoredEditor = true;
          }
        }
        if (!restoredEditor) {
          const pending = pendingBackup.read();
          const restoredPending = pending
            ? restorePendingResult(pending, latest.current, configRef.current)
            : null;
          if (pending && !restoredPending) pendingBackup.clear();
          if (pending && restoredPending) {
            input.current = restoredPending.run;
            setPreview(restoredPending.preview);
            setTask(restoredPending.task);
            setPlotDraft(restoredPending.plotDraft);
            setRewriteReady(true);
            setDraftIncomplete(restoredPending.incomplete);
            setError(restoredPending.notice);
            restorePending(pending);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setError("无法读取小说存档，请刷新后重试。");
      });
    return () => {
      active = false;
    };
  }, [backup, key, pendingBackup]);
  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") {
        backup.flush();
        pendingBackup.flush();
      }
    }
    function flushAll() {
      backup.flush();
      pendingBackup.flush();
    }
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flushAll();
    };
  }, [backup, pendingBackup]);

  function update(next: Novel, { persistFirst = false, touch = true } = {}) {
    next = invalidateEditedCheckpoint(latest.current, next);
    if (
      touch &&
      exportNovel(latest.current, "txt") !== exportNovel(next, "txt")
    ) {
      next = { ...next, updatedAt: Date.now() };
    }
    const previous = previousRef.current;
    function publish() {
      setBackgroundExport(null);
      latest.current = next;
      setNovel(next);
      publishSync(next);
    }
    if (!persistFirst) publish();
    setSaving(true);
    const write = writes.current.then(async () => {
      await novels.put({ key, novel: next, previous });
      if (persistFirst) publish();
      if (latest.current === next) setSaving(false);
    });
    writes.current = write.catch(() => {
      setSaving(false);
      setError("小说未能保存到本机，请先导出章节，避免刷新后丢失。");
    });
    return write.then(
      () => true,
      () => false,
    );
  }
  function updateChapterGoal(chapterGoal: string) {
    const current = latest.current;
    if (current.chapterGoal === chapterGoal) return Promise.resolve(true);
    return update({ ...current, chapterGoal });
  }
  function renameChapter(chapterId: string, title: string) {
    const next = renameStoredChapter(latest.current, chapterId, title);
    if (!next || next === latest.current) return Promise.resolve(true);
    return update(next);
  }
  function updateContext(context: NovelWritingContext) {
    const current = latest.current;
    return update({
      ...current,
      title: context.title,
      style: context.style,
      outline: context.outline,
    });
  }
  function end() {
    generating.current = false;
    setBusy(false);
    setCompressing(false);
    onBusyChange(false);
  }
  const stream = useChatStreamCore({
    adapter: aiSdkChatStreamAdapter,
    onEvent(event) {
      if (event.type === "finish") {
        incomplete.current = Boolean(
          event.finishReason && event.finishReason !== "stop",
        );
        finished.current = true;
      }
      state.current = reduceChatStreamState(state.current, event);
      const run = input.current;
      if (run && "plot" in run) return;
      if (run?.task === "summary" && "batch" in run) return;
      const text = getChatStreamText(state.current);
      if (run?.task === "chapter" || (run?.task === "rewrite" && !run.range))
        backup.write(text);
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
    },
    onComplete() {
      const text = getChatStreamText(state.current).trim();
      const captured = input.current;
      if (captured?.task === "summary" && "batch" in captured) {
        if (
          !finished.current ||
          incomplete.current ||
          !text ||
          text.length > maxNovelSummaryLength
        ) {
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
        if (continuation) {
          if (!continueChapter({ ...continuation, compression })) end();
        } else if (compression.cursor.index < compression.through) {
          if (!compress(compression)) end();
        } else {
          saveCheckpoint(compression);
          end();
        }
        return;
      }
      end();
      if (!finished.current || !text) {
        backup.flush();
        setDraftIncomplete(false);
        setError(
          "连接提前结束或没有生成内容，请重试。草稿未计入正文或导出文件。",
        );
        return;
      }
      if (!captured) return;
      const cutShort = incomplete.current;
      const cutShortNotice = incompleteNovelDraftNotice;
      if ("plot" in captured) {
        try {
          const draft = readPlotDraft(captured.plot, text);
          setPlotDraft(draft);
          pendingBackup.write({
            kind: "plot",
            mode: captured.plot.mode,
            ids: [...captured.plotIds],
            requirements: captured.plotRequirements,
            draft,
            version: captured.version,
            incomplete: cutShort || undefined,
          });
        } catch (error) {
          setDraftIncomplete(false);
          setError(
            error instanceof Error ? error.message : "无法读取剧情草稿。",
          );
          return;
        }
        setDraftIncomplete(cutShort);
        setError(cutShort ? cutShortNotice : "");
        setRewriteReady(true);
        return;
      }
      if (captured.task === "rewrite" && captured.range) {
        const chapter =
          captured.draft ??
          captured.novel.chapters.find(({ id }) => id === captured.chapterId);
        if (chapter) {
          pendingBackup.write({
            kind: "selection",
            chapterId: captured.chapterId,
            chapterTitle: chapter.title,
            range: captured.range,
            baseText: chapter.text,
            preview: text,
            version: captured.version,
            incomplete: cutShort || undefined,
          });
        }
        setPreview(text);
        setDraftIncomplete(cutShort);
        setError(cutShort ? cutShortNotice : "");
        setRewriteReady(true);
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
        try {
          const background = createBackground(
            captured.config,
            captured.novel,
            text,
          );
          setBackgroundExport(background);
          setPreview("");
          onBackgroundReady(background);
        } catch {
          setError(
            "总结导出失败；若总结过长请缩减后重试，若下载失败可点击再次导出。",
          );
        }
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
      backup.write(text);
      backup.flush();
      setPreview(text);
    },
    onError(message) {
      const run = input.current;
      if (
        run &&
        !("plot" in run) &&
        "compression" in run &&
        isNovelRequestTooLarge(message)
      ) {
        const current = run.compression;
        const noChapterText = !getChatStreamText(state.current).trim();
        if (current.retries < 4 && (run.task === "summary" || noChapterText)) {
          const prompt =
            run.task === "summary"
              ? run.batch.prompt
              : continuationPrompt(current);
          const next = {
            ...current,
            retries: current.retries + 1,
            budget: smallerNovelBudget(
              room.id,
              prompt,
              run.task,
              current.budget,
            ),
          };
          if (compress(next, run.task === "chapter" ? run : run.continuation))
            return;
          end();
          return;
        }
      }
      backup.flush();
      end();
      setDraftIncomplete(false);
      setError(message);
    },
  });

  function start(run: NovelRun, prompt: string): void {
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
    finished.current = false;
    incomplete.current = false;
    state.current = initialChatStreamState;
    setPreview("");
    generating.current = true;
    setBusy(true);
    onBusyChange(true);
    stream.send({
      url: "/api/novel",
      body: novelRequest(room.id, prompt, run.task),
    });
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
    start({ task: "summary", compression, batch, continuation }, batch.prompt);
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

  function generateChapter(
    chapter: Chapter,
    afterChapterId: string | null | undefined,
    onFirstText?: () => void,
  ) {
    if (!ready || generating.current || room.status === "ended") return false;
    setError("");
    const current = latest.current;
    if (!current.title.trim() || !isChapterTargetValid(current.words))
      return false;
    const index = continuationIndex(current, afterChapterId);
    if (index === null) {
      setError("找不到续写起点，请返回阅读页重新选择章节。");
      return false;
    }
    if (
      !continueChapter({
        task: "chapter",
        compression: createCompression(current, index),
        onFirstText,
      })
    )
      return false;
    const brief = current.chapterGoal.trim();
    continuationBrief.current = brief;
    pendingBackup.clear();
    backup.start({
      mode: "chapter",
      chapter: rememberChapterBrief(chapter, brief),
      afterChapterId,
      version: room.version,
    });
    void recordNovelPrompt(key, "chapter", current.chapterGoal);
    return true;
  }

  async function saveChapterContinuation(
    chapter: Chapter,
    afterChapterId: string | null | undefined,
  ) {
    const brief =
      continuationBrief.current !== undefined
        ? continuationBrief.current
        : chapter.brief;
    const stored = rememberChapterBrief(chapter, brief);
    const next = applyChapterContinuation(
      latest.current,
      stored,
      afterChapterId,
    );
    if (!next) {
      setError("找不到续写起点，无法保存到原位置。");
      return null;
    }
    if (!(await update(next, { persistFirst: true }))) return null;
    continuationBrief.current = undefined;
    setDraftIncomplete(false);
    setError("");
    return next.chapters.find(({ id }) => id === chapter.id) ?? null;
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
    if (prompt.length > maxNovelPromptLength) {
      setError(
        "小说已超出本次完整上下文容量，请导出当前卷并在新世界继续创作。",
      );
      return;
    }
    start({ task: "summary", config: room.config, novel: current }, prompt);
  }

  function compressContext(options: CompressionOptions) {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    if (!current.chapters.length) return;
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
        await novels.add({
          key: `${created.ownerId}:${created.id}`,
          novel: current,
        });
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

  function rewrite(
    chapterId: string,
    requirements: string,
    {
      range,
      compactContext = false,
      draft,
    }: {
      range?: ChapterTextRange;
      compactContext?: boolean;
      draft?: Chapter;
    } = {},
  ) {
    if (!ready || generating.current || room.status === "ended") return false;
    const current = latest.current;
    try {
      const prompt = rewritePrompt(
        room.config,
        draft ? replaceChapter(current, draft) : current,
        chapterId,
        requirements,
        range,
        compactContext,
      );
      if (!range) {
        const chapter = current.chapters.find(({ id }) => id === chapterId);
        if (!chapter) return false;
        pendingBackup.clear();
        backup.start({
          mode: "rewrite",
          chapter,
          version: room.version,
          requirements,
          compactContext,
        });
      } else {
        backup.clear();
      }
      start(
        {
          task: "rewrite",
          chapterId,
          novel: current,
          version: room.version,
          range,
          draft,
        },
        prompt,
      );
      void recordNovelPrompt(
        key,
        range ? "selection" : "rewrite",
        requirements,
      );
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法生成重写草稿。");
      return false;
    }
  }

  function discardRewrite() {
    if (generating.current) return;
    const captured = input.current;
    if (captured && (captured.task === "rewrite" || "plot" in captured)) {
      input.current = null;
      setPreview("");
      setRewriteReady(false);
      setPlotDraft(null);
      pendingBackup.clear();
    }
    setDraftIncomplete(false);
    setError("");
  }

  function resolveRewrite(draft?: Chapter) {
    const captured = input.current;
    if (
      generating.current ||
      !rewriteReady ||
      captured?.task !== "rewrite" ||
      "plot" in captured
    )
      return null;
    if (
      latest.current !== captured.novel ||
      captured.draft !== draft ||
      room.version !== captured.version ||
      room.status === "ended"
    ) {
      setError("小说或世界设定已变更，请重新生成重写草稿。");
      return null;
    }
    const next = replaceChapterText(
      draft ? replaceChapter(captured.novel, draft) : captured.novel,
      captured.chapterId,
      preview,
      captured.range,
    );
    const chapter = next.chapters.find(({ id }) => id === captured.chapterId);
    if (!chapter || chapter.text.length > maxChapterLength) {
      setError(
        `应用后本章会超过 ${maxChapterLength} 字，请缩短润色内容后重试。`,
      );
      return null;
    }
    discardRewrite();
    return next;
  }

  async function saveChapterRewrite(chapter: Chapter) {
    const captured = input.current;
    if (
      generating.current ||
      !chapter.text.trim() ||
      chapter.text.length > maxChapterLength
    )
      return false;
    if (
      captured?.task !== "rewrite" ||
      "plot" in captured ||
      captured.range ||
      captured.chapterId !== chapter.id
    ) {
      setError("无法应用这份润色草稿。草稿仍在，可复制正文或重新生成。");
      return false;
    }
    if (
      latest.current !== captured.novel ||
      room.version !== captured.version ||
      room.status === "ended" ||
      (captured.restoredBase &&
        !latest.current.chapters.some(
          ({ id, text, title }) =>
            id === captured.restoredBase?.id &&
            text === captured.restoredBase.text &&
            title === captured.restoredBase.title,
        ))
    ) {
      setError("小说或世界设定已变更，请重新生成重写草稿。");
      return false;
    }
    const saved = await update(replaceChapter(captured.novel, chapter), {
      persistFirst: true,
    });
    if (saved) discardRewrite();
    return saved;
  }

  function applyDraftRewrite(draft: Chapter) {
    return resolveRewrite(draft)?.chapters.find(({ id }) => id === draft.id);
  }

  function editPlot(ids: PlotSelection, mode: PlotMode, requirements: string) {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    try {
      const plot = preparePlotEdit(
        room.config,
        current,
        ids,
        mode,
        requirements,
      );
      start(
        {
          task: mode === "insert" ? "chapter" : "rewrite",
          plot,
          plotIds: ids,
          plotRequirements: requirements,
          novel: current,
          version: room.version,
        },
        plot.prompt,
      );
      void recordNovelPrompt(key, mode, requirements);
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法生成剧情草稿。");
    }
  }

  async function applyPlot() {
    const captured = input.current;
    if (generating.current || !plotDraft || !captured || !("plot" in captured))
      return null;
    if (
      latest.current !== captured.novel ||
      captured.version !== room.version ||
      room.status === "ended"
    ) {
      setError("小说或世界设定已变更，请重新生成剧情草稿。");
      return null;
    }
    generating.current = true;
    try {
      const next = applyPlotDraft(captured.novel, captured.plot, plotDraft);
      if (!(await update(next, { persistFirst: true }))) {
        setError("保存失败，原章节仍保留。请重试。");
        return null;
      }
    } finally {
      generating.current = false;
    }
    discardRewrite();
    return plotDraft.chapters[0].id;
  }

  const syncHost = {
    busy: () => !ready || generating.current,
    lock: serverSync,
    novel: () => latest.current,
    roomId: () => roomIdRef.current,
    server: serverCopy,
    previous: previousRef,
    rememberBackup(backupNovel: Novel | undefined) {
      previousRef.current = backupNovel;
      setHasLocalBackup(Boolean(backupNovel));
    },
    publish: publishSync,
    update,
    clearDraft: () => backup.clear(),
  };

  return {
    novel,
    update,
    updateChapterGoal,
    renameChapter,
    updateContext,
    ready,
    error,
    syncPrompt,
    serverSynced,
    hasLocalBackup,
    saveToServer: () => saveNovelToServer(syncHost),
    syncFromServer: () => syncNovelFromServer(syncHost),
    restoreLocalBackup: () => restoreNovelBackup(syncHost),
    draftBackupFailed,
    backupDraftText: backup.write,
    clearDraftBackup: backup.clear,
    saving,
    busy,
    compressing,
    preview,
    task,
    generationStopped,
    draftIncomplete,
    rewriteReady,
    plotDraft,
    editPlot,
    applyPlot,
    backgroundExport,
    async importNovel(imported: ImportedNovel) {
      if (!ready || generating.current)
        throw new Error("正在生成或读取小说，请稍后再导入。");
      setError("");
      const next = createImportedNovel(room.config, imported);
      if (!(await update(next, { persistFirst: true }))) {
        setError("导入未能保存，原小说已保留。请检查浏览器存储空间后重试。");
        return null;
      }
      input.current = null;
      setPreview("");
      setGenerationStopped(false);
      setDraftIncomplete(false);
      setRewriteReady(false);
      return next.chapters[0].id;
    },
    generateChapter,
    saveChapterContinuation,
    generateBackground,
    compressContext,
    createFork,
    rewrite,
    discardRewrite,
    saveChapterRewrite,
    applyDraftRewrite,
    stop() {
      stream.stop();
      backup.flush();
      end();
      const run = input.current;
      if (run?.task === "summary" && "batch" in run) {
        setError("已停止压缩上下文，原正文和摘要已保留。");
        return;
      }
      if (
        run &&
        !("plot" in run) &&
        (run.task === "chapter" || (run.task === "rewrite" && !run.range))
      ) {
        setGenerationStopped(true);
      } else {
        setError("已停止，本次草稿未计入正文或导出文件，可以重新生成。");
      }
    },
  };
}
