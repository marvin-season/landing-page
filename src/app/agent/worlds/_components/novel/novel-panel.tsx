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
  SelectItem,
} from "@landing-page/design-system";
import {
  ChevronLeft,
  ChevronRight,
  Combine,
  Ellipsis,
  LoaderCircle,
  PenLine,
  Scissors,
  Square,
  Trash2,
  WandSparkles,
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
import { WorldSelect } from "../world-select";
import {
  downloadBackground,
  NovelBackgroundPreview,
  NovelFileControls,
} from "./background-controls";
import { ChapterEditor } from "./chapter-editor";
import {
  ChapterGenerationForm,
  type ChapterGenerationOptions,
  ChapterRewriteForm,
} from "./chapter-generation-form";
import { useRegisterChapterPromptReuse } from "./chapter-prompt-reuse";
import { ChapterReading } from "./chapter-rewrite";
import { ChapterSplit } from "./chapter-split";
import { ContextControls } from "./context-controls";
import {
  type Chapter,
  chapterTitle,
  exportNovel,
  type NovelWritingContext,
  replaceChapter,
  splitChapterAt,
} from "./model";
import { PlotSheet } from "./plot-sheet";
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
  onAtTopChange,
  onContext,
}: {
  room: WorldRoom;
  fileToolbar: HTMLElement | null;
  onBusyChange: (busy: boolean) => void;
  onEditingChange: (editing: boolean) => void;
  onAtTopChange: (atTop: boolean) => void;
  onContext?: (value: NovelContextBridge | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{
    chapter: Chapter;
    mode: "manual" | "chapter" | "rewrite";
    initialText?: string;
    afterChapterId?: string | null;
  } | null>(null);
  const isEditing = editingChapter !== null;
  useLayoutEffect(() => {
    onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);
  const [thinkingChapter, setThinkingChapter] = useState<Chapter | null>(null);
  const [rewriteRequirements, setRewriteRequirements] = useState("");
  const [compactContext, setCompactContext] = useState(false);
  const readingPanel = useRef<HTMLDivElement>(null);
  const chapterAnchor = useRef<HTMLElement>(null);
  const scrollChapterIntoView = useRef(false);
  const chapterGoalInput = useRef<HTMLTextAreaElement>(null);
  const readingScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    const panel = readingPanel.current;
    if (editingChapter || thinkingChapter || !panel) return;
    if (readingScroll.current !== null) {
      panel.scrollTop = readingScroll.current;
      readingScroll.current = null;
    }
    onAtTopChange(panel.scrollTop <= 0);
  }, [editingChapter, thinkingChapter, onAtTopChange]);
  const [plotOpen, setPlotOpen] = useState(false);
  const [composerRequest, setComposerRequest] = useState(0);
  const writer = useNovel(
    room,
    (busy) => {
      if (!busy) setThinkingChapter(null);
      onBusyChange(busy);
    },
    downloadBackground,
    (restored) => {
      if (restored.mode === "rewrite") {
        setSelected(restored.chapter.id);
        setRewriteRequirements(restored.requirements ?? "");
        setCompactContext(restored.compactContext ?? false);
      }
      setEditingChapter({
        chapter: restored.chapter,
        mode: restored.mode,
        initialText: restored.text,
        afterChapterId: restored.afterChapterId,
      });
    },
  );
  const { novel } = writer;
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
  const [rewriting, setRewriting] = useState(false);
  const [appliedRewrite, setAppliedRewrite] = useState<{
    chapterId: string;
    length: number;
  }>();
  const streamingRewrite =
    editingChapter?.mode !== "rewrite" &&
    (plotOpen || writer.task === "rewrite") &&
    writer.busy;
  const waitingForText = Boolean(thinkingChapter);
  useUnsavedNavigation(
    waitingForText || streamingRewrite || writer.rewriteReady,
    waitingForText || streamingRewrite
      ? "草稿正在生成，离开会中断本次生成。确定离开吗？"
      : "草稿尚未应用，离开会丢失草稿。确定离开吗？",
  );
  const [splitting, setSplitting] = useState(false);
  const chapterMenuTrigger = useRef<HTMLButtonElement>(null);
  const actionFromMenu = useRef<"rewrite" | "split" | "plot" | null>(null);
  const selectedIndex = novel.chapters.findIndex(
    (item) => item.id === selected,
  );
  const chapterIndex =
    selectedIndex < 0 ? novel.chapters.length - 1 : selectedIndex;
  const chapter = novel.chapters[chapterIndex];
  const chapterSwitchLocked = waitingForText || rewriting || importing;
  const previousChapter =
    chapterIndex > 0 ? novel.chapters[chapterIndex - 1] : undefined;
  const nextChapter = novel.chapters[chapterIndex + 1];
  const goToChapter = useCallback((id: string) => {
    setAppliedRewrite(undefined);
    setSelected(id);
    scrollChapterIntoView.current = true;
  }, []);
  useLayoutEffect(() => {
    if (!chapter?.id || !scrollChapterIntoView.current) return;
    scrollChapterIntoView.current = false;
    chapterAnchor.current?.scrollIntoView({ block: "start" });
  }, [chapter?.id]);
  useEffect(() => {
    if (editingChapter || chapterSwitchLocked) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], [role='combobox'], [role='dialog'], [role='listbox'], [role='menu']",
        )
      )
        return;
      if (document.querySelector("[role='dialog']")) return;
      const destination =
        event.key === "ArrowLeft" ? previousChapter : nextChapter;
      if (!destination) return;
      event.preventDefault();
      goToChapter(destination.id);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    chapterSwitchLocked,
    editingChapter,
    goToChapter,
    nextChapter,
    previousChapter,
  ]);
  const continuationHint = chapter
    ? `续写位置：「${chapter.title || chapterTitle(chapterIndex)}」之后，生成${chapterTitle(chapterIndex + 1)}。参考范围：当前章及之前。`
    : "续写位置：第1章。参考范围：世界和小说设定。";
  const hasPlotPair = novel.chapters.some(({ text }, index) =>
    Boolean(text.trim() && novel.chapters[index + 1]?.text.trim()),
  );
  const disabled = !writer.ready || writer.busy || importing;
  const ended = room.status === "ended";
  const chapterActionsLocked = disabled || rewriting;
  const summarizing = writer.task === "summary";
  function reuseChapterGoal(text: string) {
    if (!writer.ready || writer.busy || importing || rewriting || ended)
      return false;
    void writer.updateChapterGoal(text);
    setComposerRequest((count) => count + 1);
    return true;
  }
  useRegisterChapterPromptReuse(reuseChapterGoal);
  const generationOptions = {
    chapterGoal: novel.chapterGoal,
    words: novel.words,
  };
  function updateGenerationOptions(options: ChapterGenerationOptions) {
    writer.update({ ...novel, ...options });
  }
  function generateNextChapter() {
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
  function generateRewrite() {
    if (
      !chapter ||
      !writer.rewrite(chapter.id, rewriteRequirements, { compactContext })
    )
      return;
    readingScroll.current = readingPanel.current?.scrollTop ?? 0;
    setRewriting(false);
    setEditingChapter({ chapter, mode: "rewrite" });
  }
  function openRewrite() {
    writer.discardRewrite();
    window.getSelection()?.removeAllRanges();
    setRewriteRequirements("");
    setRewriting(true);
  }
  function closeRewrite() {
    if (writer.busy) return;
    writer.discardRewrite();
    setRewriting(false);
    requestAnimationFrame(() => chapterMenuTrigger.current?.focus());
  }
  function splitChapter(caret: number) {
    if (chapterActionsLocked || !chapter) return false;
    const newChapterId = crypto.randomUUID();
    const next = splitChapterAt(novel, chapter.id, caret, newChapterId);
    if (!next) return false;
    writer.update(next);
    setSelected(newChapterId);
    return true;
  }
  function deleteChapter() {
    if (disabled || !chapter) return;
    if (
      !window.confirm(
        `删除“${chapter.title}”及其全部正文？此操作不能撤销，其他章节将保留。`,
      )
    )
      return;
    const index = novel.chapters.findIndex((item) => item.id === chapter.id);
    const chapters = novel.chapters.filter((item) => item.id !== chapter.id);
    writer.update({ ...novel, chapters });
    setSelected(chapters[Math.max(0, index - 1)]?.id ?? null);
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
    if (!window.confirm("恢复上一份本地备份。现在的本地正文会保留为唯一备份。"))
      return null;
    await writer.restoreLocalBackup();
    return "已恢复本地备份。";
  }
  if (editingChapter) {
    const { chapter: base, mode, initialText, afterChapterId } = editingChapter;
    return (
      <ChapterEditor
        key={base.id}
        base={base}
        chapters={novel.chapters}
        initialText={initialText}
        generation={
          mode === "chapter"
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
                  onGenerate: () => {
                    const chapter = novel.chapters.find(
                      ({ id }) => id === base.id,
                    );
                    if (
                      !writer.rewrite(base.id, rewriteRequirements, {
                        compactContext,
                      })
                    )
                      return false;
                    if (chapter && chapter !== base)
                      setEditingChapter({ chapter, mode });
                    return true;
                  },
                  renderForm: (props) => (
                    <ChapterRewriteForm
                      {...props}
                      requirements={rewriteRequirements}
                      onChange={setRewriteRequirements}
                      compactContext={compactContext}
                      onCompactContextChange={setCompactContext}
                      submitLabel="重新生成"
                    />
                  ),
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
            writer.clearDraftBackup();
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
            if (mode !== "manual") writer.clearDraftBackup();
            setEditingChapter({ chapter: draft, mode: "manual" });
            if (mode === "rewrite")
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
          setSelected(id);
          setEditingChapter({ chapter: next, mode: "manual" });
        }}
        onExit={() => {
          if (mode !== "manual") writer.clearDraftBackup();
          writer.discardRewrite();
          setEditingChapter(null);
        }}
      />
    );
  }
  const continueLocked = chapterActionsLocked || ended;
  const composer = (
    <FloatingComposer
      label="继续创作下一章"
      draft={generationOptions.chapterGoal.trim()}
      forceOpen={rewriting}
      requestOpen={composerRequest}
      onFocusInput={() =>
        chapterGoalInput.current?.focus({ preventScroll: true })
      }
    >
      {rewriting ? (
        <ChapterRewriteForm
          embedded
          requirements={rewriteRequirements}
          onChange={setRewriteRequirements}
          compactContext={compactContext}
          onCompactContextChange={setCompactContext}
          disabled={disabled || ended}
          submitLabel="开始润色"
          onGenerate={generateRewrite}
          onCancel={closeRewrite}
        />
      ) : (
        <ChapterGenerationForm
          embedded
          inputRef={chapterGoalInput}
          hint={continuationHint}
          options={generationOptions}
          disabled={continueLocked}
          submitDisabled={!novel.title.trim()}
          submitLabel="续写下一章"
          onChange={updateGenerationOptions}
          onGenerate={generateNextChapter}
        />
      )}
    </FloatingComposer>
  );
  return (
    <ComposerDock composer={composer}>
      <div
        ref={readingPanel}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        onScroll={(event) => onAtTopChange(event.currentTarget.scrollTop <= 0)}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 pb-[calc(var(--composer-dock-height,0px)+1.5rem)]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-serif text-xl">小说创作</h2>
            <p className="text-xs text-muted-foreground">
              已完成 {novel.chapters.length} 章
              {writer.saving ? " · 正在保存…" : null}
            </p>
          </div>
          <NovelFileControls
            toolbar={fileToolbar}
            disabled={chapterActionsLocked}
            canSummarize={!ended && Boolean(novel.title.trim())}
            hasChapters={novel.chapters.length > 0}
            importing={importing}
            onImportingChange={setImporting}
            onImport={async (imported) => {
              if (
                !window.confirm(
                  `即将导入 ${imported.chapters.length} 章，覆盖当前小说的全部 ${novel.chapters.length} 章、创作设置和剧情摘要。此操作无法撤销，建议先导出旧稿。`,
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
            onSaveToServer={saveToServer}
            onSyncFromServer={syncFromServer}
            onRestoreLocal={restoreLocalBackup}
            canRestoreLocal={writer.hasLocalBackup}
            syncPrompt={writer.syncPrompt}
            serverSynced={writer.serverSynced}
            onSummarize={writer.generateBackground}
          />
          {summarizing && writer.busy ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={writer.stop}>
                <Square data-icon="inline-start" />
                停止总结
              </Button>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                正在总结剧情背景…
              </span>
            </div>
          ) : null}
          {writer.backgroundExport ? (
            <NovelBackgroundPreview exported={writer.backgroundExport} />
          ) : null}
          <ContextControls
            room={room}
            writer={writer}
            chapterCount={chapterIndex + 1}
            disabled={chapterActionsLocked}
          />
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
          {chapter || thinkingChapter ? (
            <section
              ref={chapterAnchor}
              className="flex flex-col gap-4 border-t border-border pt-5"
            >
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xs p-2 -mx-2">
                <div className="flex min-w-0 max-w-md flex-[1_1_18rem] items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9 shrink-0"
                    aria-label="上一章"
                    title="上一章（←）"
                    disabled={chapterSwitchLocked || !previousChapter}
                    onClick={() => {
                      if (previousChapter) goToChapter(previousChapter.id);
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <WorldSelect
                    label="章节目录"
                    className="min-w-0 flex-1"
                    value={thinkingChapter?.id ?? chapter?.id ?? ""}
                    disabled={chapterSwitchLocked}
                    onValueChange={(value) => {
                      setAppliedRewrite(undefined);
                      setSelected(value);
                    }}
                  >
                    {novel.chapters.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                    {thinkingChapter ? (
                      <SelectItem value={thinkingChapter.id}>
                        {thinkingChapter.title}（正在构思）
                      </SelectItem>
                    ) : null}
                  </WorldSelect>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9 shrink-0"
                    aria-label="下一章"
                    title="下一章（→）"
                    disabled={chapterSwitchLocked || !nextChapter}
                    onClick={() => {
                      if (nextChapter) goToChapter(nextChapter.id);
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
                {thinkingChapter ? (
                  <Button size="sm" variant="outline" onClick={writer.stop}>
                    <Square data-icon="inline-start" />
                    停止生成
                  </Button>
                ) : chapter ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
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
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          ref={chapterMenuTrigger}
                          size="sm"
                          variant="outline"
                          disabled={chapterActionsLocked}
                        >
                          <Ellipsis data-icon="inline-start" />
                          章节操作
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onCloseAutoFocus={(event) => {
                          const action = actionFromMenu.current;
                          actionFromMenu.current = null;
                          if (!action) return;
                          event.preventDefault();
                          if (action === "rewrite") openRewrite();
                          else if (action === "split") setSplitting(true);
                          else {
                            writer.discardRewrite();
                            setPlotOpen(true);
                          }
                        }}
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            disabled={!/\S\s*\S/u.test(chapter.text)}
                            onSelect={() => {
                              actionFromMenu.current = "split";
                            }}
                          >
                            <Scissors />
                            拆分本章
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              chapterActionsLocked ||
                              ended ||
                              !chapter.text.trim()
                            }
                            onSelect={() => {
                              actionFromMenu.current = "rewrite";
                            }}
                          >
                            <WandSparkles />
                            润色整章
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={chapterActionsLocked || ended}
                            onSelect={() => {
                              actionFromMenu.current = "plot";
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
                            disabled={chapterActionsLocked}
                            onSelect={deleteChapter}
                          >
                            <Trash2 />
                            删除本章
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
              {thinkingChapter ? (
                <p
                  role="status"
                  className="flex items-center gap-2 py-5 text-sm text-muted-foreground"
                >
                  <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
                  {thinkingChapter.title}正在构思…
                </p>
              ) : chapter ? (
                <>
                  <PlotSheet
                    chapters={novel.chapters}
                    hasPlotPair={hasPlotPair}
                    open={plotOpen}
                    onOpenChange={setPlotOpen}
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      chapterMenuTrigger.current?.focus();
                    }}
                    writer={writer}
                    onApplied={(id) => {
                      setAppliedRewrite(undefined);
                      setSelected(id);
                    }}
                  />
                  <ChapterSplit
                    chapter={chapter}
                    disabled={chapterActionsLocked}
                    open={splitting}
                    onOpenChange={setSplitting}
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      chapterMenuTrigger.current?.focus();
                    }}
                    onSplit={splitChapter}
                  />
                  <ChapterReading
                    key={chapter.id}
                    title={chapter.title}
                    text={chapter.text}
                    brief={chapter.brief}
                    rewriting={rewriting}
                    reuseDisabled={continueLocked}
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
            <p className="py-8 text-center text-sm text-muted-foreground">
              在下方填写下一章要求后续写，或导入已有小说。
            </p>
          )}
        </div>
      </div>
    </ComposerDock>
  );
}
/**
 *
 * 
女主：160cm* 50kg, 舞蹈生，小网红，几万粉丝，长相精致，身材出众，爱拍点热门抖音小视频，视频里面微微带点擦边，是很多人的梦中女神和意淫对象
男主：165cm, 60kg，大一认识了女主，发现是同校生，加了好友，追求到手、情绪升温、确定恋爱关系，
男二：185cm*70kg, 某职工，和女二有过一段婚姻，后面驾校认识女主，加了好友，是很稀有的高颜值、好身材的帅哥
女二：男二的前妻，因婚后不和离婚，175cmx60kg,很有气质，人妻、少妇感拉满，御姐类型
 * 
 */
