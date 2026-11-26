import type { RefObject } from "react";
import type { WorldRoom } from "@/lib/group-chat/model";
import type { ChapterTextRange } from "./chapter-text";
import {
  applyChapterContinuation,
  type Chapter,
  continuationIndex,
  isChapterTargetValid,
  maxChapterLength,
  type Novel,
  rememberChapterBrief,
  replaceChapter,
  rewritePrompt,
} from "./model";
import type { ChapterRun, Compression, NovelRun } from "./novel-run";
import {
  applyPlotDraft,
  type PlotDraft,
  type PlotMode,
  type PlotSelection,
  plotDraftEditableText,
  preparePlotEdit,
  replacePlotDraftText,
  splitPlotAtOffset,
} from "./plot-edit";
import type { useNovelStorage } from "./use-novel-storage";

export function createNovelChapterActions({
  room,
  storage,
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
}: {
  room: WorldRoom;
  storage: Pick<
    ReturnType<typeof useNovelStorage>,
    "latest" | "storageVersion" | "backup" | "pendingBackup" | "update"
  >;
  ready: boolean;
  generating: RefObject<boolean>;
  input: RefObject<NovelRun | null>;
  plotDraft: PlotDraft | null;
  draftIncomplete: boolean;
  start: (run: NovelRun, prompt: string) => void;
  createCompression: (novel: Novel, through: number) => Compression;
  continueChapter: (run: ChapterRun) => boolean;
  keepPlotDraft: (
    run: Extract<NovelRun, { plot: unknown }>,
    draft: PlotDraft,
    cutShort?: boolean,
  ) => void;
  setDraftIncomplete: (value: boolean) => void;
  setError: (value: string) => void;
  setPlotDraft: (value: PlotDraft | null) => void;
  setPreview: (value: string) => void;
  setRewriteReady: (value: boolean) => void;
}) {
  const { latest, storageVersion, backup, pendingBackup, update } = storage;

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
    const brief = current.chapterGoal.trim();
    const draft = {
      chapter: {
        ...rememberChapterBrief(chapter, brief),
        targetWords: current.words,
      },
      afterChapterId,
      version: room.version,
    };
    if (
      !continueChapter({
        task: "chapter",
        compression: createCompression(current, index),
        draft,
        onFirstText,
      })
    )
      return false;
    backup.start(draft);
    return true;
  }

  function startManualChapter(chapter: Chapter, afterChapterId: string | null) {
    backup.start({
      chapter,
      afterChapterId,
      version: room.version,
      manual: true,
    });
  }

  async function saveChapterContinuation(
    chapter: Chapter,
    afterChapterId: string | null | undefined,
  ) {
    const current = latest.current;
    const cached = backup.current();
    const generated =
      cached?.chapter.id === chapter.id && !cached.manual
        ? cached.chapter
        : null;
    const brief = generated ? generated.brief : chapter.brief;
    const stored = {
      ...rememberChapterBrief(chapter, brief),
      targetWords: generated?.targetWords ?? chapter.targetWords,
    };
    let next = applyChapterContinuation(current, stored, afterChapterId);
    if (!next) {
      if (!window.confirm("原续写位置已不存在。把这份草稿保存到书末？")) {
        setError("原续写位置已不存在，草稿仍在。");
        return null;
      }
      next = applyChapterContinuation(current, stored, undefined);
      if (!next) return null;
    }
    if (
      !(await update(
        brief && brief === current.chapterGoal.trim()
          ? { ...next, chapterGoal: "" }
          : next,
        { persistFirst: true },
      ))
    )
      return null;
    setDraftIncomplete(false);
    setError("");
    return next.chapters.find(({ id }) => id === chapter.id) ?? null;
  }

  function rewrite(
    chapterId: string,
    requirements: string,
    {
      range,
      compactContext = false,
    }: {
      range?: ChapterTextRange;
      compactContext?: boolean;
    } = {},
  ) {
    if (!ready || generating.current || room.status === "ended") return false;
    const current = latest.current;
    try {
      const prompt = rewritePrompt(
        room.config,
        current,
        chapterId,
        requirements,
        range,
        compactContext,
      );
      start(
        {
          task: "rewrite",
          chapterId,
          novel: current,
          version: room.version,
          range,
          requirements,
        },
        prompt,
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
      captured.chapterId !== chapter.id
    ) {
      setError("无法应用这份润色草稿。草稿仍在，可复制正文。");
      return false;
    }
    if (
      latest.current !== captured.novel ||
      room.version !== captured.version ||
      room.status === "ended"
    ) {
      setError("小说或世界设定已变更，无法应用这份润色草稿。");
      return false;
    }
    const saved = await update(replaceChapter(captured.novel, chapter), {
      persistFirst: true,
      backupPrevious: Boolean(captured.novel.checkpoint),
    });
    if (saved) discardRewrite();
    return saved;
  }

  function editPlot(
    ids: PlotSelection,
    mode: PlotMode,
    requirements: string,
    splitOffset?: number,
  ) {
    if (!ready || generating.current || room.status === "ended") return;
    const current = latest.current;
    try {
      const plot = preparePlotEdit(
        room.config,
        current,
        ids,
        mode,
        requirements,
        splitOffset !== undefined,
      );
      const run = {
        task: mode === "insert" ? "chapter" : "rewrite",
        plot,
        plotIds: ids,
        plotRequirements: requirements,
        novel: current,
        version: room.version,
        storageVersion: storageVersion.current ?? "legacy",
      } as const;
      if (splitOffset !== undefined && plot.mode === "split") {
        const draft = splitPlotAtOffset(plot, splitOffset);
        input.current = run;
        setError("");
        keepPlotDraft(run, draft);
        return;
      }
      start(run, plot.prompt);
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法生成剧情草稿。");
    }
  }

  function editPlotDraftText(index: number, text: string) {
    const run = input.current;
    if (!run || !("plot" in run) || !plotDraft || generating.current) return;
    keepPlotDraft(
      run,
      replacePlotDraftText(run.plot, plotDraft, index, text),
      draftIncomplete,
    );
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
    if (
      captured.plot.mode !== "split" &&
      (plotDraft.chapters.some(({ text }) => text.length > maxChapterLength) ||
        plotDraftEditableText(captured.plot, plotDraft).some(
          (text) => !text.trim(),
        ))
    ) {
      setError(
        `请填写有效的草稿正文，保存后每章不能超过 ${maxChapterLength} 字。`,
      );
      return null;
    }
    generating.current = true;
    try {
      const next = applyPlotDraft(captured.novel, captured.plot, plotDraft);
      if (!(await update(next, { persistFirst: true, backupPrevious: true }))) {
        return null;
      }
    } finally {
      generating.current = false;
    }
    discardRewrite();
    return plotDraft.chapters[captured.plot.mode === "split" ? 1 : 0].id;
  }

  return {
    generateChapter,
    startManualChapter,
    saveChapterContinuation,
    rewrite,
    discardRewrite,
    saveChapterRewrite,
    editPlot,
    editPlotDraftText,
    applyPlot,
  };
}
