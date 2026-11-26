"use client";

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@landing-page/design-system";
import { History } from "lucide-react";
import { useState } from "react";
import { NovelComposerThinking } from "./novel-tool-trace";
import {
  type ThinkingHistoryEntry,
  thinkingHistoryPhase,
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
}: {
  entries: ThinkingHistoryEntry[];
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-muted-foreground"
        >
          <History className="size-3.5" />
          历史
          {entries.length ? (
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-foreground">
              {entries.length}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] gap-0 p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <SheetTitle>构思历史</SheetTitle>
          <SheetDescription>
            仅保存技法挂载与步骤时间线，不含章节正文。刷新后仍可查看。
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
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
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(entry.createdAt)} ·{" "}
                      {statusLabel(entry.status)}
                    </p>
                  </div>
                  {entry.requirements?.trim() ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      要求：{entry.requirements.trim()}
                    </p>
                  ) : null}
                  {entry.error ? (
                    <p className="text-xs text-destructive">{entry.error}</p>
                  ) : null}
                  <NovelComposerThinking
                    active={false}
                    label="构思过程"
                    tools={entry.tools}
                    phase={thinkingHistoryPhase(entry)}
                    compact
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              续写或润色后，技法与步骤会留在这里。
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
