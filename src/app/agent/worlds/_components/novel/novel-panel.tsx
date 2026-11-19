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
import {
  Ellipsis,
  LoaderCircle,
  PenLine,
  Scissors,
  Square,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUnsavedNavigation } from "@/app/agent/_components/use-unsaved-navigation";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import {
  downloadBackground,
  NovelBackgroundPreview,
  NovelFileControls,
} from "./background-controls";
import { ChapterEditor } from "./chapter-editor";
import {
  ChapterGenerationForm,
  type ChapterGenerationOptions,
} from "./chapter-generation-form";
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
import { RewritePanel } from "./rewrite-form";
import { useNovel } from "./use-novel";

export type NovelContextBridge = {
  settled: boolean;
  context: NovelWritingContext | null;
  save: (context: NovelWritingContext) => Promise<boolean>;
};

export function NovelPanel({
  room,
  onBusyChange,
  onContext,
}: {
  room: WorldRoom;
  onBusyChange: (busy: boolean) => void;
  onContext?: (value: NovelContextBridge | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [thinkingChapter, setThinkingChapter] = useState<Chapter | null>(null);
  const readingPanel = useRef<HTMLDivElement>(null);
  const readingScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (
      editingChapter ||
      thinkingChapter ||
      !readingPanel.current ||
      readingScroll.current === null
    )
      return;
    readingPanel.current.scrollTop = readingScroll.current;
    readingScroll.current = null;
  }, [editingChapter, thinkingChapter]);
  const [plotOpen, setPlotOpen] = useState(false);
  const writer = useNovel(
    room,
    (busy) => {
      if (!busy) setThinkingChapter(null);
      onBusyChange(busy);
    },
    downloadBackground,
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
  const [compactContext, setCompactContext] = useState(false);
  const streamingRewrite =
    (plotOpen || writer.task === "rewrite") && writer.busy;
  const waitingForText = Boolean(thinkingChapter);
  useUnsavedNavigation(
    waitingForText || streamingRewrite || writer.rewriteReady,
    waitingForText || streamingRewrite
      ? "草稿正在生成，离开会中断本次生成。确定离开吗？"
      : "草稿尚未应用，离开会丢失草稿。确定离开吗？",
  );
  const [splitting, setSplitting] = useState(false);
  const chapterMenuTrigger = useRef<HTMLButtonElement>(null);
  const actionFromMenu = useRef<"rewrite" | "split" | null>(null);
  const selectedIndex = novel.chapters.findIndex(
    (item) => item.id === selected,
  );
  const chapterIndex =
    selectedIndex < 0 ? novel.chapters.length - 1 : selectedIndex;
  const chapter = novel.chapters[chapterIndex];
  const disabled = !writer.ready || writer.busy || importing;
  const ended = room.status === "ended";
  const chapterActionsLocked = disabled || rewriting;
  const summarizing = writer.task === "summary";
  const generationOptions = {
    chapterGoal: novel.chapterGoal,
    words: novel.words,
  };
  function updateGenerationOptions(options: ChapterGenerationOptions) {
    writer.update({ ...novel, ...options });
  }
  function generateNextChapter() {
    const next: Chapter = {
      id: crypto.randomUUID(),
      title: chapterTitle(novel.chapters.length),
      text: "",
    };
    if (
      !writer.generateChapter(() => {
        setThinkingChapter(null);
        setEditingChapter(next);
      })
    )
      return;
    readingScroll.current = readingPanel.current?.scrollTop ?? 0;
    setThinkingChapter(next);
  }
  function openRewrite() {
    writer.discardRewrite();
    window.getSelection()?.removeAllRanges();
    setRewriting(true);
  }
  function closeRewrite() {
    if (writer.busy) return;
    writer.discardRewrite();
    setRewriting(false);
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
  if (editingChapter) {
    const creating = !novel.chapters.some(({ id }) => id === editingChapter.id);
    return (
      <ChapterEditor
        key={editingChapter.id}
        base={editingChapter}
        chapters={novel.chapters}
        creation={
          creating
            ? {
                options: generationOptions,
                onChange: updateGenerationOptions,
                onGenerate: writer.generateChapter,
              }
            : undefined
        }
        writer={writer}
        ended={ended}
        compactContext={compactContext}
        onCompactContextChange={setCompactContext}
        onSave={async (draft) => {
          const next = creating
            ? { ...novel, chapters: [...novel.chapters, draft] }
            : replaceChapter(novel, draft);
          const saved = await writer.update(next, { persistFirst: true });
          if (saved) {
            setEditingChapter(draft);
            if (creating) setSelected(draft.id);
          }
          return saved;
        }}
        onSelectChapter={(id) => {
          const next = novel.chapters.find((item) => item.id === id);
          if (!next) return;
          setSelected(id);
          setEditingChapter(next);
        }}
        onExit={() => {
          writer.discardRewrite();
          setEditingChapter(null);
        }}
      />
    );
  }
  const continueLocked = chapterActionsLocked || ended;
  const readingContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={readingPanel}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-serif text-xl">小说创作</h2>
              <p className="text-sm text-muted-foreground">
                一个写作智能体统一创作，每次生成一章。已完成{" "}
                {novel.chapters.length} 章。
              </p>
              <p className="text-xs text-muted-foreground">
                {writer.saving
                  ? "正在保存…"
                  : "名称、文风和大纲在右上角设定中修改，章节保存在当前浏览器。"}
              </p>
            </div>
            <NovelFileControls
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
              onSummarize={writer.generateBackground}
            />
          </div>
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
            disabled={chapterActionsLocked}
          />
          {!rewriting && !plotOpen && writer.error ? (
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
            <section className="flex flex-col gap-4 border-t border-border pt-5">
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xs p-2 -mx-2">
                <label className="flex items-center gap-2 text-sm min-w-0 max-w-72 flex-[1_1_13rem] whitespace-nowrap">
                  章节目录
                  <select
                    className="rounded-md border border-input px-3 py-2 min-w-0 flex-1 truncate"
                    value={thinkingChapter?.id ?? chapter?.id}
                    disabled={waitingForText || rewriting || importing}
                    onChange={(event) => {
                      setAppliedRewrite(undefined);
                      setSelected(event.target.value);
                    }}
                  >
                    {novel.chapters.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                    {thinkingChapter ? (
                      <option value={thinkingChapter.id}>
                        {thinkingChapter.title}（正在构思）
                      </option>
                    ) : null}
                  </select>
                </label>
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
                        setEditingChapter(chapter);
                      }}
                    >
                      <PenLine data-icon="inline-start" />
                      编辑本章
                    </Button>
                    <PlotSheet
                      chapters={novel.chapters}
                      disabled={chapterActionsLocked || ended}
                      open={plotOpen}
                      onOpenChange={setPlotOpen}
                      writer={writer}
                      onApplied={(id) => {
                        setAppliedRewrite(undefined);
                        setSelected(id);
                      }}
                    />
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
                          else setSplitting(true);
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
                    rewriting={rewriting}
                    appliedLength={
                      appliedRewrite?.chapterId === chapter.id
                        ? appliedRewrite.length
                        : undefined
                    }
                  />
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
      {rewriting ? null : (
        <div className="shrink-0 border-t border-border bg-background/80 px-5 py-3 backdrop-blur-xs sm:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <ChapterGenerationForm
              options={generationOptions}
              disabled={continueLocked}
              submitDisabled={!novel.title.trim()}
              submitLabel="续写下一章"
              onChange={updateGenerationOptions}
              onGenerate={generateNextChapter}
            />
          </div>
        </div>
      )}
    </div>
  );
  return (
    <>
      {readingContent}
      {chapter && rewriting ? (
        <RewritePanel
          isPassage={false}
          preview={writer.task === "rewrite" ? writer.preview : ""}
          draftReady={writer.rewriteReady}
          compactContext={compactContext}
          onCompactContextChange={setCompactContext}
          writer={writer}
          ended={ended}
          onClose={closeRewrite}
          onApply={() => {
            if (!writer.applyRewrite()) return;
            setAppliedRewrite({
              chapterId: chapter.id,
              length: writer.preview.length,
            });
            setRewriting(false);
          }}
          onRewrite={(requirements) =>
            writer.rewrite(chapter.id, requirements, undefined, compactContext)
          }
        />
      ) : null}
    </>
  );
}
