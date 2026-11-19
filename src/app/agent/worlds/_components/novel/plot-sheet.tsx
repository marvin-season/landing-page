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
  SheetTrigger,
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
import { useId, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui/unified-markdown";
import { TextField } from "../fields";
import type { Chapter } from "./model";
import { type PlotMode, resolveChapterPair } from "./plot-edit";
import type { useNovel } from "./use-novel";

const options = [
  { value: "stitch", label: "剧情粘合", icon: Link2 },
  { value: "merge", label: "剧情合并", icon: Combine },
  { value: "insert", label: "剧情插入", icon: ListPlus },
] as const;

export function PlotSheet({
  chapters,
  disabled,
  open,
  onOpenChange,
  writer,
  onApplied,
}: {
  chapters: readonly Chapter[];
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}) {
  const fieldName = useId();
  const form = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<PlotMode>("stitch");
  const [requirements, setRequirements] = useState("");
  const [applying, setApplying] = useState(false);
  const draft = writer.plotDraft;
  const locked = writer.busy || applying || draft !== null;
  const anchor = chapters.findIndex(({ id }) => id === selected[0]);
  const pair =
    selected.length === 2
      ? resolveChapterPair(chapters, [selected[0], selected[1]])
      : null;
  const canStart = Boolean(pair && (mode === "merge" || requirements.trim()));
  const hasPair = chapters.some(({ text }, index) =>
    Boolean(text.trim() && chapters[index + 1]?.text.trim()),
  );

  function close() {
    writer.discardRewrite();
    setSelected([]);
    setMode("stitch");
    setRequirements("");
    onOpenChange(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          if (disabled || !hasPair) return;
          writer.discardRewrite();
          onOpenChange(true);
        } else if (!writer.busy && !applying) {
          if (draft && !window.confirm("剧情草稿尚未应用，确定丢弃吗？"))
            return;
          close();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || !hasPair}>
          <Combine data-icon="inline-start" />
          剧情整理
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          <SheetTitle>剧情整理</SheetTitle>
          <SheetDescription>
            相邻章节 · 已选 {selected.length} / 2
          </SheetDescription>
        </SheetHeader>
        <form
          id={form}
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!locked && canStart)
              writer.editPlot([selected[0], selected[1]], mode, requirements);
          }}
        >
          <fieldset disabled={locked} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">选择相邻的两章</legend>
            <div
              className="grid max-h-[min(34dvh,18rem)] grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 overflow-y-auto p-1"
              hidden={draft !== null}
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
                      setSelected(
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
                    className="peer sr-only"
                    onChange={() => {
                      setMode(value);
                      setRequirements("");
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
          </fieldset>
          {!draft && mode !== "merge" ? (
            <fieldset disabled={writer.busy}>
              <TextField
                label={mode === "stitch" ? "过渡要求" : "插入剧情要求"}
                value={requirements}
                onChange={setRequirements}
                maxLength={4000}
                multiline
              />
            </fieldset>
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
