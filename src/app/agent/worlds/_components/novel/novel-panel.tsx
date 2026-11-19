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
  FileText,
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
import { ChapterReading } from "./chapter-rewrite";
import { ChapterSplit } from "./chapter-split";
import { ContextControls } from "./context-controls";
import {
  type Chapter,
  exportNovel,
  isChapterTargetValid,
  maxChapterLength,
  minChapterTarget,
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
  const readingPanel = useRef<HTMLDivElement>(null);
  const readingScroll = useRef<number | null>(null);
  const generationDraft = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (
      editingChapter ||
      !readingPanel.current ||
      readingScroll.current === null
    )
      return;
    readingPanel.current.scrollTop = readingScroll.current;
    readingScroll.current = null;
  }, [editingChapter]);
  const [plotOpen, setPlotOpen] = useState(false);
  const writer = useNovel(room, onBusyChange, downloadBackground);
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
  useUnsavedNavigation(
    streamingRewrite || writer.rewriteReady,
    streamingRewrite
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
  const canGenerateChapter =
    !ended && Boolean(novel.title.trim()) && isChapterTargetValid(novel.words);
  const summarizing = writer.task === "summary";
  const generatingChapter =
    writer.busy && writer.task === "chapter" && !plotOpen;
  const chapterNumber = novel.chapters.length + 1;
  const hasChapterDraft = writer.task === "chapter" && Boolean(writer.preview);
  const chapterStatus = generatingChapter
    ? `${hasChapterDraft ? "正在创作" : "等待输出 · "}第 ${chapterNumber} 章`
    : writer.chapterStopped
      ? hasChapterDraft
        ? "已停止接收 · 草稿未保存"
        : "已停止接收 · 无草稿"
      : !novel.title.trim()
        ? "请在设定中填写小说名称"
        : !isChapterTargetValid(novel.words)
          ? `每章字数需为 ${minChapterTarget}–${maxChapterLength}`
          : `第 ${chapterNumber} 章`;
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
    return (
      <ChapterEditor
        key={editingChapter.id}
        base={editingChapter}
        chapters={novel.chapters}
        writer={writer}
        ended={ended}
        compactContext={compactContext}
        onCompactContextChange={setCompactContext}
        onSave={async (draft) => {
          const saved = await writer.update(replaceChapter(novel, draft), {
            persistFirst: true,
          });
          if (saved) setEditingChapter(draft);
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
              onSummarize={() => writer.generate("summary")}
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
          {writer.task !== "rewrite" && !plotOpen && writer.preview ? (
            <article
              ref={generationDraft}
              className="flex flex-col gap-4 rounded-lg border border-border p-5"
            >
              <h3 className="font-serif text-lg">
                {writer.task === "summary"
                  ? "背景总结"
                  : `第 ${chapterNumber} 章`}{" "}
                · {writer.busy ? "生成中" : "未完成草稿"}
              </h3>
              <UnifiedMarkdown
                content={writer.preview}
                hasNextChunk={writer.busy}
              />
            </article>
          ) : null}
          {chapter ? (
            <section className="flex flex-col gap-4 border-t border-border pt-5">
              <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xs p-2 -mx-2">
                <label className="flex items-center gap-2 text-sm min-w-0 max-w-72 flex-[1_1_13rem] whitespace-nowrap">
                  章节目录
                  <select
                    className="rounded-md border border-input px-3 py-2 min-w-0 flex-1 truncate"
                    value={chapter.id}
                    disabled={rewriting || importing}
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
                  </select>
                </label>
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
              </div>
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
            </section>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              在下方填写下一章要求后续写，或导入已有小说。
            </p>
          )}
        </div>
      </div>
      {rewriting ? null : (
        <form
          className="shrink-0 border-t border-border bg-background/80 px-5 py-3 backdrop-blur-xs sm:px-8"
          onSubmit={(event) => {
            event.preventDefault();
            if (continueLocked || !canGenerateChapter || generatingChapter)
              return;
            setSelected(null);
            writer.generate();
          }}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-lg border border-input bg-background p-3 focus-within:border-ring">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium">下一章要求</span>
              <textarea
                value={novel.chapterGoal}
                disabled={continueLocked}
                rows={2}
                maxLength={4000}
                placeholder="可指定本章事件、伏笔、结尾或情绪；留空则按大纲继续。"
                onChange={(event) =>
                  writer.update({ ...novel, chapterGoal: event.target.value })
                }
                className="max-h-24 min-h-12 w-full resize-none bg-transparent text-sm leading-6 outline-none disabled:opacity-60"
              />
            </label>
            <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  每章字数
                  <input
                    value={novel.words}
                    disabled={continueLocked}
                    inputMode="numeric"
                    maxLength={4}
                    aria-label="每章字数"
                    onChange={(event) =>
                      writer.update({ ...novel, words: event.target.value })
                    }
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  />
                  <span>
                    {minChapterTarget}–{maxChapterLength}
                  </span>
                </label>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {generatingChapter ? (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin" />
                  ) : null}
                  <span>{chapterStatus}</span>
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {hasChapterDraft ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="px-2"
                    onClick={() => generationDraft.current?.scrollIntoView()}
                  >
                    <FileText data-icon="inline-start" />
                    草稿
                  </Button>
                ) : null}
                {generatingChapter ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-28 whitespace-nowrap"
                    onClick={(event) => {
                      event.preventDefault();
                      writer.stop();
                    }}
                  >
                    <Square data-icon="inline-start" />
                    停止生成
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    className="min-w-28 whitespace-nowrap"
                    disabled={continueLocked || !canGenerateChapter}
                  >
                    <PenLine data-icon="inline-start" />
                    {writer.chapterStopped ? "重新生成" : "续写下一章"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
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
