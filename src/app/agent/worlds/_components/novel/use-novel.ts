"use client";

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
  forkFitsBudget,
  forkSummaryPrompt,
  prepareNovelFork,
} from "./fork-model";
import { createImportedNovel, type ImportedNovel } from "./import-novel";
import {
  type Chapter,
  chapterPrompt,
  createBackground,
  createNovel,
  invalidateEditedCheckpoint,
  isChapterTargetValid,
  maxChapterLength,
  maxNovelPromptLength,
  maxNovelSummaryLength,
  type Novel,
  type NovelBackground,
  type NovelTask,
  type NovelWritingContext,
  novelRequest,
  replaceChapter,
  replaceChapterText,
  rewritePrompt,
  summaryPrompt,
} from "./model";
import {
  applyPlotDraft,
  type ChapterPair,
  type PlotDraft,
  type PlotMode,
  preparePlotEdit,
  readPlotDraft,
} from "./plot-edit";
import { recordNovelPrompt } from "./prompt-history";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
const novels: Table<{ key: string; novel: Novel }, string> = db.table("novels");

type NovelRun =
  | { task: "chapter"; onFirstText?: () => void }
  | { task: "summary"; config: WorldConfig; novel: Novel }
  | { task: "summary"; forFork: true }
  | {
      task: "rewrite" | "chapter";
      plot: ReturnType<typeof preparePlotEdit>;
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
  const [rewriteReady, setRewriteReady] = useState(false);
  const [plotDraft, setPlotDraft] = useState<PlotDraft | null>(null);
  const [forkSummary, setForkSummary] = useState("");
  const [backgroundExport, setBackgroundExport] =
    useState<NovelBackground | null>(null);
  const input = useRef<NovelRun | null>(null);
  const state = useRef(initialChatStreamState);
  const finished = useRef(false);
  const generating = useRef(false);
  const latest = useRef(novel);
  const writes = useRef(Promise.resolve());
  const backup = useMemo(
    () =>
      createChapterDraftBackup(
        key,
        () => window.localStorage,
        setDraftBackupFailed,
      ),
    [key],
  );
  const restoreEditor = useEffectEvent(onDraftRestored);
  useEffect(() => {
    let active = true;
    novels
      .get(key)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          latest.current = saved.novel;
          setNovel(saved.novel);
        }
        const restored = backup.read();
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
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (active)
          setError("无法读取本机小说存档，请检查浏览器存储权限后刷新。");
      });
    return () => {
      active = false;
    };
  }, [backup, key]);
  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") backup.flush();
    }
    window.addEventListener("pagehide", backup.flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", backup.flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      backup.flush();
    };
  }, [backup]);

  function update(next: Novel, { persistFirst = false } = {}) {
    next = invalidateEditedCheckpoint(latest.current, next);
    function publish() {
      setBackgroundExport(null);
      latest.current = next;
      setNovel(next);
    }
    if (!persistFirst) publish();
    setSaving(true);
    const write = writes.current.then(async () => {
      await novels.put({ key, novel: next });
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
    onBusyChange(false);
  }
  const stream = useChatStreamCore({
    adapter: aiSdkChatStreamAdapter,
    onEvent(event) {
      if (event.type === "finish") {
        if (event.finishReason && event.finishReason !== "stop")
          throw new Error(
            "本次输出未完整生成，请缩减内容后重试。草稿未计入正文或导出文件。",
          );
        finished.current = true;
      }
      state.current = reduceChatStreamState(state.current, event);
      const run = input.current;
      if (run && "plot" in run) return;
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
      end();
      const text = getChatStreamText(state.current).trim();
      if (!finished.current || !text) {
        backup.flush();
        setError(
          "连接提前结束或没有生成内容，请重试。草稿未计入正文或导出文件。",
        );
        return;
      }
      const captured = input.current;
      if (!captured) return;
      if ("plot" in captured) {
        try {
          setPlotDraft(readPlotDraft(captured.plot, text));
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "无法读取剧情草稿。",
          );
          return;
        }
        setRewriteReady(true);
        return;
      }
      if (captured.task === "rewrite" && captured.range) {
        setPreview(text);
        setRewriteReady(true);
        return;
      }
      if (captured.task === "summary") {
        if ("forFork" in captured) {
          if (text.length > maxNovelSummaryLength) {
            setError("摘要超过长度上限，请重新生成或手动输入较短的摘要。");
          } else {
            setForkSummary(text);
          }
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
      if (text.length > maxChapterLength) {
        setError(`草稿超过 ${maxChapterLength} 字，请缩短后保存。`);
      }
      backup.write(text);
      backup.flush();
      setPreview(text);
    },
    onError(message) {
      backup.flush();
      end();
      setError(message);
    },
  });

  function start(run: NovelRun, prompt: string) {
    input.current = run;
    setError("");
    setTask(run.task);
    setGenerationStopped(false);
    if (!("plot" in run) && run.task !== "rewrite") setBackgroundExport(null);
    setRewriteReady(false);
    setPlotDraft(null);
    finished.current = false;
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

  function generateChapter(chapter: Chapter, onFirstText?: () => void) {
    if (!ready || generating.current || room.status === "ended") return false;
    setError("");
    const current = latest.current;
    if (!current.title.trim() || !isChapterTargetValid(current.words))
      return false;
    const prompt = chapterPrompt(room.config, current);
    if (prompt.length > maxNovelPromptLength) {
      setError(
        "小说已超出本次完整上下文容量，请导出当前卷并在新世界继续创作。",
      );
      return false;
    }
    backup.start({ mode: "chapter", chapter, version: room.version });
    start({ task: "chapter", onFirstText }, prompt);
    void recordNovelPrompt(key, "chapter", current.chapterGoal);
    return true;
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

  function summarizeFork() {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    if (!current.chapters.length) return;
    const prompt = forkSummaryPrompt(room.config, current);
    if (prompt.length > maxNovelPromptLength) {
      setError("自动总结的请求已超限，可手动填写剧情摘要。");
      return;
    }
    setForkSummary("");
    start({ task: "summary", forFork: true }, prompt);
  }

  function clearFork() {
    if (generating.current) return;
    setForkSummary("");
    setError("");
    if (input.current?.task === "summary" && "forFork" in input.current) {
      input.current = null;
      setPreview("");
    }
  }

  async function createFork(summary: string) {
    if (!ready || generating.current)
      throw new Error("当前暂不可创建续写分支。");
    const current = latest.current;
    const fork = prepareNovelFork(room.config, current, summary);
    if (
      !fork ||
      !forkFitsBudget(fork.length, chapterPrompt(room.config, current).length)
    )
      throw new Error("续写上下文仍然超限或没有缩短，请精简摘要。");
    generating.current = true;
    onBusyChange(true);
    try {
      const { room: created } = await worldRequest<{ room: WorldRoom }>(
        "rooms",
        "POST",
        { ...fork.config, kind: "novel" },
      );
      try {
        await novels.add({
          key: `${created.ownerId}:${created.id}`,
          novel: fork.novel,
        });
      } catch {
        try {
          await worldRequest(`rooms/${created.id}`, "DELETE");
        } catch {
          throw new Error(
            "本地小说写入失败，新建的空分支未能清理；原小说未改动。",
          );
        }
        throw new Error("无法保存小说分支，请检查浏览器存储空间。");
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
        backup.start({
          mode: "rewrite",
          chapter,
          version: room.version,
          requirements,
          compactContext,
        });
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
    }
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

  function editPlot(ids: ChapterPair, mode: PlotMode, requirements: string) {
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

  return {
    novel,
    update,
    updateContext,
    ready,
    error,
    draftBackupFailed,
    backupDraftText: backup.write,
    clearDraftBackup: backup.clear,
    saving,
    busy,
    preview,
    task,
    generationStopped,
    rewriteReady,
    plotDraft,
    editPlot,
    applyPlot,
    forkSummary,
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
      setRewriteReady(false);
      setForkSummary("");
      return next.chapters[0].id;
    },
    generateChapter,
    generateBackground,
    summarizeFork,
    clearFork,
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
