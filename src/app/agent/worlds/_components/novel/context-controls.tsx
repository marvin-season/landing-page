"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Progress,
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
  chapterCount,
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
  chapterCount: number;
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
    () => chapterPrompt(config, novel, chapterCount).length,
    [config, novel, chapterCount],
  );
  const checkpointCount = novelCheckpointCount(novel, chapterCount);
  const forkBaseLength = useMemo(
    () =>
      open && chapterCount < novel.chapters.length
        ? chapterPrompt(config, novel).length
        : length,
    [config, novel, open, chapterCount, length],
  );
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
  const fits = fork !== null && forkFitsBudget(fork.length, forkBaseLength);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setEdited(null);
        setError("");
        writer.clearFork();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={disabled || !novel.chapters.length}
        >
          <GitFork data-icon="inline-start" />
          上下文
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0">
        <DialogHeader className="shrink-0 border-b border-border pr-12">
          <DialogTitle>续写上下文</DialogTitle>
          <DialogDescription>
            新会话 · 保留全部正文 · 压缩前 {forkChapterCount(novel)} 章
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs tabular-nums text-muted-foreground">
              从当前章续写 · {number.format(length)} /{" "}
              {number.format(maxNovelPromptLength)} 字符
              {checkpointCount ? ` · 前 ${checkpointCount} 章使用摘要` : ""}
            </p>
            <Progress
              aria-label="续写请求字符占用"
              value={Math.min(100, (length / maxNovelPromptLength) * 100)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              书末续写 · {number.format(forkBaseLength)} →{" "}
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
        <DialogFooter className="shrink-0 border-t border-border sm:flex-row sm:justify-end">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
