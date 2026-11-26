"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { History } from "lucide-react";
import { useState } from "react";
import { NovelComposerThinking } from "./novel-tool-trace";
import {
  type ThinkingHistoryEntry,
  thinkingHistoryPhase,
  thinkingHistoryQuestion,
} from "./thinking-history";

function formatTime(value: number) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  } catch {
    return new Date(value).toLocaleString();
  }
}

function statusLabel(status: ThinkingHistoryEntry["status"]) {
  if (status === "completed") return "完成";
  if (status === "cancelled") return "已停止";
  return "失败";
}

export function NovelThinkingHistoryButton({
  entries,
  onClear,
  className,
}: {
  entries: ThinkingHistoryEntry[];
  onClear?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1.5 px-2 text-muted-foreground", className)}
        >
          <History className="size-3.5" />
          历史
          {entries.length ? (
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-foreground">
              {entries.length}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(80dvh,40rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border pr-12 text-left">
          <DialogTitle>构思历史</DialogTitle>
          <DialogDescription>
            记录每次问答的写作要求与技法摘要，不含章节正文。刷新后仍可查看。
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {entries.length ? `共 ${entries.length} 条` : "暂无记录"}
          </p>
          {entries.length && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                if (window.confirm("清空本小说的全部构思历史？")) onClear();
              }}
            >
              清空
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {entries.length ? (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => {
                const question = thinkingHistoryQuestion(entry);
                const hasProse =
                  entry.status === "completed" ||
                  entry.phase === "writing" ||
                  Boolean(entry.answer?.includes("撰写"));
                return (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {entry.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(entry.createdAt)} ·{" "}
                        {statusLabel(entry.status)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 text-sm">
                      <p>
                        <span className="mr-2 text-xs font-medium text-muted-foreground">
                          问
                        </span>
                        <span className="text-foreground">
                          {question || "（未填写写作要求）"}
                        </span>
                      </p>
                      <p>
                        <span className="mr-2 text-xs font-medium text-muted-foreground">
                          答
                        </span>
                        <span className="text-foreground">
                          {entry.answer?.trim() ||
                            (entry.tools.length
                              ? "已记录技法挂载"
                              : "无技法摘要")}
                        </span>
                      </p>
                    </div>
                    {entry.error ? (
                      <p className="text-xs text-destructive">{entry.error}</p>
                    ) : null}
                    <NovelComposerThinking
                      active={false}
                      label="步骤"
                      tools={entry.tools}
                      phase={thinkingHistoryPhase(entry)}
                      hasProse={hasProse}
                      compact
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              续写或润色后，问答与技法步骤会留在这里。
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
