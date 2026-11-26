"use client";

import {
  Button,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleDescription,
  CollapsibleTitle,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadText } from "@/lib/group-chat/client";
import { useReusePrompt } from "./chapter-prompt-reuse";
import { NovelHistoryDetail } from "./novel-history-detail";
import {
  exportNovelHistory,
  type HistoryContent,
  type HistoryCursor,
  type HistorySummary,
  observeNovelHistory,
  readNovelHistory,
} from "./novel-history-store";
import { NovelComposerThinking } from "./novel-tool-trace";
import {
  type ThinkingHistoryEntry,
  thinkingHistoryPhase,
  thinkingHistoryQuestion,
} from "./thinking-history";
import { useThinkingHistory } from "./thinking-history-context";

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

function statusLabel(status: HistorySummary["status"]) {
  if (status === "running") return "进行中";
  if (status === "completed") return "完成";
  if (status === "cancelled") return "已停止";
  return "失败";
}

export function NovelThinkingHistoryButton({
  entries: entriesProp,
  onClear: onClearProp,
  className,
}: {
  entries?: ThinkingHistoryEntry[];
  onClear?: () => void;
  className?: string;
} = {}) {
  const shared = useThinkingHistory();
  const legacy = entriesProp ?? shared?.entries ?? [];
  const workspace = shared?.workspace;
  const roomKey = workspace?.roomKey;
  const [pages, setPages] = useState<HistoryCursor[]>([]);
  const cursor = pages.at(-1);
  const [page, setPage] = useState<{
    entries: HistorySummary[];
    next?: HistoryCursor;
  }>();
  const [detail, setDetail] = useState<{
    entry: HistorySummary;
    content: HistoryContent;
  }>();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const entries = page?.next
    ? page.entries
    : [...(page?.entries ?? []), ...legacy];
  const onClear = onClearProp ?? shared?.clear;
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const reusePrompt = useReusePrompt();
  useEffect(() => {
    if (!open || !roomKey) return;
    const subscription = observeNovelHistory(roomKey, cursor).subscribe({
      next: setPage,
      error: () => setError("无法读取本机历史。"),
    });
    return () => subscription.unsubscribe();
  }, [cursor, open, roomKey]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setBlocked(false);
      setPages([]);
      setPage(undefined);
      setDetail(undefined);
      setError("");
    }
  }

  async function openDetail(entry: HistorySummary) {
    if (!roomKey || requesting) return;
    setRequesting(true);
    setError("");
    try {
      const content = await readNovelHistory(roomKey, entry.id);
      if (!content) throw new Error();
      setDetail({ entry, content });
    } catch {
      setError("无法读取本轮结果。");
    } finally {
      setRequesting(false);
    }
  }

  async function downloadHistory() {
    if (!roomKey || requesting) return;
    setRequesting(true);
    setError("");
    try {
      const archive = await exportNovelHistory(roomKey, legacy);
      downloadText("小说创作历史.json", archive);
    } catch {
      setError("历史导出失败，请重试。");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next || !requesting) changeOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="创作历史"
          title="创作历史"
          className={cn(className)}
        >
          <History data-icon="inline-start" />
          <span className="hidden sm:inline">创作历史</span>
          {legacy.length && !roomKey ? (
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-foreground">
              {legacy.length}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(80dvh,40rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0",
          detail && "h-[min(85dvh,48rem)] max-h-[min(85dvh,48rem)] max-w-5xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border pr-12 text-left">
          <DialogTitle>创作历史</DialogTitle>
          <DialogDescription>
            {detail
              ? "核对正文差异后，可以把这份结果打开为草稿。"
              : "回看写作要求、生成结果和技法步骤。"}
          </DialogDescription>
        </DialogHeader>
        {workspace && detail ? (
          <NovelHistoryDetail
            key={detail.entry.id}
            workspace={workspace}
            entry={detail.entry}
            content={detail.content}
            onBack={() => setDetail(undefined)}
            onStaged={() => changeOpen(false)}
          />
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {roomKey && !page && !error
                  ? "正在读取…"
                  : entries.length
                    ? `第 ${pages.length + 1} 页`
                    : "暂无记录"}
              </p>
              <div className="flex items-center gap-2">
                {roomKey && entries.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={requesting}
                    onClick={() => void downloadHistory()}
                  >
                    导出历史
                  </Button>
                ) : null}
                {legacy.length && onClear && !page?.next ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      if (
                        window.confirm(
                          "清空旧版技法摘要？新记录的问答和结果会保留。",
                        )
                      )
                        onClear();
                    }}
                  >
                    清空旧摘要
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {error || workspace?.error ? (
                <p role="alert" className="mb-2 text-sm text-destructive">
                  {error || workspace?.error}
                </p>
              ) : null}
              {blocked ? (
                <p role="status" className="mb-2 text-xs text-muted-foreground">
                  当前无法填入。正在生成、导入，或故事已结束时请稍后再试。
                </p>
              ) : null}
              {entries.length ? (
                <ul className="flex flex-col gap-2">
                  {entries.map((entry) => {
                    const saved = "hasResult" in entry ? entry : undefined;
                    const question = saved
                      ? (saved.question?.trim() ?? "")
                      : thinkingHistoryQuestion(entry as ThinkingHistoryEntry);
                    const hasProse =
                      entry.status === "completed" ||
                      entry.phase === "writing" ||
                      Boolean(entry.answer?.includes("撰写"));
                    const questionPreview =
                      question.trim() || "（未填写写作要求）";
                    return (
                      <li key={entry.id}>
                        <Collapsible defaultOpen={false}>
                          <CollapsibleTrigger
                            type="button"
                            variant="default"
                            className="min-h-0 flex-col items-stretch gap-1 rounded-lg border border-border/70 bg-transparent px-3 py-2.5 hover:bg-muted/40 data-[state=open]:rounded-b-none data-[state=open]:border-b-transparent data-[state=open]:bg-muted/30"
                          >
                            <div className="flex w-full items-center gap-2">
                              <CollapsibleTitle>{entry.label}</CollapsibleTitle>
                              <CollapsibleDescription className="shrink-0">
                                {formatTime(entry.createdAt)} ·{" "}
                                {statusLabel(entry.status)}
                                {saved?.incomplete && saved.status !== "running"
                                  ? " · 未写完"
                                  : ""}
                              </CollapsibleDescription>
                              <CollapsibleChevron />
                            </div>
                            <p className="truncate pr-6 text-left text-xs font-normal text-muted-foreground">
                              {questionPreview}
                            </p>
                          </CollapsibleTrigger>
                          <CollapsibleContent variant="collapse">
                            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-border/70 px-3 py-2.5">
                              <div className="flex flex-col gap-1.5 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="min-w-0 flex-1">
                                    <span className="mr-2 text-xs font-medium text-muted-foreground">
                                      问
                                    </span>
                                    <span className="text-foreground">
                                      {question || "（未填写写作要求）"}
                                    </span>
                                  </p>
                                  {question ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 shrink-0 px-2 text-xs"
                                      onClick={() => {
                                        if (!reusePrompt(question)) {
                                          setBlocked(true);
                                          return;
                                        }
                                        changeOpen(false);
                                      }}
                                    >
                                      填入
                                    </Button>
                                  ) : null}
                                </div>
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
                                <p className="text-xs text-destructive">
                                  {entry.error}
                                </p>
                              ) : null}
                              {saved?.hasResult &&
                              saved.status !== "running" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="self-start"
                                  disabled={requesting}
                                  onClick={() => void openDetail(saved)}
                                >
                                  查看结果
                                </Button>
                              ) : null}
                              <NovelComposerThinking
                                active={false}
                                defaultOpen={false}
                                label="步骤"
                                tools={entry.tools}
                                phase={
                                  entry.status === "running"
                                    ? (entry.phase ?? "preparing")
                                    : thinkingHistoryPhase({
                                        ...entry,
                                        status: entry.status,
                                      })
                                }
                                hasProse={hasProse}
                                compact
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  续写、润色或剧情整理后，问答和结果会留在这里。
                </p>
              )}
            </div>
            {pages.length || page?.next ? (
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-4 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pages.length}
                  onClick={() => {
                    setPage(undefined);
                    setPages((value) => value.slice(0, -1));
                  }}
                >
                  上一页
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!page?.next}
                  onClick={() => {
                    if (page?.next) {
                      const next = page.next;
                      setPage(undefined);
                      setPages((value) => [...value, next]);
                    }
                  }}
                >
                  下一页
                </Button>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
