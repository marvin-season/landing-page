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
  Textarea,
} from "@landing-page/design-system";
import {
  Check,
  Combine,
  Link2,
  ListPlus,
  LoaderCircle,
  Square,
  WandSparkles,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import { type Chapter, maxChapterLength } from "./model";
import {
  type PlotMode,
  type PlotSelection,
  resolveChapterRange,
} from "./plot-edit";
import type { useNovel } from "./use-novel";

const options = [
  { value: "stitch", label: "剧情粘合", icon: Link2 },
  { value: "merge", label: "剧情合并", icon: Combine },
  { value: "insert", label: "剧情插入", icon: ListPlus },
] as const;

export function PlotSheet({
  chapters,
  hasPlotPair,
  open,
  onOpenChange,
  onCloseAutoFocus,
  writer,
  onApplied,
  restored,
}: {
  chapters: readonly Chapter[];
  hasPlotPair: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  writer: Pick<
    ReturnType<typeof useNovel>,
    | "editPlot"
    | "applyPlot"
    | "discardRewrite"
    | "plotDraft"
    | "busy"
    | "error"
    | "stop"
  >;
  onApplied: (id: string) => void;
  restored?: {
    mode: PlotMode;
    ids: PlotSelection;
    requirements: string;
  } | null;
}) {
  const fieldName = useId();
  const form = useId();
  const requirementsId = useId();
  const [selection, setSelection] = useState<string[] | "start">(() =>
    restored ? (restored.ids.length === 1 ? "start" : [...restored.ids]) : [],
  );
  const [preferredMode, setMode] = useState<PlotMode>(
    () => restored?.mode ?? "stitch",
  );
  const [requirements, setRequirements] = useState(
    () => restored?.requirements ?? "",
  );
  const [applying, setApplying] = useState(false);
  const draft = writer.plotDraft;
  const locked = writer.busy || applying || draft !== null;
  const mode = hasPlotPair ? preferredMode : "insert";
  const firstChapter = chapters[0];
  const canInsertAtStart = mode === "insert" && Boolean(firstChapter);
  const atStart = canInsertAtStart && selection === "start";
  const selected = selection === "start" ? [] : selection;
  const range = resolveChapterRange(chapters, selected);
  const selectedCount = range?.chapters.length ?? 0;
  const hasValidRange =
    range &&
    (mode === "merge" ? selectedCount >= 2 : selectedCount === 2) &&
    range.chapters.every(({ text }) => text.trim());
  const target: PlotSelection | null =
    atStart && firstChapter
      ? [firstChapter.id]
      : hasValidRange
        ? range.chapters.map(({ id }) => id)
        : null;
  const canStart = Boolean(target && (mode === "merge" || requirements.trim()));
  const sourceLength =
    mode === "merge"
      ? (range?.chapters.reduce(
          (sum, chapter) => sum + chapter.text.length,
          0,
        ) ?? 0)
      : 0;

  useEffect(() => {
    if (!restored) return;
    setMode(restored.mode);
    setRequirements(restored.requirements);
    setSelection(restored.ids.length === 1 ? "start" : [...restored.ids]);
  }, [restored]);

  useRegisterPromptReuse(
    open
      ? (text) => {
          if (writer.busy || applying || draft !== null) return false;
          setRequirements(text);
          return true;
        }
      : null,
  );

  function changeMode(nextMode: PlotMode) {
    setMode(nextMode);
    if (
      (selection === "start" && nextMode !== "insert") ||
      (nextMode !== "merge" && selected.length > 2)
    )
      setSelection([]);
  }

  function close() {
    writer.discardRewrite();
    setSelection([]);
    setMode("stitch");
    setRequirements("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !writer.busy && !applying) {
          if (draft && !window.confirm("剧情草稿尚未应用，确定丢弃吗？"))
            return;
          close();
        }
      }}
    >
      <DialogContent className="gap-0" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="shrink-0 border-b border-border pr-12 py-3">
          <DialogTitle>剧情整理</DialogTitle>
          <DialogDescription className="sr-only">
            选择整理方式与章节，生成草稿后确认应用。
          </DialogDescription>
        </DialogHeader>
        <form
          id={form}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!locked && canStart && target)
              writer.editPlot(target, mode, requirements);
          }}
        >
          {!draft ? (
            <>
              <fieldset disabled={locked}>
                <legend className="sr-only">整理方式</legend>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                  {options.map(({ value, label, icon: Icon }) => (
                    <label key={value} className="group relative min-w-0">
                      <input
                        type="radio"
                        name={fieldName}
                        checked={mode === value}
                        disabled={!hasPlotPair && value !== "insert"}
                        className="peer sr-only"
                        onChange={() => {
                          changeMode(value);
                          writer.discardRewrite();
                        }}
                      />
                      <span className="flex min-h-7 flex-wrap items-center justify-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring group-has-disabled:opacity-60">
                        <Icon className="size-3.5 shrink-0" />
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={locked} className="flex flex-col gap-1">
                <legend className="sr-only">章节选择</legend>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="text-xs font-medium">
                    {canInsertAtStart
                      ? "插入位置"
                      : mode === "merge"
                        ? "连续章节（至少两章）"
                        : "相邻两章"}
                  </p>
                  {mode === "merge" && range ? (
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {selectedCount === 1
                          ? `第 ${range.index + 1} 章`
                          : `第 ${range.index + 1}–${range.end} 章`}
                        {" · "}
                        {sourceLength.toLocaleString("zh-CN")} 字
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => {
                          writer.discardRewrite();
                          setSelection([]);
                        }}
                      >
                        清空
                      </Button>
                    </div>
                  ) : null}
                </div>
                {canInsertAtStart ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={atStart ? "default" : "outline"}
                    className="self-start h-7"
                    aria-pressed={atStart}
                    onClick={() => {
                      writer.discardRewrite();
                      setSelection(atStart ? [] : "start");
                    }}
                  >
                    <ListPlus data-icon="inline-start" />
                    第一章之前
                  </Button>
                ) : null}
                <div
                  className="grid max-h-[min(26dvh,10rem)] grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1 overflow-y-auto p-1"
                  hidden={!hasPlotPair}
                >
                  {chapters.map((chapter, index) => {
                    const active =
                      !!range && index >= range.index && index < range.end;
                    const insideRange =
                      !!range && index > range.index && index < range.end - 1;
                    const adjacentText =
                      chapters[index - 1]?.text.trim() ||
                      chapters[index + 1]?.text.trim();
                    const available =
                      chapter.text.trim() &&
                      (active ||
                        (range
                          ? (mode === "merge" || selectedCount === 1) &&
                            (index === range.index - 1 || index === range.end)
                          : adjacentText));
                    return (
                      <Button
                        key={chapter.id}
                        type="button"
                        size="icon"
                        variant={active ? "default" : "outline"}
                        className="h-8 w-full min-w-0 rounded-md px-1 text-xs tabular-nums"
                        disabled={!available}
                        aria-disabled={insideRange || undefined}
                        aria-pressed={active}
                        aria-label={`第 ${index + 1} 章：${chapter.title}`}
                        title={chapter.title}
                        onClick={() => {
                          if (insideRange) return;
                          writer.discardRewrite();
                          const ids = range?.chapters.map(({ id }) => id) ?? [];
                          setSelection(
                            active
                              ? ids.filter((id) => id !== chapter.id)
                              : [...ids, chapter.id],
                          );
                        }}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
                {hasValidRange && mode !== "merge" ? (
                  <p className="break-words text-xs text-muted-foreground">
                    {range.chapters[0].title} → {range.chapters[1].title}
                  </p>
                ) : null}
              </fieldset>
              <fieldset disabled={locked} className="flex flex-col gap-1">
                <label htmlFor={requirementsId} className="text-xs font-medium">
                  本次写作要求{mode === "merge" ? "（选填）" : " *"}
                </label>
                <Textarea
                  id={requirementsId}
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  maxLength={4000}
                  rows={2}
                  required={mode !== "merge"}
                />
              </fieldset>
              {mode === "merge" ? (
                <Alert className="px-2 py-1.5">
                  <AlertDescription className="text-xs">
                    仅合并为一章，最多{" "}
                    {maxChapterLength.toLocaleString("zh-CN")}{" "}
                    字，正文可能大幅缩短。
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : null}
          {writer.busy ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
              正在生成剧情草稿…
            </p>
          ) : null}
          {draft ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b border-border pb-2">
                <h3 className="text-sm font-medium">草稿预览</h3>
                {draft.mode === "merge" ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {selectedCount} 章合为 1 章 · 原文{" "}
                    {sourceLength.toLocaleString("zh-CN")} 字{" → "}草稿{" "}
                    {draft.chapters[0].text.length.toLocaleString("zh-CN")} 字
                  </p>
                ) : null}
              </div>
              {draft.chapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="flex min-w-0 flex-col gap-1"
                >
                  <h4 className="break-words font-serif text-base">
                    {chapter.title}
                  </h4>
                  <UnifiedMarkdown content={chapter.text} />
                </article>
              ))}
            </div>
          ) : null}
          {writer.error ? (
            <Alert className="px-2 py-1.5">
              <AlertDescription>{writer.error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter className="shrink-0 border-t border-border flex-row flex-wrap justify-end px-3 py-2">
          {writer.busy ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={writer.stop}
            >
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : draft ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={applying}
                onClick={() => writer.discardRewrite()}
              >
                丢弃草稿
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={applying}
                onClick={async () => {
                  setApplying(true);
                  try {
                    const id = await writer.applyPlot();
                    if (id) {
                      onApplied(id);
                      close();
                    }
                  } finally {
                    setApplying(false);
                  }
                }}
              >
                <Check data-icon="inline-start" />
                {applying
                  ? "正在保存…"
                  : draft.mode === "merge"
                    ? "合并为一章"
                    : draft.mode === "insert"
                      ? "插入新章"
                      : "应用粘合"}
              </Button>
            </>
          ) : (
            <Button type="submit" size="sm" form={form} disabled={!canStart}>
              <WandSparkles data-icon="inline-start" />
              生成草稿
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
