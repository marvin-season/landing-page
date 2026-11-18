"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import {
  Download,
  LoaderCircle,
  PenLine,
  Plus,
  Square,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { downloadText } from "@/lib/group-chat/client";
import type { WorldRoom } from "@/lib/group-chat/model";
import { FieldGroup, TextField } from "../fields";
import { BackgroundControls, downloadBackground } from "./background-controls";
import { ChapterReading, type RewriteTarget } from "./chapter-rewrite";
import { chapterTitle, exportNovel } from "./model";
import { useNovel } from "./use-novel";

export function NovelPanel({
  room,
  onBusyChange,
}: {
  room: WorldRoom;
  onBusyChange: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [insertion, setInsertion] = useState<{
    beforeId: string;
    requirements: string;
  } | null>(null);
  const writer = useNovel(room, onBusyChange, downloadBackground, (id) => {
    setSelected(id);
    setInsertion(null);
  });
  const { novel } = writer;
  const [rewriteTarget, setRewriteTarget] = useState<RewriteTarget | null>(
    null,
  );
  const selectedIndex = novel.chapters.findIndex(
    (item) => item.id === selected,
  );
  const chapterIndex =
    selectedIndex < 0 ? novel.chapters.length - 1 : selectedIndex;
  const chapter = novel.chapters[chapterIndex];
  const disabled = !writer.ready || writer.busy;
  const ended = room.status === "ended";
  const rewriting = rewriteTarget !== null;
  const chapterActionsLocked = disabled || rewriting || insertion !== null;
  const canGenerateChapter =
    !ended &&
    Boolean(novel.title.trim()) &&
    /^\d+$/.test(novel.words) &&
    Number(novel.words) >= 500 &&
    Number(novel.words) <= 4000;
  function openRewrite(target: RewriteTarget) {
    writer.discardRewrite();
    setEditing(false);
    window.getSelection()?.removeAllRanges();
    setRewriteTarget(target);
  }
  function closeRewrite() {
    writer.discardRewrite();
    setRewriteTarget(null);
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
    setEditing(false);
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
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!novel.chapters.length}
              onClick={() => download("txt")}
            >
              <Download data-icon="inline-start" />
              导出小说 TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!novel.chapters.length}
              onClick={() => download("md")}
            >
              Markdown
            </Button>
          </div>
        </div>
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
              label="每章目标字数（500–4000）"
              value={novel.words}
              maxLength={4}
              onChange={(words) => writer.update({ ...novel, words })}
              hint="目标字数供模型参考，实际篇幅可能有所浮动。"
            />
          </FieldGroup>
        </fieldset>
        <BackgroundControls
          background={novel.background}
          exported={writer.backgroundExport}
          disabled={chapterActionsLocked}
          canSummarize={
            !ended && novel.chapters.length > 0 && Boolean(novel.title.trim())
          }
          onImport={writer.importBackground}
          onSummarize={() => {
            setEditing(false);
            writer.generate("summary");
          }}
        />
        {!rewriting && !insertion && writer.error ? (
          <Alert>
            <AlertDescription>{writer.error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {writer.busy && writer.task !== "rewrite" && !insertion ? (
            <Button variant="outline" onClick={writer.stop}>
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : (
            <Button
              disabled={chapterActionsLocked || !canGenerateChapter}
              onClick={() => {
                setEditing(false);
                setSelected(null);
                writer.generate();
              }}
            >
              <PenLine data-icon="inline-start" />
              生成第{novel.chapters.length + 1}章
            </Button>
          )}
          {writer.busy && writer.task !== "rewrite" && !insertion ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {writer.task === "summary"
                ? "正在总结剧情背景…"
                : `正在创作第${novel.chapters.length + 1}章…`}
            </span>
          ) : null}
        </div>
        {writer.task !== "rewrite" && !insertion && writer.preview ? (
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                章节目录
                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  value={chapter.id}
                  disabled={rewriting || insertion !== null}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    setEditing(false);
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
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? "完成编辑" : "编辑本章"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={chapterActionsLocked || !canGenerateChapter}
                  onClick={() => {
                    writer.discardInsertion();
                    setEditing(false);
                    setInsertion({ beforeId: chapter.id, requirements: "" });
                  }}
                >
                  <Plus data-icon="inline-start" />
                  在本章前插入
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    chapterActionsLocked || ended || !chapter.text.trim()
                  }
                  onClick={() => openRewrite({ atStart: true })}
                >
                  <WandSparkles data-icon="inline-start" />
                  润色整章
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={chapterActionsLocked}
                  onClick={deleteChapter}
                >
                  <Trash2 data-icon="inline-start" />
                  删除本章
                </Button>
              </div>
            </div>
            {insertion ? (
              <form
                className="flex min-w-0 flex-col gap-3 border-b border-border pb-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!disabled && canGenerateChapter) {
                    writer.insertBefore(
                      insertion.beforeId,
                      insertion.requirements,
                    );
                  }
                }}
              >
                <fieldset disabled={writer.busy}>
                  <TextField
                    label="插入章节的创作要求（可选）"
                    value={insertion.requirements}
                    multiline
                    onChange={(requirements) =>
                      setInsertion({ ...insertion, requirements })
                    }
                  />
                </fieldset>
                {writer.error ? (
                  <Alert>
                    <AlertDescription>{writer.error}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {writer.busy ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={writer.stop}
                      >
                        <Square data-icon="inline-start" />
                        停止生成
                      </Button>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin" />
                        正在创作{chapterTitle(chapterIndex)}…
                      </span>
                    </>
                  ) : (
                    <>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={disabled || !canGenerateChapter}
                      >
                        <PenLine data-icon="inline-start" />
                        生成新{chapterTitle(chapterIndex)}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          writer.discardInsertion();
                          setInsertion(null);
                        }}
                      >
                        取消
                      </Button>
                    </>
                  )}
                </div>
                {writer.inserting && writer.preview ? (
                  <article className="flex min-w-0 flex-col gap-2 border-l-2 border-border pl-4">
                    {!writer.busy ? (
                      <p className="text-sm text-muted-foreground">
                        未完成草稿
                      </p>
                    ) : null}
                    <UnifiedMarkdown
                      content={writer.preview}
                      hasNextChunk={writer.busy}
                    />
                  </article>
                ) : null}
              </form>
            ) : null}
            {editing ? (
              <fieldset disabled={disabled} className="min-w-0">
                <FieldGroup>
                  <TextField
                    label="章节标题"
                    value={chapter.title}
                    onChange={(title) =>
                      writer.update({
                        ...novel,
                        chapters: novel.chapters.map((item) =>
                          item.id === chapter.id ? { ...item, title } : item,
                        ),
                      })
                    }
                  />
                  <TextField
                    label="章节正文"
                    value={chapter.text}
                    multiline
                    maxLength={40000}
                    onChange={(text) => {
                      writer.update({
                        ...novel,
                        chapters: novel.chapters.map((item) =>
                          item.id === chapter.id ? { ...item, text } : item,
                        ),
                      });
                    }}
                    hint="修改后的正文将用于下一章创作与整本导出。"
                  />
                </FieldGroup>
              </fieldset>
            ) : (
              <ChapterReading
                key={chapter.id}
                title={chapter.title}
                text={chapter.text}
                target={rewriteTarget}
                canSelect={!chapterActionsLocked && !ended}
                onSelect={openRewrite}
                draft={writer.rewriteReady ? writer.preview : undefined}
                writer={writer}
                ended={ended}
                onClose={closeRewrite}
                onApply={() => {
                  const applied = writer.applyRewrite();
                  if (applied) setRewriteTarget(null);
                  return applied;
                }}
                onRewrite={(requirements) =>
                  writer.rewrite(chapter.id, requirements, rewriteTarget?.range)
                }
              />
            )}
          </section>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            填写创作要求，开始生成第一章。
          </p>
        )}
      </div>
    </div>
  );
}
