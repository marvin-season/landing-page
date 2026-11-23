"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { TextField } from "../fields";
import { useRegisterPromptReuse } from "./chapter-prompt-reuse";
import type { Chapter } from "./model";
import {
  type PlotMode,
  type PlotSelection,
  resolveChapterPair,
} from "./plot-edit";
import type { useNovel } from "./use-novel";

const options = [
  { value: "stitch", label: "剧情粘合", icon: Link2 },
  { value: "merge", label: "剧情合并", icon: Combine },
  { value: "insert", label: "剧情插入", icon: ListPlus },
] as const;

const scopeHints = {
  stitch: "改写范围：所选前章的结尾和后章的开头。章节数不变。",
  merge: "应用后：将所选两章替换为一章。",
  insert: "新增位置：所选两章之间。只参考所选两章的正文。",
} satisfies Record<PlotMode, string>;

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
  const anchor = chapters.findIndex(({ id }) => id === selected[0]);
  const pair =
    selected.length === 2
      ? resolveChapterPair(chapters, [selected[0], selected[1]])
      : null;
  const target: PlotSelection | null =
    atStart && firstChapter
      ? [firstChapter.id]
      : pair
        ? [pair.first.id, pair.second.id]
        : null;
  const canStart = Boolean(target && (mode === "merge" || requirements.trim()));

  useEffect(() => {
    if (!restored) return;
    setMode(restored.mode);
    setRequirements(restored.requirements);
    setSelection(restored.ids.length === 1 ? "start" : [...restored.ids]);
  }, [restored]);

  function fillRequirements(nextMode: PlotMode, text: string) {
    if (writer.busy || applying || draft !== null) return false;
    if ((nextMode === "stitch" || nextMode === "merge") && !hasPlotPair)
      return false;
    setMode(nextMode);
    setRequirements(text);
    onOpenChange(true);
    return true;
  }
  useRegisterPromptReuse({
    stitch: (text) => fillRequirements("stitch", text),
    merge: (text) => fillRequirements("merge", text),
    insert: (text) => fillRequirements("insert", text),
  });

  function close() {
    writer.discardRewrite();
    setSelection([]);
    setMode("stitch");
    setRequirements("");
    onOpenChange(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !writer.busy && !applying) {
          if (draft && !window.confirm("剧情草稿尚未应用，确定丢弃吗？"))
            return;
          close();
        }
      }}
    >
      <SheetContent
        className="w-full gap-0 overflow-hidden sm:max-w-xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>剧情整理</SheetTitle>
          <SheetDescription>
            {atStart
              ? "插入位置 · 第一章之前"
              : hasPlotPair
                ? `相邻章节 · 已选 ${selected.length} / 2`
                : "剧情插入"}
          </SheetDescription>
        </SheetHeader>
        <form
          id={form}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!locked && canStart && target)
              writer.editPlot(target, mode, requirements);
          }}
        >
          <fieldset disabled={locked} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {canInsertAtStart ? "选择插入位置" : "选择相邻的两章"}
            </legend>
            {canInsertAtStart && (atStart || !draft) ? (
              <Button
                type="button"
                size="sm"
                variant={atStart ? "default" : "outline"}
                className="self-start"
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
              className="grid max-h-[min(34dvh,18rem)] grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 overflow-y-auto p-1"
              hidden={draft !== null || !hasPlotPair}
            >
              {chapters.map((chapter, index) => {
                const active = selected.includes(chapter.id);
                const adjacentText =
                  chapters[index - 1]?.text.trim() ||
                  chapters[index + 1]?.text.trim();
                const available =
                  active ||
                  (selected.length === 0 && adjacentText) ||
                  (selected.length === 1 && Math.abs(index - anchor) === 1);
                return (
                  <Button
                    key={chapter.id}
                    type="button"
                    size="icon"
                    variant={active ? "default" : "outline"}
                    className="aspect-square h-auto w-full min-w-0 flex-col gap-1 rounded-lg px-1"
                    disabled={!available || !chapter.text.trim()}
                    aria-pressed={active}
                    aria-label={`第 ${index + 1} 章：${chapter.title}`}
                    title={chapter.title}
                    onClick={() => {
                      writer.discardRewrite();
                      setSelection(
                        active
                          ? selected.filter((id) => id !== chapter.id)
                          : [...selected, chapter.id],
                      );
                    }}
                  >
                    <span className="text-base tabular-nums">{index + 1}</span>
                    <span className="w-full truncate text-[10px]">
                      {chapter.title}
                    </span>
                  </Button>
                );
              })}
            </div>
            {pair ? (
              <p className="break-words text-xs text-muted-foreground">
                {pair.first.title} → {pair.second.title}
              </p>
            ) : null}
          </fieldset>
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
                      setMode(value);
                      if (selection === "start") setSelection([]);
                      writer.discardRewrite();
                    }}
                  />
                  <span className="flex min-h-9 flex-wrap items-center justify-center gap-1 rounded-md px-1 py-1.5 text-xs text-muted-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring group-has-disabled:opacity-60">
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "insert" && (atStart || !hasPlotPair)
                ? "新增位置：第一章之前。只参考通用设定和本次写作要求。"
                : scopeHints[mode]}
            </p>
          </fieldset>
          <fieldset disabled={locked}>
            <TextField
              label={mode === "merge" ? "本次写作要求（选填）" : "本次写作要求"}
              value={requirements}
              onChange={setRequirements}
              maxLength={4000}
              multiline
              required={mode !== "merge"}
            />
          </fieldset>
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
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <h3 className="text-sm font-medium">草稿预览</h3>
              {draft.mode === "merge" ? (
                <Alert>
                  <AlertDescription>
                    应用后，这两章将替换为一章。
                  </AlertDescription>
                </Alert>
              ) : null}
              {draft.chapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className="flex min-w-0 flex-col gap-2"
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
            <Alert>
              <AlertDescription>{writer.error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <SheetFooter className="shrink-0 border-t border-border sm:flex-row sm:justify-end">
          {writer.busy ? (
            <Button type="button" variant="outline" onClick={writer.stop}>
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          ) : draft ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={applying}
                onClick={writer.discardRewrite}
              >
                丢弃草稿
              </Button>
              <Button
                type="button"
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
            <Button type="submit" form={form} disabled={!canStart}>
              <WandSparkles data-icon="inline-start" />
              生成草稿
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
