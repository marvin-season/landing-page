"use client";

import { Alert, AlertDescription, Button } from "@landing-page/design-system";
import {
  Download,
  LoaderCircle,
  PenLine,
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
import { type ChapterTextRange, chapterSelection, exportNovel } from "./model";
import { useNovel } from "./use-novel";

export function NovelPanel({
  room,
  onBusyChange,
}: {
  room: WorldRoom;
  onBusyChange: (busy: boolean) => void;
}) {
  const writer = useNovel(room, onBusyChange, downloadBackground);
  const { novel } = writer;
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<ChapterTextRange | null>(null);
  const [rewriteTarget, setRewriteTarget] = useState<{
    range?: ChapterTextRange;
  } | null>(null);
  const [rewriteRequirements, setRewriteRequirements] = useState("");
  const chapter =
    novel.chapters.find((item) => item.id === selected) ??
    novel.chapters.at(-1);
  const disabled = !writer.ready || writer.busy;
  const rewritePreview = writer.task === "rewrite" ? writer.preview : "";
  const ended = room.status === "ended";
  const rewriting = rewriteTarget !== null;
  const rewriteRange = rewriteTarget?.range;
  function openRewrite(range?: ChapterTextRange) {
    writer.discardRewrite();
    setSelection(null);
    setEditing(false);
    setRewriteRequirements("");
    setRewriteTarget({ range });
  }
  function closeRewrite() {
    setRewriteTarget(null);
    setEditing(Boolean(rewriteRange));
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
          disabled={disabled || rewriting}
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
          disabled={disabled || rewriting}
          canSummarize={
            !ended && novel.chapters.length > 0 && Boolean(novel.title.trim())
          }
          onImport={writer.importBackground}
          onSummarize={() => {
            setEditing(false);
            writer.generate("summary");
          }}
        />
        {!rewriting && writer.error ? (
          <Alert>
            <AlertDescription>{writer.error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {writer.busy && writer.task !== "rewrite" ? (
            <Button variant="outline" onClick={writer.stop}>
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : (
            <Button
              disabled={
                disabled ||
                rewriting ||
                ended ||
                !novel.title.trim() ||
                !/^\d+$/.test(novel.words) ||
                Number(novel.words) < 500 ||
                Number(novel.words) > 4000
              }
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
          {writer.busy && writer.task !== "rewrite" ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {writer.task === "summary"
                ? "正在总结剧情背景…"
                : `正在创作第${novel.chapters.length + 1}章…`}
            </span>
          ) : null}
        </div>
        {writer.task !== "rewrite" && writer.preview ? (
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
                  disabled={rewriting}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    setEditing(false);
                    setSelection(null);
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
                  disabled={disabled || rewriting}
                  onClick={() => {
                    setSelection(null);
                    setEditing(!editing);
                  }}
                >
                  {editing ? "完成编辑" : "编辑本章"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    disabled || rewriting || ended || !chapter.text.trim()
                  }
                  onClick={() => openRewrite()}
                >
                  <WandSparkles data-icon="inline-start" />
                  润色重写
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || rewriting}
                  onClick={deleteChapter}
                >
                  <Trash2 data-icon="inline-start" />
                  删除本章
                </Button>
              </div>
            </div>
            {rewriteTarget ? (
              <div className="flex flex-col gap-4 border-b border-border pb-5">
                {rewriteRange ? (
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="text-sm font-medium">选段原文</h3>
                    <blockquote className="max-h-48 overflow-y-auto whitespace-pre-wrap wrap-break-word border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground">
                      {chapter.text.slice(rewriteRange.start, rewriteRange.end)}
                    </blockquote>
                  </div>
                ) : null}
                <fieldset disabled={disabled || ended} className="min-w-0">
                  <TextField
                    label="重写要求（可选）"
                    value={rewriteRequirements}
                    onChange={setRewriteRequirements}
                    maxLength={4000}
                    multiline
                  />
                </fieldset>
                {writer.error ? (
                  <Alert>
                    <AlertDescription>{writer.error}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {writer.busy ? (
                    <Button size="sm" variant="outline" onClick={writer.stop}>
                      <Square data-icon="inline-start" />
                      停止重写
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={disabled || ended}
                      onClick={() =>
                        writer.rewrite(
                          chapter.id,
                          rewriteRequirements,
                          rewriteRange,
                        )
                      }
                    >
                      <WandSparkles data-icon="inline-start" />
                      {rewritePreview ? "重新生成草稿" : "生成重写草稿"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={writer.busy}
                    onClick={() => {
                      writer.discardRewrite();
                      closeRewrite();
                    }}
                  >
                    {rewritePreview ? "放弃草稿" : "取消重写"}
                  </Button>
                </div>
                {writer.busy || rewritePreview ? (
                  <article className="flex min-w-0 flex-col gap-4 border-l-2 border-primary pl-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      {writer.busy ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      {writer.busy
                        ? rewriteRange
                          ? "正在润色选段…"
                          : "正在重写本章…"
                        : writer.rewriteReady
                          ? "重写草稿"
                          : "未完成草稿"}
                    </h3>
                    {rewritePreview ? (
                      <UnifiedMarkdown
                        content={rewritePreview}
                        hasNextChunk={writer.busy}
                      />
                    ) : null}
                    {writer.rewriteReady ? (
                      <Button
                        size="sm"
                        className="self-start"
                        disabled={disabled || ended}
                        onClick={() => {
                          if (writer.applyRewrite()) closeRewrite();
                        }}
                      >
                        {rewriteRange
                          ? "采用草稿并替换选段"
                          : "采用草稿并替换本章"}
                      </Button>
                    ) : null}
                  </article>
                ) : null}
              </div>
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
                      setSelection(null);
                      writer.update({
                        ...novel,
                        chapters: novel.chapters.map((item) =>
                          item.id === chapter.id ? { ...item, text } : item,
                        ),
                      });
                    }}
                    onTextSelect={(start, end) =>
                      setSelection(chapterSelection(chapter.text, start, end))
                    }
                    hint="修改后的正文将用于下一章创作与整本导出。"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    disabled={!selection || ended}
                    onClick={() => {
                      if (selection) openRewrite(selection);
                    }}
                  >
                    <WandSparkles data-icon="inline-start" />
                    润色选段
                  </Button>
                </FieldGroup>
              </fieldset>
            ) : (
              <article className="flex flex-col gap-4 pb-8">
                <h3 className="font-serif text-xl">{chapter.title}</h3>
                <UnifiedMarkdown content={chapter.text} />
              </article>
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
