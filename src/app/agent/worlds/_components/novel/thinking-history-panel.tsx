"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
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
import {
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  LoaderCircle,
} from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const dayFormat = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" });
const timeFormat = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function statusLabel(status: HistorySummary["status"], incomplete?: boolean) {
  if (status === "running") return "进行中";
  if (status === "completed") return incomplete ? "未写完" : "完成";
  if (status === "cancelled") return "已停止";
  return "失败";
}

function HistoryRow({
  entry,
  pending,
  disabled,
  onOpen,
  onReuse,
}: {
  entry: HistorySummary | ThinkingHistoryEntry;
  pending: boolean;
  disabled: boolean;
  onOpen: (entry: HistorySummary) => void;
  onReuse: (text: string) => void;
}) {
  const saved = "hasResult" in entry ? entry : undefined;
  const question =
    "hasResult" in entry
      ? (entry.question?.trim() ?? "")
      : thinkingHistoryQuestion(entry);
  const hasProse =
    entry.status === "completed" ||
    entry.phase === "writing" ||
    Boolean(entry.answer?.includes("撰写"));

  const resultButton =
    saved?.hasResult && saved.status !== "running" ? (
      <Button
        type="button"
        size="sm"
        variant="soft"
        className="mr-2 shrink-0"
        disabled={disabled}
        onClick={() => onOpen(saved)}
      >
        {pending ? (
          <LoaderCircle
            data-icon="inline-start"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        查看结果
      </Button>
    ) : null;

  if (saved?.kind === "chapter-save") {
    return (
      <div className="flex items-center justify-between gap-1 rounded-lg hover:bg-muted/40">
        <div className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 py-3">
          <p className="wrap-anywhere text-sm font-medium">{entry.label}</p>
          <time className="text-xs text-muted-foreground tabular-nums">
            {timeFormat.format(entry.createdAt)}
          </time>
        </div>
        {resultButton}
      </div>
    );
  }

  return (
    <Collapsible>
      <div className="flex items-center gap-1 rounded-lg hover:bg-muted/40">
        <CollapsibleTrigger
          type="button"
          variant="flush"
          className="min-w-0 flex-1 gap-3 rounded-lg px-2.5 py-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <CollapsibleTitle className="max-w-full flex-none wrap-anywhere">
                {entry.label}
              </CollapsibleTitle>
              <span
                className={cn(
                  "shrink-0 text-xs font-normal text-muted-foreground",
                  entry.status === "failed" && "text-destructive",
                  entry.status === "running" && "text-primary",
                )}
              >
                {statusLabel(entry.status, saved?.incomplete)}
              </span>
            </div>
            <div className="flex min-w-0 items-baseline gap-2 text-xs font-normal text-muted-foreground">
              <time className="shrink-0 tabular-nums">
                {timeFormat.format(entry.createdAt)}
              </time>
              <span className="truncate">{question || "未填写写作要求"}</span>
            </div>
          </div>
          <CollapsibleChevron />
        </CollapsibleTrigger>
        {resultButton}
      </div>
      <CollapsibleContent>
        <div className="mx-2 mb-3 flex flex-col gap-3 rounded-lg bg-muted/35 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs text-muted-foreground">写作要求</p>
              <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">
                {question || "未填写写作要求"}
              </p>
            </div>
            {question ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onReuse(question)}
              >
                填入
              </Button>
            ) : null}
          </div>
          {entry.answer?.trim() ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {entry.answer}
            </p>
          ) : null}
          {entry.error ? (
            <p className="text-xs text-destructive">{entry.error}</p>
          ) : null}
          <NovelComposerThinking
            active={false}
            defaultOpen={false}
            label="构思步骤"
            tools={entry.tools}
            phase={
              entry.status === "running"
                ? (entry.phase ?? "preparing")
                : thinkingHistoryPhase({ ...entry, status: entry.status })
            }
            hasProse={hasProse}
            compact
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
  const [request, setRequest] = useState<
    { kind: "result"; id: string } | { kind: "export" }
  >();
  const requesting = Boolean(request);
  const [error, setError] = useState("");
  const entries = page?.next
    ? page.entries
    : [...(page?.entries ?? []), ...legacy];
  const onClear = onClearProp ?? shared?.clear;
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const previousScroll = useRef(0);
  const reusePrompt = useReusePrompt();
  useEffect(() => {
    if (!open || !roomKey) return;
    const subscription = observeNovelHistory(roomKey, cursor).subscribe({
      next: setPage,
      error: () => setError("无法读取本机历史。"),
    });
    return () => subscription.unsubscribe();
  }, [cursor, open, roomKey]);

  useLayoutEffect(() => {
    if (open && !detail && viewport.current)
      viewport.current.scrollTop = previousScroll.current;
  }, [detail, open]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      previousScroll.current = 0;
      setBlocked(false);
      setPages([]);
      setPage(undefined);
      setDetail(undefined);
      setError("");
    }
  }

  async function openDetail(entry: HistorySummary) {
    if (!roomKey || requesting) return;
    setRequest({ kind: "result", id: entry.id });
    setError("");
    try {
      const content = await readNovelHistory(roomKey, entry.id);
      if (!content) throw new Error();
      previousScroll.current = viewport.current?.scrollTop ?? 0;
      setDetail({ entry, content });
    } catch {
      setError("无法读取本轮结果。");
    } finally {
      setRequest(undefined);
    }
  }

  async function downloadHistory() {
    if (!roomKey || requesting) return;
    setRequest({ kind: "export" });
    setError("");
    try {
      const archive = await exportNovelHistory(roomKey, legacy);
      downloadText("小说创作历史.json", archive);
    } catch {
      setError("历史导出失败，请重试。");
    } finally {
      setRequest(undefined);
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
          "flex max-h-[min(85dvh,44rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0",
          detail && "h-[min(90dvh,52rem)] max-h-[min(90dvh,52rem)] max-w-6xl",
        )}
      >
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
            <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b border-border px-4 pr-12 text-left sm:px-6 sm:pr-14">
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>创作历史</DialogTitle>
                <DialogDescription className="sr-only">
                  回看写作要求与生成结果
                </DialogDescription>
              </div>
              {roomKey && entries.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  disabled={requesting}
                  onClick={() => void downloadHistory()}
                >
                  {request?.kind === "export" ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <Download data-icon="inline-start" />
                  )}
                  导出历史
                </Button>
              ) : null}
            </DialogHeader>

            <div
              ref={viewport}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-5"
            >
              {error || workspace?.error ? (
                <Alert className="my-2 px-3 py-2">
                  <AlertDescription className="text-destructive">
                    {error || workspace?.error}
                  </AlertDescription>
                </Alert>
              ) : null}
              {blocked ? (
                <p
                  role="status"
                  className="px-2 py-2 text-xs text-muted-foreground"
                >
                  当前无法填入。正在生成、导入，或故事已结束时请稍后再试。
                </p>
              ) : null}
              {roomKey && !page && !error ? (
                <p
                  role="status"
                  className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
                >
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                  正在读取历史…
                </p>
              ) : entries.length ? (
                <ul className="flex flex-col">
                  {entries.map((entry, index) => {
                    const day = dayFormat.format(entry.createdAt);
                    const previous = entries[index - 1];
                    return (
                      <Fragment key={entry.id}>
                        {!previous ||
                        dayFormat.format(previous.createdAt) !== day ? (
                          <li className="border-b border-border/70 px-2.5 pt-3 pb-1.5 text-xs font-medium text-muted-foreground">
                            {day}
                          </li>
                        ) : null}
                        <li>
                          <HistoryRow
                            entry={entry}
                            disabled={requesting}
                            pending={
                              request?.kind === "result" &&
                              request.id === entry.id
                            }
                            onOpen={(saved) => void openDetail(saved)}
                            onReuse={(text) => {
                              if (reusePrompt(text)) changeOpen(false);
                              else setBlocked(true);
                            }}
                          />
                        </li>
                      </Fragment>
                    );
                  })}
                </ul>
              ) : !error ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <History className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">还没有创作记录</p>
                  <p className="text-xs text-muted-foreground">
                    续写、润色或剧情整理后，结果会保存在这里。
                  </p>
                </div>
              ) : null}
            </div>

            {pages.length || page?.next || (legacy.length && onClear) ? (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2 sm:px-6">
                <div>
                  {legacy.length && onClear && !page?.next ? (
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      className="px-0"
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
                {pages.length || page?.next ? (
                  <nav
                    aria-label="创作历史分页"
                    className="flex items-center gap-1"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="上一页"
                      title="上一页"
                      disabled={!pages.length || requesting}
                      onClick={() => {
                        setPage(undefined);
                        setPages((value) => value.slice(0, -1));
                      }}
                    >
                      <ChevronLeft />
                    </Button>
                    <span className="px-1 text-xs text-muted-foreground tabular-nums">
                      第 {pages.length + 1} 页
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="下一页"
                      title="下一页"
                      disabled={!page?.next || requesting}
                      onClick={() => {
                        if (!page?.next) return;
                        const next = page.next;
                        setPage(undefined);
                        setPages((value) => [...value, next]);
                      }}
                    >
                      <ChevronRight />
                    </Button>
                  </nav>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
