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
import { useLayoutEffect, useRef, useState } from "react";
import { useUnsavedNavigation } from "@/app/agent/_components/use-unsaved-navigation";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import { FieldGroup, TextField } from "../fields";
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
  defaultChapterTarget,
  exportNovel,
  isChapterTargetValid,
  maxChapterLength,
  minChapterTarget,
  replaceChapter,
  splitChapterAt,
} from "./model";
import { PlotSheet } from "./plot-sheet";
import { RewritePanel } from "./rewrite-form";
import { useNovel } from "./use-novel";

export function NovelPanel({
  room,
  onBusyChange,
}: {
  room: WorldRoom;
  onBusyChange: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const readingPanel = useRef<HTMLDivElement>(null);
  const readingScroll = useRef<number | null>(null);
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
  const readingContent = (
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
                : "设定与章节保存在当前浏览器，可随时导出整本小说。"}
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
        <fieldset
          disabled={chapterActionsLocked}
          className="flex flex-col gap-4 disabled:opacity-60"
        >
          <FieldGroup>
            <TextField
              label="小说名称"
              value={novel.title}
              maxLength={100}
              onChange={(title) => writer.update({ ...novel, title })}
            />
            <TextField
              label="文风与叙述视角"
              value={novel.style}
              multiline
              onChange={(style) => writer.update({ ...novel, style })}
            />
            <TextField
              label="小说大纲与创作要求"
              value={novel.outline}
              multiline
              maxLength={12000}
              onChange={(outline) => writer.update({ ...novel, outline })}
              hint="沿用世界背景、规则与全部角色设定；角色秘密由作者统一掌握，按剧情逐步揭示。"
            />
            <TextField
              label="下一章要求"
              value={novel.chapterGoal}
              multiline
              onChange={(chapterGoal) =>
                writer.update({ ...novel, chapterGoal })
              }
              hint="可指定本章事件、伏笔、结尾或情绪；留空则按大纲继续。"
            />
            <TextField
              label={`每章目标字数（${minChapterTarget}–${maxChapterLength}）`}
              value={novel.words}
              maxLength={4}
              onChange={(words) => writer.update({ ...novel, words })}
              hint={`默认 ${defaultChapterTarget} 字，正文最多 ${maxChapterLength} 字。`}
            />
          </FieldGroup>
        </fieldset>
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
        <div className="flex flex-wrap items-center gap-3">
          {generatingChapter ? (
            <Button variant="outline" onClick={writer.stop}>
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : (
            <Button
              disabled={chapterActionsLocked || !canGenerateChapter}
              onClick={() => {
                setSelected(null);
                writer.generate();
              }}
            >
              <PenLine data-icon="inline-start" />
              生成第{novel.chapters.length + 1}章
            </Button>
          )}
          {generatingChapter ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              正在创作第{novel.chapters.length + 1}章…
            </span>
          ) : null}
        </div>
        {writer.task !== "rewrite" && !plotOpen && writer.preview ? (
          <article className="flex flex-col gap-4 rounded-lg border border-border p-5">
            <h3 className="font-serif text-lg">
              {writer.task === "summary"
                ? "背景总结"
                : `第${novel.chapters.length + 1}章`}{" "}
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
                          chapterActionsLocked || ended || !chapter.text.trim()
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
            填写创作要求生成第一章，或导入已有小说。
          </p>
        )}
      </div>
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
