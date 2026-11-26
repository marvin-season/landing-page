"use client";

import {
  Alert,
  AlertDescription,
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@landing-page/design-system";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ChapterDiffView } from "./chapter-diff-view";
import { type ChapterTextRange, replaceTextRange } from "./chapter-text";
import { type Chapter, chapterTitle, maxChapterLength } from "./model";
import {
  historyDraftPlan,
  historyInsertPlan,
  prepareHistoryPlan,
} from "./novel-history-apply";
import type { HistoryContent, HistorySummary } from "./novel-history-store";
import type { NovelHistoryWorkspace } from "./thinking-history-context";

const blankChapter: Chapter = { id: "", title: "", text: "" };
const startPosition = "history-first";
const historyViews = [
  { value: "current", label: "当前正文对比" },
  { value: "original", label: "当时改动" },
  { value: "raw", label: "生成结果" },
] as const;

function historicalChapters({
  operation,
  sources,
  results,
  raw,
}: HistoryContent) {
  if (results?.length) return results;
  if (operation.kind === "continuation")
    return [{ ...operation.chapter, text: raw.trim() }];
  if (operation.kind === "rewrite" && sources[0])
    return [
      {
        ...sources[0],
        text: replaceTextRange(sources[0].text, raw.trim(), operation.range),
      },
    ];
  return [];
}

export function NovelHistoryDetail({
  workspace,
  entry,
  content,
  onBack,
  onStaged,
}: {
  workspace: NovelHistoryWorkspace;
  entry: HistorySummary;
  content: HistoryContent;
  onBack: () => void;
  onStaged: () => void;
}) {
  const { book, lineage } = workspace;
  const [view, setView] = useState<"current" | "original" | "raw">(() =>
    historicalChapters(content).length ? "current" : "raw",
  );
  const [part, setPart] = useState(0);
  const [resultPart, setResultPart] = useState(0);
  const [manual, setManual] = useState<"whole" | "passage" | "insert">();
  const [targetId, setTargetId] = useState("");
  const [selection, setSelection] = useState<{
    chapter: Chapter;
    range: ChapterTextRange;
  }>();
  const [showPositions, setShowPositions] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const automatic = useMemo(
    () => prepareHistoryPlan(book, content, lineage),
    [book, content, lineage],
  );
  const originalResults = useMemo(() => historicalChapters(content), [content]);
  const hasProse = originalResults.length > 0;
  const targetIndex = book.chapters.findIndex(({ id }) => id === targetId);
  const target = book.chapters[targetIndex];
  const range = selection?.chapter === target ? selection?.range : undefined;
  const selectedResult = originalResults[resultPart];
  const passageResult =
    content.operation.kind === "rewrite" && content.operation.range
      ? content.raw.trim()
      : selectedResult?.text;
  const manualText = manual === "whole" ? selectedResult?.text : passageResult;
  const manualPlan = useMemo(() => {
    if (!manual || !manualText) return undefined;
    if (manual === "insert") {
      if (!targetId || (targetId !== startPosition && !target))
        return undefined;
      const index = targetIndex + 1;
      return historyInsertPlan(
        {
          id: crypto.randomUUID(),
          title: chapterTitle(index),
          text: manualText,
        },
        index,
      );
    }
    if (!target || (manual === "passage" && !range)) return undefined;
    return historyDraftPlan(
      target,
      targetIndex,
      manualText,
      manual === "passage" ? range : undefined,
    );
  }, [manual, manualText, range, target, targetId, targetIndex]);
  const plan = manual ? manualPlan : automatic;
  const comparisonTarget =
    target ??
    book.chapters.find(
      ({ id }) =>
        content.sources.some((source) => source.id === id) ||
        originalResults.some((result) => result.id === id),
    );
  const readOnlyCurrent =
    view === "current" && !plan && comparisonTarget && selectedResult;
  const before =
    view === "original"
      ? content.sources
      : (plan?.before ?? (readOnlyCurrent ? [comparisonTarget] : []));
  const after =
    view === "original"
      ? originalResults
      : (plan?.after ?? (readOnlyCurrent ? [selectedResult] : []));
  const parts = Math.max(before.length, after.length);
  const index = Math.min(part, Math.max(0, parts - 1));
  const base = before[index] ?? blankChapter;
  const draft = after[index] ?? blankChapter;
  const noChange =
    plan?.before.length === plan?.after.length &&
    plan?.before.every(
      (chapter, i) =>
        chapter.id === plan.after[i].id && chapter.text === plan.after[i].text,
    );
  const adjustingPosition = !automatic || showPositions;
  const tooLong =
    plan?.after.some(({ text }) => text.length > maxChapterLength) &&
    plan.plotMode !== "split";

  function changeView(value: typeof view) {
    setView(value);
    setPart(0);
    setError("");
  }

  async function stage() {
    if (!plan || working) return;
    setWorking(true);
    setError("");
    try {
      await workspace.stage(book, plan, entry.question ?? "");
      onStaged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法打开历史草稿。");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0 flex-row items-center gap-2 border-b border-border px-3 pr-12 text-left sm:gap-3 sm:px-6 sm:pr-14">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          onClick={onBack}
          disabled={working}
          aria-label="返回创作历史"
          title="返回创作历史"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <DialogTitle className="truncate" title={entry.label}>
            {entry.label}
          </DialogTitle>
          <DialogDescription className="sr-only">
            创作历史结果
          </DialogDescription>
        </div>
      </DialogHeader>

      {hasProse ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-2 sm:px-6">
          <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-muted/60 p-0.5">
            {historyViews.map(({ value, label }) => (
              <Button
                type="button"
                size="sm"
                key={value}
                variant={view === value ? "soft" : "ghost"}
                className="px-2.5 sm:px-3"
                aria-pressed={view === value}
                onClick={() => changeView(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {view === "current" && automatic ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto shrink-0"
              aria-expanded={adjustingPosition}
              onClick={() => {
                if (showPositions) {
                  setManual(undefined);
                  setPart(0);
                }
                setShowPositions(!showPositions);
              }}
            >
              {showPositions ? "恢复原位置" : "更换应用位置"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
        {view === "raw" ? (
          <pre className="whitespace-pre-wrap wrap-anywhere rounded-lg border border-border bg-background/55 p-4 font-serif text-sm leading-7 sm:p-6 sm:text-base">
            {content.raw || "这轮尚未收到结果。"}
          </pre>
        ) : (
          <>
            {view === "current" && !automatic ? (
              <Alert className="shrink-0 px-3 py-2">
                <AlertDescription>
                  无法安全应用到原位置。请手动选择目标，或另存为新章。
                </AlertDescription>
              </Alert>
            ) : null}
            {view === "current" && adjustingPosition ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {book.chapters.length ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant={manual === "passage" ? "soft" : "outline"}
                      aria-pressed={manual === "passage"}
                      onClick={() => {
                        setManual("passage");
                        setPart(0);
                      }}
                    >
                      选段替换
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={manual === "whole" ? "soft" : "outline"}
                      aria-pressed={manual === "whole"}
                      onClick={() => {
                        setManual("whole");
                        setPart(0);
                      }}
                    >
                      选章替换
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={manual === "insert" ? "soft" : "outline"}
                  aria-pressed={manual === "insert"}
                  onClick={() => {
                    setManual("insert");
                    setPart(0);
                  }}
                >
                  另存为新章
                </Button>
              </div>
            ) : null}
            {view === "current" && manual ? (
              <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/25 p-3">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={targetId}
                    onValueChange={(id) => {
                      setTargetId(id);
                      setSelection(undefined);
                    }}
                  >
                    <SelectTrigger aria-label="应用位置">
                      <SelectValue
                        placeholder={
                          manual === "insert" ? "选择插入位置" : "选择目标章节"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {manual === "insert" ? (
                          <SelectItem value={startPosition}>
                            第一章之前
                          </SelectItem>
                        ) : null}
                        {book.chapters.map((chapter, i) => (
                          <SelectItem value={chapter.id} key={chapter.id}>
                            {i + 1}. {chapter.title}
                            {manual === "insert" ? " 之后" : ""}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {originalResults.length > 1 ? (
                    <Select
                      value={String(resultPart)}
                      onValueChange={(value) => setResultPart(Number(value))}
                    >
                      <SelectTrigger aria-label="历史结果">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {originalResults.map((chapter, i) => (
                            <SelectItem key={chapter.id} value={String(i)}>
                              {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                {target && manual === "passage" ? (
                  <Textarea
                    aria-label="在当前正文中选中要替换的文字"
                    className="h-28 resize-none font-serif leading-6"
                    value={target.text}
                    readOnly
                    onSelect={(event) => {
                      const { selectionStart: start, selectionEnd: end } =
                        event.currentTarget;
                      setSelection(
                        start === end
                          ? undefined
                          : { chapter: target, range: { start, end } },
                      );
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            {parts > 1 ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {Array.from({ length: parts }, (_, i) => (
                  <Button
                    type="button"
                    size="sm"
                    key={`${before[i]?.id ?? ""}:${after[i]?.id ?? ""}`}
                    variant={i === index ? "soft" : "ghost"}
                    aria-pressed={i === index}
                    onClick={() => setPart(i)}
                  >
                    {before[i]?.title || after[i]?.title}
                  </Button>
                ))}
              </div>
            ) : null}
            {view === "current" && plan && !plan.before.length ? (
              <p className="text-xs text-muted-foreground">
                {plan.index === 0
                  ? "插入到全书开头"
                  : `插入到「${book.chapters[plan.index - 1]?.title}」之后`}
              </p>
            ) : null}
            {parts ? (
              <ChapterDiffView
                key={`${view}:${index}`}
                base={base}
                draft={draft}
                layout="reading"
                baseLabel={view === "current" ? "当前正文" : "当时原文"}
                draftLabel={
                  view === "current" && plan ? "应用预览" : "当时结果"
                }
              />
            ) : null}
          </>
        )}
      </div>

      {view === "current" && (plan || error) ? (
        <DialogFooter className="shrink-0 flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <p
            role={error ? "alert" : undefined}
            className={
              error
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {error ||
              (noChange
                ? "当前正文已是这个结果"
                : tooLong
                  ? "草稿超过章节字数限制"
                  : "草稿保存后才会更新正文")}
          </p>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={
              !plan ||
              working ||
              noChange ||
              tooLong ||
              entry.status === "running"
            }
            onClick={() => void stage()}
          >
            {working ? (
              <LoaderCircle
                data-icon="inline-start"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {working ? "正在打开…" : "应用为草稿"}
          </Button>
        </DialogFooter>
      ) : null}
    </>
  );
}
