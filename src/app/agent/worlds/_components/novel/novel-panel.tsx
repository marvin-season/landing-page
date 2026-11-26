"use client";

import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import {
  ChevronLeft,
  ChevronRight,
  Combine,
  Ellipsis,
  LoaderCircle,
  PenLine,
  Square,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useUnsavedNavigation } from "@/app/agent/_components/use-unsaved-navigation";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import { ComposerDock, FloatingComposer } from "../floating-composer";
import {
  downloadBackground,
  NovelBackgroundPreview,
  NovelBackgroundSummaryStatus,
  NovelFileControls,
} from "./background-controls";
import type { ChapterDraftBackup } from "./chapter-draft-backup";
import { ChapterEditor } from "./chapter-editor";
import { observeChapterEditorDrafts } from "./chapter-editor-drafts";
import {
  ChapterGenerationForm,
  type ChapterGenerationOptions,
  EmptyNovelContinuation,
} from "./chapter-generation-form";
import { ChapterIndex, type ChapterIndexEntry } from "./chapter-index";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import { ChapterReading } from "./chapter-rewrite";
import { type ChapterTextRange, replaceTextRange } from "./chapter-text";
import { ContextControls } from "./context-controls";
import {
  type Chapter,
  chapterLengthShortfall,
  chapterTitle,
  continuationIndex,
  exportNovel,
  formatChapterLength,
  type NovelWritingContext,
  removeChapter,
  replaceChapter,
} from "./model";
import { NewChapterDraftActions } from "./new-chapter-draft-actions";
import {
  localActionHint,
  NovelActionButton,
  NovelActionTooltip,
  nextChapterActionHint,
  stopGenerationHint,
} from "./novel-action-tooltip";
import type { PlotMode, PlotSelection } from "./plot-edit";
import { PlotSheet } from "./plot-sheet";
import { readReadingChapterId, writeReadingChapterId } from "./reading-chapter";
import { useChapterNavigation } from "./use-chapter-navigation";
import { useNovel } from "./use-novel";

export type NovelContextBridge = {
  settled: boolean;
  context: NovelWritingContext | null;
  save: (context: NovelWritingContext) => Promise<boolean>;
};

export function NovelPanel({
  room,
  fileToolbar,
  onBusyChange,
  onEditingChange,
  onScrollTopChange,
  onContext,
  onChapterStatus,
}: {
  room: WorldRoom;
  fileToolbar: HTMLElement | null;
  onBusyChange: (busy: boolean) => void;
  onEditingChange: (editing: boolean) => void;
  onScrollTopChange: (scrollTop: number) => void;
  onContext?: (value: NovelContextBridge | null) => void;
  onChapterStatus?: (status: { count: number; saving: boolean }) => void;
}) {
  const roomKey = `${room.ownerId}:${room.id}`;
  const [selected, setSelected] = useState<string | null>(null);
  useLayoutEffect(() => {
    setSelected(readReadingChapterId(roomKey));
  }, [roomKey]);
  const [importing, setImporting] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{
    chapter: Chapter;
    mode: "manual" | "chapter" | "rewrite";
    initialText?: string;
    afterChapterId?: string | null;
    rewriteRange?: ChapterTextRange;
    manualNext?: boolean;
  } | null>(null);
  const [newChapterDraft, setNewChapterDraft] =
    useState<ChapterDraftBackup | null>(null);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const [plotRestore, setPlotRestore] = useState<{
    mode: PlotMode;
    ids: PlotSelection;
    requirements: string;
  } | null>(null);
  const isEditing = editingChapter !== null;
  const [draftTexts, setDraftTexts] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  useEffect(() => {
    if (isEditing) return;
    const subscription = observeChapterEditorDrafts(roomKey).subscribe({
      next: setDraftTexts,
      error: () => setDraftTexts(new Map()),
    });
    return () => subscription.unsubscribe();
  }, [isEditing, roomKey]);
  useLayoutEffect(() => {
    onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);
  const [thinkingChapter, setThinkingChapter] = useState<Chapter | null>(null);
  const [rewriteRequirements, setRewriteRequirements] = useState("");
  const [compactContext, setCompactContext] = useState(false);
  const readingPanel = useRef<HTMLDivElement>(null);
  const chapterGoalInput = useRef<HTMLTextAreaElement>(null);
  const readingScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    const panel = readingPanel.current;
    if (editingChapter || thinkingChapter || !panel) return;
    if (readingScroll.current !== null) {
      panel.scrollTop = readingScroll.current;
      readingScroll.current = null;
    }
    onScrollTopChange(panel.scrollTop);
  }, [editingChapter, thinkingChapter, onScrollTopChange]);
  const [plotOpen, setPlotOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const fileMenuTrigger = useRef<HTMLButtonElement>(null);
  const [composerRequest, setComposerRequest] = useState(0);
  const [polishComposerRequest, setPolishComposerRequest] = useState(0);
  const writer = useNovel(
    room,
    (busy) => {
      if (!busy) setThinkingChapter(null);
      onBusyChange(busy);
    },
    downloadBackground,
    (restored) => {
      setNewChapterDraft(restored);
      setSelected(restored.chapter.id);
    },
    (pending) => {
      if (pending.kind === "selection") {
        setSelected(pending.chapterId);
        setEditingChapter({
          chapter: {
            id: pending.chapterId,
            title: pending.chapterTitle,
            text: pending.baseText,
          },
          mode: "rewrite",
          rewriteRange: pending.range,
          initialText: replaceTextRange(
            pending.baseText,
            pending.preview,
            pending.range,
          ),
        });
        return;
      }
      setPlotRestore({
        mode: pending.mode,
        ids: pending.ids,
        requirements: pending.requirements,
      });
      setPlotOpen(true);
    },
  );
  const { novel } = writer;
  useEffect(() => {
    onChapterStatus?.({
      count: novel.chapters.length,
      saving: writer.saving,
    });
  }, [novel.chapters.length, onChapterStatus, writer.saving]);
  const publishContext = useRef(onContext);
  const saveContext = useRef(writer.updateContext);
  publishContext.current = onContext;
  saveContext.current = writer.updateContext;
  useEffect(() => {
    if (!writer.ready && !writer.error) return;
    publishContext.current?.({
      settled: true,
      context: writer.ready
        ? {
            title: novel.title,
            style: novel.style,
            outline: novel.outline,
          }
        : null,
      save: (next) => saveContext.current(next),
    });
  }, [novel.outline, novel.style, novel.title, writer.error, writer.ready]);
  const [appliedRewrite, setAppliedRewrite] = useState<{
    chapterId: string;
    length: number;
  }>();
  const streamingRewrite =
    (plotOpen || writer.task === "rewrite") && writer.busy;
  const waitingForText = Boolean(thinkingChapter);
  useUnsavedNavigation(
    !isEditing && (waitingForText || streamingRewrite || writer.rewriteReady),
    waitingForText || streamingRewrite
      ? "草稿正在生成，离开会中断本次生成。确定离开吗？"
      : "草稿尚未应用，离开会丢失草稿。确定离开吗？",
  );
  const chapterMenuTrigger = useRef<HTMLButtonElement>(null);
  const openPlotAfterMenuClose = useRef(false);
  const selectedIndex = novel.chapters.findIndex(
    (item) => item.id === selected,
  );
  const chapterIndex =
    selectedIndex < 0 ? novel.chapters.length - 1 : selectedIndex;
  const chapter = novel.chapters[chapterIndex];
  const chapterSwitchLocked = waitingForText || importing;
  function hasDraft(chapter: Chapter) {
    const text = draftTexts.get(chapter.id);
    return text !== undefined && text !== chapter.text;
  }
  const chapterEntries: ChapterIndexEntry[] = novel.chapters.map((item) => ({
    id: item.id,
    title: item.title,
    hasDraft: hasDraft(item),
  }));
  if (newChapterDraft) {
    const index =
      continuationIndex(novel, newChapterDraft.afterChapterId) ??
      novel.chapters.length;
    chapterEntries.splice(index, 0, {
      id: newChapterDraft.chapter.id,
      title: newChapterDraft.chapter.title,
      hasDraft: true,
    });
  }
  if (thinkingChapter) {
    chapterEntries.push({
      id: thinkingChapter.id,
      title: thinkingChapter.title,
      pending: true,
    });
  }
  const showingNewDraft = newChapterDraft?.chapter.id === selected;
  const readingChapterId = showingNewDraft ? selected : chapter?.id;
  const readingIndex = chapterEntries.findIndex(
    ({ id }) => id === readingChapterId,
  );
  const previousChapter = chapterEntries[readingIndex - 1];
  const nextChapter = chapterEntries[readingIndex + 1];
  const selectChapter = useCallback((id: string) => {
    setAppliedRewrite(undefined);
    setSelected(id);
  }, []);
  useEffect(() => {
    if (!selected || !novel.chapters.some((item) => item.id === selected))
      return;
    writeReadingChapterId(roomKey, selected);
  }, [novel.chapters, roomKey, selected]);
  const { chapterAnchor, goToChapter } = useChapterNavigation({
    readingPanel,
    chapterId: readingChapterId ?? undefined,
    previousId: previousChapter?.id,
    nextId: nextChapter?.id,
    keyboardDisabled: isEditing || chapterSwitchLocked,
    onSelect: selectChapter,
  });
  const continuationHint = chapter
    ? `续写位置：「${chapter.title || chapterTitle(chapterIndex)}」之后，生成${chapterTitle(chapterIndex + 1)}。${chapterIndex < novel.chapters.length - 1 ? "会插入新章，参考前文及紧接着一章的开头。" : "参考范围：当前章及之前。"}`
    : "续写位置：第1章。参考范围：世界和小说设定。";
  const hasPlotPair = novel.chapters.some(({ text }, index) =>
    Boolean(text.trim() && novel.chapters[index + 1]?.text.trim()),
  );
  const disabled = !writer.ready || writer.busy || importing;
  const ended = room.status === "ended";
  const chapterActionsLocked = disabled || writer.saving;
  const newChapterLocked = chapterActionsLocked || Boolean(newChapterDraft);
  const summarizing = writer.task === "summary" && !writer.compressing;
  function reuseChapterGoal(text: string) {
    if (newChapterLocked || ended) return false;
    void writer.updateChapterGoal(text);
    setComposerRequest((count) => count + 1);
    return true;
  }
  useRegisterPromptReuse(isEditing ? null : reuseChapterGoal);
  const generationOptions = {
    chapterGoal: novel.chapterGoal,
    words: novel.words,
  };
  function updateGenerationOptions(options: ChapterGenerationOptions) {
    writer.update({ ...novel, ...options });
  }
  function generateNextChapter() {
    if (newChapterLocked) return;
    const afterChapterId = chapter?.id ?? null;
    const next: Chapter = {
      id: crypto.randomUUID(),
      title: chapterTitle(chapterIndex + 1),
      text: "",
    };
    if (
      !writer.generateChapter(next, afterChapterId, () => {
        setThinkingChapter(null);
        setEditingChapter({ chapter: next, mode: "chapter", afterChapterId });
      })
    )
      return;
    readingScroll.current = readingPanel.current?.scrollTop ?? 0;
    setThinkingChapter(next);
  }
  function startNextChapterManually() {
    if (newChapterLocked) return;
    const afterChapterId = chapter?.id ?? null;
    const next: Chapter = {
      id: crypto.randomUUID(),
      title: chapterTitle(chapterIndex + 1),
      text: "",
    };
    readingScroll.current = readingPanel.current?.scrollTop ?? 0;
    writer.discardRewrite();
    writer.startManualChapter(next, afterChapterId);
    setEditingChapter({
      chapter: next,
      mode: "chapter",
      afterChapterId,
      manualNext: true,
    });
  }
  function resumeNewChapterDraft() {
    if (!newChapterDraft || chapterActionsLocked || discardingDraft) return;
    readingScroll.current = readingPanel.current?.scrollTop ?? 0;
    writer.discardRewrite();
    setEditingChapter({
      chapter: newChapterDraft.chapter,
      mode: "chapter",
      initialText: newChapterDraft.text,
      afterChapterId: newChapterDraft.afterChapterId,
      manualNext: newChapterDraft.manual,
    });
  }
  async function discardNewChapterDraft() {
    if (!newChapterDraft || chapterActionsLocked || discardingDraft) return;
    if (!window.confirm("确定丢弃这份新章草稿吗？")) return;
    setDiscardingDraft(true);
    try {
      if (!(await writer.clearDraftBackup())) return;
      setNewChapterDraft(null);
      setSelected(newChapterDraft.afterChapterId ?? null);
    } finally {
      setDiscardingDraft(false);
    }
  }
  function beginChapterRewrite(chapterId: string, range?: ChapterTextRange) {
    if (
      !writer.rewrite(chapterId, rewriteRequirements, {
        compactContext,
        range,
      })
    )
      return false;
    setEditingChapter((current) =>
      current ? { ...current, mode: "rewrite", rewriteRange: range } : current,
    );
    return true;
  }
  async function deleteChapter() {
    if (chapterActionsLocked || !chapter) return;
    if (
      !window.confirm(
        `删除“${chapter.title}”？删除前的正文可从「文件 → 恢复本地备份」找回。`,
      )
    )
      return;
    const index = novel.chapters.findIndex((item) => item.id === chapter.id);
    const next = removeChapter(novel, chapter.id);
    if (await writer.update(next, { persistFirst: true, backupPrevious: true }))
      setSelected(next.chapters[Math.max(0, index - 1)]?.id ?? null);
  }
  function download(format: "txt" | "md") {
    downloadText(
      `${novel.title.replace(/[\\/:*?"<>|]/g, "_") || "小说"}.${format}`,
      exportNovel(novel, format),
      format === "md"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
    );
  }
  function downloadDrafts() {
    const drafts = Array.from(draftTexts, ([id, text]) => ({
      title: novel.chapters.find((item) => item.id === id)?.title ?? `原章节 ${id}`,
      text,
    }));
    drafts.push(...(writer.conflictedPlot ?? []));
    if (newChapterDraft) drafts.push({
      title: newChapterDraft.chapter.title,
      text: newChapterDraft.text,
    });
    downloadText(
      `${novel.title.replace(/[\\/:*?"<>|]/g, "_")}-待确认草稿.txt`,
      drafts.map(({ title, text }) => `${title}\n\n${text}`).join("\n\n"),
      "text/plain;charset=utf-8",
    );
  }
  async function saveToServer() {
    if (
      !window.confirm(
        "用本地正文覆盖服务器文件。服务器上现在的正文会保留为唯一备份，更早的备份会被删除。",
      )
    )
      return null;
    const path = await writer.saveToServer();
    return `已写入 ${path}`;
  }
  async function syncFromServer() {
    if (newChapterDraft) throw new Error("请先保存草稿。");
    if (
      !window.confirm(
        "用服务器正文覆盖本地书名和章节。现在的本地正文会保留为唯一备份，更早的本地备份会被替换。文风和大纲会保留。",
      )
    )
      return null;
    await writer.syncFromServer();
    return "已从服务器同步到本地。上一份本地正文留在备份里。";
  }
  async function restoreLocalBackup() {
    if (newChapterDraft) throw new Error("请先保存草稿。");
    if (!window.confirm("恢复上一份本地备份。现在的本地正文会保留为唯一备份。"))
      return null;
    await writer.restoreLocalBackup();
    return "已恢复本地备份。";
  }
  if (editingChapter) {
    const {
      chapter: base,
      mode,
      initialText,
      afterChapterId,
      rewriteRange,
      manualNext,
    } = editingChapter;
    return (
      <ChapterEditor
        key={JSON.stringify([roomKey, base.id])}
        roomKey={roomKey}
        base={base}
        chapters={novel.chapters}
        initialText={initialText}
        generation={
          mode === "chapter" && !manualNext
            ? {
                kind: mode,
                onGenerate: () => writer.generateChapter(base, afterChapterId),
                renderForm: (props) => (
                  <ChapterGenerationForm
                    {...props}
                    options={generationOptions}
                    submitLabel="重新生成"
                    onChange={updateGenerationOptions}
                  />
                ),
              }
            : mode === "rewrite"
              ? {
                  kind: mode,
                  range: rewriteRange,
                }
              : undefined
        }
        writer={writer}
        ended={ended}
        compactContext={compactContext}
        onCompactContextChange={setCompactContext}
        onSave={async (draft) => {
          if (mode === "chapter") {
            const saved = await writer.saveChapterContinuation(
              draft,
              afterChapterId,
            );
            if (!saved) return false;
            await writer.clearDraftBackup();
            setNewChapterDraft(null);
            setEditingChapter({ chapter: saved, mode: "manual" });
            setSelected(saved.id);
            return true;
          }
          const saved =
            mode === "rewrite"
              ? await writer.saveChapterRewrite(draft)
              : await writer.update(replaceChapter(novel, draft), {
                  persistFirst: true,
                });
          if (saved) {
            setEditingChapter({ chapter: draft, mode: "manual" });
            if (mode === "rewrite" && !rewriteRange)
              setAppliedRewrite({
                chapterId: draft.id,
                length: draft.text.length,
              });
          }
          return saved;
        }}
        onSelectChapter={(id) => {
          const next = novel.chapters.find((item) => item.id === id);
          if (!next) return;
          writer.discardRewrite();
          setSelected(id);
          setEditingChapter({ chapter: next, mode: "manual" });
        }}
        onExit={async () => {
          if (mode === "chapter") {
            const pending = await writer.checkpointDraftBackup();
            if (pending === undefined) return;
            setNewChapterDraft(pending);
            setSelected(pending?.chapter.id ?? afterChapterId ?? null);
          }
          writer.discardRewrite();
          setPolishComposerRequest(0);
          setEditingChapter(null);
        }}
        rewriteRequirements={rewriteRequirements}
        onRewriteRequirementsChange={setRewriteRequirements}
        composerRequest={polishComposerRequest}
        onRequestComposer={() => setPolishComposerRequest((count) => count + 1)}
        onBeginChapterRewrite={(range) => beginChapterRewrite(base.id, range)}
        onDiscardRewrite={() => {
          writer.discardRewrite();
          setEditingChapter({ chapter: base, mode: "manual" });
        }}
      />
    );
  }
  const continueLocked = chapterActionsLocked || ended;
  const composer = newChapterDraft ? null : (
    <FloatingComposer
      label="继续创作下一章"
      wrapTrigger={(trigger) => (
        <NovelActionTooltip hint={nextChapterActionHint}>
          {trigger}
        </NovelActionTooltip>
      )}
      draft={generationOptions.chapterGoal.trim()}
      requestOpen={composerRequest}
      onFocusInput={() =>
        chapterGoalInput.current?.focus({ preventScroll: true })
      }
    >
      <ChapterGenerationForm
        embedded
        inputRef={chapterGoalInput}
        hint={continuationHint}
        options={generationOptions}
        disabled={continueLocked}
        submitDisabled={!novel.title.trim()}
        submitLabel="AI 续写"
        onChange={updateGenerationOptions}
        onGenerate={generateNextChapter}
        manualDisabled={newChapterLocked}
        onWriteManually={startNextChapterManually}
      />
    </FloatingComposer>
  );
  return (
    <ComposerDock composer={composer}>
      <div
        ref={readingPanel}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-gutter-stable @container-size"
        onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 [--reading-bottom-padding:calc(var(--composer-dock-height,0px)+1.5rem)] pb-(--reading-bottom-padding)">
          <ContextControls
            room={room}
            writer={writer}
            open={contextOpen}
            onOpenChange={setContextOpen}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              fileMenuTrigger.current?.focus();
            }}
          />
          <NovelFileControls
            toolbar={fileToolbar}
            triggerRef={fileMenuTrigger}
            disabled={chapterActionsLocked}
            canSummarize={!ended && Boolean(novel.title.trim())}
            hasChapters={novel.chapters.length > 0}
            importing={importing}
            onImportingChange={setImporting}
            onImport={async (imported) => {
              if (newChapterDraft) throw new Error("请先保存草稿。");
              if (
                !window.confirm(
                  `即将用 ${imported.chapters.length} 章覆盖当前 ${novel.chapters.length} 章、创作设置和剧情摘要。覆盖前的版本会保留为本地备份。`,
                )
              )
                return;
              const id = await writer.importNovel(imported);
              if (!id) return;
              setAppliedRewrite(undefined);
              setCompactContext(false);
              setSelected(id);
            }}
            onDownload={download}
            onDownloadDrafts={
              draftTexts.size || newChapterDraft || writer.conflictedPlot ? downloadDrafts : undefined
            }
            onFork={writer.createFork}
            onOpenContext={() => setContextOpen(true)}
            onSaveToServer={saveToServer}
            onSyncFromServer={syncFromServer}
            onRestoreLocal={restoreLocalBackup}
            canRestoreLocal={writer.hasLocalBackup}
            syncPrompt={writer.syncPrompt}
            serverSynced={writer.serverSynced}
            onSummarize={writer.generateBackground}
          />
          {writer.missingLocal && writer.ready ? (
            <Alert>
              <AlertDescription>当前浏览器没有这部作品的正文存档。若曾在其他设备写作，可从「文件」导入正文。</AlertDescription>
            </Alert>
          ) : null}
          {writer.syncReadFailed ? (
            <Alert>
              <AlertDescription>未能读取服务器 TXT。本机存档可正常使用。</AlertDescription>
            </Alert>
          ) : null}
          {summarizing && writer.busy ? (
            <NovelBackgroundSummaryStatus onStop={writer.stop} />
          ) : null}
          {writer.backgroundExport ? (
            <NovelBackgroundPreview exported={writer.backgroundExport} />
          ) : null}
          {!plotOpen && writer.error ? (
            <Alert>
              <AlertDescription>{writer.error}</AlertDescription>
            </Alert>
          ) : null}
          {summarizing && !plotOpen && writer.preview ? (
            <article className="flex flex-col gap-4 rounded-lg border border-border p-5">
              <h3 className="font-serif text-lg">
                背景总结 · {writer.busy ? "生成中" : "未完成草稿"}
              </h3>
              <UnifiedMarkdown
                content={writer.preview}
                hasNextChunk={writer.busy}
              />
            </article>
          ) : null}
          {chapter || thinkingChapter || showingNewDraft ? (
            <section
              ref={chapterAnchor}
              className="flex flex-col gap-4 min-h-[calc(100cqh-var(--reading-bottom-padding))]"
            >
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 p-2 -mx-2 backdrop-blur-xs">
                <ChapterIndex
                  chapters={chapterEntries}
                  value={thinkingChapter?.id ?? readingChapterId ?? ""}
                  disabled={chapterSwitchLocked}
                  onSelect={goToChapter}
                />
                {chapter && !thinkingChapter && !showingNewDraft ? (
                  <p
                    className={cn(
                      "shrink-0 whitespace-nowrap text-xs tabular-nums",
                      chapterLengthShortfall(chapter.text.length, chapter.targetWords ?? "")
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatChapterLength(chapter.text.length, chapter.targetWords ?? "")}
                    {hasDraft(chapter) ? (
                      <span className="ml-2 font-medium text-destructive">
                        草稿未同步，点击「编辑本章」进入
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {thinkingChapter ? (
                    <NovelActionButton
                      hint={stopGenerationHint}
                      size="sm"
                      variant="outline"
                      className="h-9"
                      onClick={writer.stop}
                    >
                      <Square data-icon="inline-start" />
                      停止生成
                    </NovelActionButton>
                  ) : chapter && !showingNewDraft ? (
                    <>
                      <NovelActionButton
                        hint={localActionHint(
                          "打开本章编辑器，并恢复已有的本机草稿。",
                        )}
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={chapterActionsLocked}
                        onClick={() => {
                          readingScroll.current =
                            readingPanel.current?.scrollTop ?? 0;
                          writer.discardRewrite();
                          setEditingChapter({ chapter, mode: "manual" });
                        }}
                      >
                        <PenLine data-icon="inline-start" />
                        编辑本章
                      </NovelActionButton>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            ref={chapterMenuTrigger}
                            size="sm"
                            variant="outline"
                            className="h-9"
                            disabled={chapterActionsLocked}
                          >
                            <Ellipsis data-icon="inline-start" />
                            章节操作
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="min-w-44"
                          onCloseAutoFocus={(event) => {
                            if (!openPlotAfterMenuClose.current) return;
                            openPlotAfterMenuClose.current = false;
                            event.preventDefault();
                            writer.discardRewrite();
                            setPlotOpen(true);
                          }}
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              disabled={
                                chapterActionsLocked ||
                                ended ||
                                Boolean(newChapterDraft)
                              }
                              onSelect={() => {
                                openPlotAfterMenuClose.current = true;
                              }}
                            >
                              <Combine />
                              剧情整理
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={
                                chapterActionsLocked ||
                                newChapterDraft?.afterChapterId === chapter.id
                              }
                              onSelect={() => void deleteChapter()}
                            >
                              <Trash2 />
                              删除本章
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : null}
                </div>
              </div>
              {thinkingChapter ? (
                <p
                  role="status"
                  className="flex items-center gap-2 py-5 text-sm text-muted-foreground"
                >
                  <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
                  {writer.compressing
                    ? "正在压缩模型上下文…"
                    : `${thinkingChapter.title}正在构思…`}
                </p>
              ) : showingNewDraft && newChapterDraft ? (
                <NewChapterDraftActions
                  title={newChapterDraft.chapter.title}
                  disabled={chapterActionsLocked || discardingDraft}
                  backupFailed={writer.draftBackupFailed}
                  onEdit={resumeNewChapterDraft}
                  onDiscard={() => void discardNewChapterDraft()}
                />
              ) : chapter ? (
                <>
                  <PlotSheet
                    chapters={novel.chapters}
                    roomKey={roomKey}
                    currentChapterId={chapter.id}
                    hasPlotPair={hasPlotPair}
                    open={plotOpen}
                    onOpenChange={(open) => {
                      setPlotOpen(open);
                      if (!open) setPlotRestore(null);
                    }}
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      chapterMenuTrigger.current?.focus();
                    }}
                    writer={writer}
                    restored={plotRestore}
                    onApplied={(id) => {
                      setAppliedRewrite(undefined);
                      setSelected(id);
                      setPlotRestore(null);
                    }}
                  />
                  <ChapterReading
                    key={chapter.id}
                    title={chapter.title}
                    text={chapter.text}
                    brief={chapter.brief}
                    reuseDisabled={continueLocked || Boolean(newChapterDraft)}
                    renameDisabled={chapterActionsLocked}
                    onRename={(title) => {
                      void writer.renameChapter(chapter.id, title);
                    }}
                    onReuseBrief={reuseChapterGoal}
                    appliedLength={
                      appliedRewrite?.chapterId === chapter.id
                        ? appliedRewrite.length
                        : undefined
                    }
                  />
                  <nav
                    aria-label="章节切换"
                    className="flex items-center justify-between gap-3 border-t border-border pt-4"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={chapterSwitchLocked || !previousChapter}
                      onClick={() => {
                        if (previousChapter) goToChapter(previousChapter.id);
                      }}
                    >
                      <ChevronLeft data-icon="inline-start" />
                      上一章
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={chapterSwitchLocked || !nextChapter}
                      onClick={() => {
                        if (nextChapter) goToChapter(nextChapter.id);
                      }}
                    >
                      下一章
                      <ChevronRight data-icon="inline-start" />
                    </Button>
                  </nav>
                </>
              ) : null}
            </section>
          ) : (
            <EmptyNovelContinuation
              disabled={continueLocked}
              onOpen={() => setComposerRequest((count) => count + 1)}
            />
          )}
        </div>
      </div>
    </ComposerDock>
  );
}
