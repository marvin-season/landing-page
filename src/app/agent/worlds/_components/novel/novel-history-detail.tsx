"use client";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@landing-page/design-system";
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
  const [view, setView] = useState<"current" | "original" | "raw">(
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onBack}
          disabled={working}
        >
          返回列表
        </Button>
        <span className="mr-auto text-sm font-medium">{entry.label}</span>
        {hasProse ? (
          <>
            <Button
              type="button"
              size="sm"
              variant={view === "current" ? "soft" : "ghost"}
              onClick={() => changeView("current")}
            >
              当前正文对比
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "original" ? "soft" : "ghost"}
              onClick={() => changeView("original")}
            >
              查看当时改动
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={view === "raw" ? "soft" : "ghost"}
          onClick={() => changeView("raw")}
        >
          生成结果
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
        {view === "raw" ? (
          <pre className="min-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
            {content.raw || "这轮尚未收到结果。"}
          </pre>
        ) : (
          <>
            {view === "current" && !automatic ? (
              <p className="text-sm text-muted-foreground">
                原位置无法安全匹配，或当前正文与历史修改冲突。可查看当时改动，或指定应用位置。
              </p>
            ) : null}
            {view === "current" && hasProse ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {automatic ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={manual ? "outline" : "soft"}
                    onClick={() => {
                      setManual(undefined);
                      setPart(0);
                    }}
                  >
                    原位置
                  </Button>
                ) : null}
                {book.chapters.length ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant={manual === "passage" ? "soft" : "outline"}
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
              <div className="shrink-0 space-y-2">
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
                        {originalResults.map((chapter, i) => (
                          <SelectItem key={chapter.id} value={String(i)}>
                            {chapter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                {target && manual === "passage" ? (
                  <Textarea
                    aria-label="在当前正文中选中要替换的文字"
                    className="h-28 resize-none"
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
                base={base}
                draft={draft}
                baseLabel={view === "current" ? "当前正文" : "当时原文"}
                draftLabel={
                  view === "current" && plan ? "应用预览" : "当时结果"
                }
              />
            ) : null}
          </>
        )}
        {error ? (
          <p role="alert" className="shrink-0 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {view === "current" && plan ? (
          <div className="flex shrink-0 items-center justify-end gap-3 pb-1">
            {noChange || tooLong ? (
              <span className="text-xs text-muted-foreground">
                {noChange ? "当前正文已是这个结果" : "草稿超过章节字数限制"}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={
                working || noChange || tooLong || entry.status === "running"
              }
              onClick={() => void stage()}
            >
              {working ? "正在打开…" : "应用为草稿"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
