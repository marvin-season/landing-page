"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Progress,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@landing-page/design-system";
import { GitFork, LoaderCircle, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { WorldRoom } from "@/lib/group-chat/model";
import { TextField } from "../fields";
import {
  forkChapterCount,
  forkFitsBudget,
  forkSummaryPrompt,
  prepareNovelFork,
} from "./fork-model";
import {
  chapterPrompt,
  maxNovelPromptLength,
  maxNovelSummaryLength,
  novelCheckpointCount,
} from "./model";
import type { useNovel } from "./use-novel";

const number = new Intl.NumberFormat("zh-CN");

export function ContextControls({
  room,
  writer,
  disabled,
}: {
  room: WorldRoom;
  writer: Pick<
    ReturnType<typeof useNovel>,
    | "novel"
    | "busy"
    | "error"
    | "forkSummary"
    | "summarizeFork"
    | "createFork"
    | "clearFork"
    | "stop"
  >;
  disabled: boolean;
}) {
  const router = useRouter();
  const { novel } = writer;
  const config = room.config;
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const summary = edited ?? writer.forkSummary;
  const length = useMemo(
    () => chapterPrompt(config, novel).length,
    [config, novel],
  );
  const checkpointCount = novelCheckpointCount(novel);
  const canSummarize = useMemo(
    () =>
      open &&
      room.status !== "ended" &&
      forkSummaryPrompt(config, novel).length <= maxNovelPromptLength,
    [config, novel, open, room.status],
  );
  const fork = useMemo(
    () => (open ? prepareNovelFork(config, novel, summary) : null),
    [config, novel, open, summary],
  );
  const pending = writer.busy || creating;
  const fits = fork !== null && forkFitsBudget(fork.length, length);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setEdited(null);
        setError("");
        writer.clearFork();
      }}
    >
      <section className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">续写上下文</h3>
            <p className="text-xs tabular-nums text-muted-foreground">
              {number.format(length)} / {number.format(maxNovelPromptLength)}{" "}
              字符
              {checkpointCount ? ` · 前 ${checkpointCount} 章使用摘要` : ""}
            </p>
          </div>
          <SheetTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !novel.chapters.length}
            >
              <GitFork data-icon="inline-start" />
              创建续写分支
            </Button>
          </SheetTrigger>
        </div>
        <Progress
          aria-label="续写请求字符占用"
          value={Math.min(100, (length / maxNovelPromptLength) * 100)}
        />
      </section>
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>创建续写分支</SheetTitle>
          <SheetDescription>
            新会话 · 保留全部正文 · 压缩前 {forkChapterCount(novel)} 章
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {number.format(length)} →{" "}
              {fork ? number.format(fork.length) : "待计算"} 字符
            </span>
            {writer.busy ? (
              <Button size="sm" variant="outline" onClick={writer.stop}>
                <Square data-icon="inline-start" />
                停止总结
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={!canSummarize || creating}
                onClick={() => {
                  setEdited(null);
                  setError("");
                  writer.summarizeFork();
                }}
              >
                <Sparkles data-icon="inline-start" />
                自动总结
              </Button>
            )}
          </div>
          {writer.busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              正在整理剧情摘要…
            </p>
          ) : null}
          <fieldset disabled={pending}>
            <TextField
              label="剧情摘要"
              value={summary}
              onChange={(value) => {
                setEdited(value);
                setError("");
              }}
              maxLength={maxNovelSummaryLength}
              multiline
              hint={
                !canSummarize
                  ? "无法自动总结，可手动填写已覆盖章节的剧情与继承背景。"
                  : undefined
              }
            />
          </fieldset>
          {error || writer.error || (fork && !fits) ? (
            <Alert>
              <AlertDescription>
                {error ||
                  writer.error ||
                  "分支上下文仍超限或没有缩短，请精简摘要。"}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <SheetFooter className="shrink-0 border-t border-border sm:flex-row sm:justify-end">
          <Button
            disabled={!fits || pending}
            onClick={async () => {
              setCreating(true);
              setError("");
              try {
                const id = await writer.createFork(summary);
                router.push(`/agent/worlds/${id}`);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "无法创建续写分支。",
                );
                setCreating(false);
              }
            }}
          >
            {creating ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <GitFork data-icon="inline-start" />
            )}
            {creating ? "正在创建…" : "创建续写分支"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
