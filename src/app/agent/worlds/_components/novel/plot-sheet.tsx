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
  Scissors,
  Square,
  WandSparkles,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import { type Chapter, maxChapterLength } from "./model";
import {
  insertionModeHint,
  localActionHint,
  NovelActionButton,
  NovelActionTooltip,
  plotHint,
  stopGenerationHint,
} from "./novel-action-tooltip";
import {
  canSplitChapter,
  type PlotMode,
  type PlotSelection,
  resolveChapterRange,
} from "./plot-edit";
import { PromptHistoryDialog } from "./prompt-history-dialog";
import type { useNovel } from "./use-novel";

const options = [
  { value: "stitch", label: "剧情粘合", icon: Link2 },
  { value: "merge", label: "剧情合并", icon: Combine },
  { value: "insert", label: "剧情插入", icon: ListPlus },
  { value: "split", label: "拆分章节", icon: Scissors },
] as const;

export function PlotSheet({
  chapters,
  roomKey,
  currentChapterId,
  hasPlotPair,
  open,
  onOpenChange,
  onCloseAutoFocus,
  writer,
  onApplied,
  restored,
}: {
  chapters: readonly Chapter[];
  roomKey: string;
  currentChapterId: string;
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
    | "editablePlotText"
    | "editPlotDraftText"
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
    restored ? restoredSelection(restored) : [],
  );
  const [preferredMode, setMode] = useState<PlotMode>(
    () => restored?.mode ?? "stitch",
  );
  const [requirements, setRequirements] = useState(
    () => restored?.requirements ?? "",
  );
  const [applying, setApplying] = useState(false);
  const [manualSplit, setManualSplit] = useState(false);
  const [splitPoint, setSplitPoint] = useState<{ chapterId: string; offset: number } | null>(null);
  const draft = writer.plotDraft;
  const locked = writer.busy || applying || draft !== null;
  const hasSplitTarget = chapters.some(({ text }) => canSplitChapter(text));
  function modeAvailable(value: PlotMode) {
    return value === "split"
      ? hasSplitTarget
      : value === "insert" || hasPlotPair;
  }
  const mode = modeAvailable(preferredMode)
    ? preferredMode
    : hasSplitTarget
      ? "split"
      : "insert";
  const splitting = mode === "split";
  const firstChapter = chapters[0];
  const canInsertAtStart = mode === "insert" && Boolean(firstChapter);
  const atStart = canInsertAtStart && selection === "start";
  const explicitSelection = selection === "start" ? [] : selection;
  const selected =
    splitting && explicitSelection.length !== 1
      ? [currentChapterId]
      : explicitSelection;
  const range = resolveChapterRange(chapters, selected);
  const selectedCount = range?.chapters.length ?? 0;
  const hasValidRange =
    range &&
    (splitting
      ? selectedCount === 1 && canSplitChapter(range.chapters[0].text)
      : (mode === "merge" ? selectedCount >= 2 : selectedCount === 2) &&
        range.chapters.every(({ text }) => text.trim()));
  const target: PlotSelection | null =
    atStart && firstChapter
      ? [firstChapter.id]
      : hasValidRange
        ? range.chapters.map(({ id }) => id)
        : null;
  const requiresInstructions = mode === "stitch" || mode === "insert";
  const splitChapter = splitting && range?.chapters.length === 1 ? range.chapters[0] : undefined;
  const splitOffset = splitChapter && splitPoint?.chapterId === splitChapter.id ? splitPoint.offset : 0;
  const validSplitPoint = Boolean(
    splitChapter?.text.slice(0, splitOffset).trim() && splitChapter.text.slice(splitOffset).trim(),
  );
  const canStart = Boolean(
    target && (splitting && manualSplit ? validSplitPoint : !requiresInstructions || requirements.trim()),
  );
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
    setSelection(restoredSelection(restored));
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
      splitting ||
      nextMode === "split" ||
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
    setManualSplit(false);
    setSplitPoint(null);
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
              writer.editPlot(target, mode, requirements, splitting && manualSplit ? splitOffset : undefined);
          }}
        >
          {!draft ? (
            <>
              <fieldset disabled={locked}>
                <legend className="sr-only">整理方式</legend>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1 sm:grid-cols-4">
                  {options.map(({ value, label, icon: Icon }) => (
                    <NovelActionTooltip
                      key={value}
                      hint={
                        value === "insert" ? insertionModeHint : plotHint(value)
                      }
                    >
                      <label className="group relative min-w-0">
                        <input
                          type="radio"
                          name={fieldName}
                          checked={mode === value}
                          disabled={!modeAvailable(value)}
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
                    </NovelActionTooltip>
                  ))}
                </div>
              </fieldset>
              {splitting ? (
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" className="self-start" disabled={locked} onClick={() => setManualSplit(!manualSplit)}>
                    {manualSplit ? "改用 AI 选拆分位置" : "手动选拆分位置"}
                  </Button>
                  {manualSplit && splitChapter ? (
                    <>
                      <p className="text-xs text-muted-foreground">把光标放在第二章的开头。</p>
                      <Textarea
                        aria-label="第二章开头"
                        readOnly
                        rows={6}
                        value={splitChapter.text}
                        onSelect={(event) => setSplitPoint({
                          chapterId: splitChapter.id,
                          offset: event.currentTarget.selectionStart,
                        })}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
              {splitting && manualSplit ? null : (
              <fieldset disabled={locked} className="flex flex-col gap-1">
                <legend className="sr-only">章节选择</legend>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <p className="text-xs font-medium">
                    {canInsertAtStart
                      ? "插入位置"
                      : mode === "merge"
                        ? "连续章节（至少两章）"
                        : splitting
                          ? "选择一章"
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
                  hidden={!splitting && !hasPlotPair}
                >
                  {chapters.map((chapter, index) => {
                    const active =
                      !!range &&
                      index >= range.index &&
                      index < range.end &&
                      (!splitting || canSplitChapter(chapter.text));
                    const insideRange =
                      !!range && index > range.index && index < range.end - 1;
                    const adjacentText =
                      chapters[index - 1]?.text.trim() ||
                      chapters[index + 1]?.text.trim();
                    const available = splitting
                      ? canSplitChapter(chapter.text)
                      : chapter.text.trim() &&
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
                          if (splitting) {
                            setSelection([chapter.id]);
                            return;
                          }
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
                    {range.chapters[0].title}
                    {!splitting ? ` → ${range.chapters[1].title}` : null}
                  </p>
                ) : null}
              </fieldset>
              <fieldset disabled={locked} className="flex flex-col gap-1">
                <label htmlFor={requirementsId} className="text-xs font-medium">
                  {splitting ? "本次拆分要求" : "本次写作要求"}
                  {requiresInstructions ? " *" : "（选填）"}
                </label>
                <Textarea
                  id={requirementsId}
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  maxLength={4000}
                  rows={2}
                  required={requiresInstructions}
                />
                <div className="self-start">
                  <PromptHistoryDialog roomKey={roomKey} />
                </div>
              </fieldset>
              )}
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
              {draft.chapters.map((chapter, index) => (
                <article
                  key={chapter.id}
                  className="flex min-w-0 flex-col gap-1"
                >
                  <h4 className="break-words font-serif text-base">
                    {chapter.title}
                  </h4>
                  {writer.editablePlotText[index] !== undefined ? (
                    <Textarea
                      aria-label={draft.mode === "stitch" ? (index === 0 ? "前章结尾" : "后章开头") : "草稿正文"}
                      value={writer.editablePlotText[index]}
                      onChange={(event) => writer.editPlotDraftText(index, event.target.value)}
                      rows={5}
                      disabled={applying}
                    />
                  ) : null}
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
            <NovelActionButton
              hint={stopGenerationHint}
              type="button"
              size="sm"
              variant="outline"
              onClick={writer.stop}
            >
              <Square data-icon="inline-start" />
              停止生成
            </NovelActionButton>
          ) : draft ? (
            <>
              <NovelActionButton
                hint={localActionHint("丢弃本次整理生成的草稿，保留原章节。")}
                type="button"
                size="sm"
                variant="ghost"
                disabled={applying}
                onClick={() => writer.discardRewrite()}
              >
                丢弃草稿
              </NovelActionButton>
              <NovelActionButton
                hint={localActionHint(
                  draft.mode === "merge"
                    ? "用合并稿替换所选章节。"
                    : draft.mode === "insert"
                      ? "保存草稿并插入所选位置。"
                      : draft.mode === "split"
                        ? "保存拆分后的两章，保留全部原文。"
                        : "保存两章改写后的结尾与开头。",
                )}
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
                      : draft.mode === "split"
                        ? "应用拆分"
                        : "应用粘合"}
              </NovelActionButton>
            </>
          ) : (
            <NovelActionButton
              hint={splitting && manualSplit ? localActionHint("按光标位置拆成两章，保留全部原文。") : plotHint(mode, atStart)}
              type="submit"
              size="sm"
              form={form}
              disabled={!canStart}
            >
              <WandSparkles data-icon="inline-start" />
              {splitting && manualSplit ? "预览拆分" : "生成草稿"}
            </NovelActionButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function restoredSelection({
  mode,
  ids,
}: {
  mode: PlotMode;
  ids: PlotSelection;
}) {
  return mode === "insert" && ids.length === 1 ? "start" : [...ids];
}
