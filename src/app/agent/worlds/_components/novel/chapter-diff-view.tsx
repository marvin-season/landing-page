"use client";

import { cn } from "@landing-page/utils";
import { useMemo } from "react";
import { buildChapterDiff, type ChapterDiffLine } from "./chapter-diff";
import type { Chapter } from "./model";

function DiffCell({
  line,
  side,
  reading,
}: {
  line: ChapterDiffLine | null;
  side: "left" | "right";
  reading: boolean;
}) {
  const inlineHighlight =
    side === "left" ? "bg-red-500/25 line-through" : "bg-emerald-500/25";
  return (
    <div
      className={cn(
        reading
          ? "flex min-h-8 min-w-0 items-baseline gap-2 border-b border-border/35 px-2 py-1 font-serif text-sm leading-6 sm:px-3 sm:text-base sm:leading-7"
          : "flex min-h-7 min-w-0 border-b border-border/50 px-3 py-1 font-mono text-sm leading-5",
        reading && side === "left" && "border-r border-r-border",
        line?.wholeLine &&
          (side === "left" ? "bg-red-500/10" : "bg-emerald-500/10"),
        line === null && "bg-muted/20",
      )}
    >
      <span
        className={cn(
          "w-10 shrink-0 select-none pr-3 text-right text-xs text-muted-foreground/70",
          reading && "w-5 pr-0 font-mono tabular-nums sm:w-7",
        )}
      >
        {line?.number ?? ""}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">
        {line?.parts.map((part) => (
          <span
            key={part.start}
            className={part.changed ? inlineHighlight : undefined}
          >
            {part.text}
          </span>
        )) ?? "\u00a0"}
        {line?.changedBreak ? (
          <span title="换行" className={cn("select-none", inlineHighlight)}>
            {"\u21b5"}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function ChapterDiffView({
  base,
  draft,
  baseLabel = "原稿",
  draftLabel = "草稿",
  layout = "default",
}: {
  base: Chapter;
  draft: Chapter;
  baseLabel?: string;
  draftLabel?: string;
  layout?: "default" | "reading";
}) {
  const rows = useMemo(
    () => buildChapterDiff(base.text, draft.text),
    [base.text, draft.text],
  );

  const reading = layout === "reading";
  const headings = (
    <div
      className={cn(
        "grid shrink-0 grid-cols-2 border-b border-border bg-muted/40 text-sm font-medium",
        reading && "sticky top-0 z-10 bg-card",
      )}
    >
      <div
        className={cn(
          "border-r border-border px-3 py-1 text-muted-foreground",
          reading && "min-w-0 px-2 py-2 sm:px-3",
        )}
      >
        <span>{baseLabel}</span>
        {reading && base.title ? (
          <p className="truncate text-xs font-normal" title={base.title}>
            {base.title}
          </p>
        ) : null}
      </div>
      <div className={cn("px-3 py-1", reading && "min-w-0 px-2 py-2 sm:px-3")}>
        <span>{draftLabel}</span>
        {reading && draft.title ? (
          <p
            className="truncate text-xs font-normal text-muted-foreground"
            title={draft.title}
          >
            {draft.title}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-48 min-w-0 flex-1 flex-col overflow-hidden bg-background",
        reading && "rounded-lg border border-border bg-background/55",
      )}
    >
      {reading ? null : headings}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto",
          reading && "overscroll-contain",
        )}
      >
        {reading ? headings : null}
        <div
          className={
            reading ? "grid min-w-0 grid-cols-2" : "grid min-w-2xl grid-cols-2"
          }
        >
          {rows.map((row) => (
            <div
              className="contents"
              key={`${row.left?.number}:${row.right?.number}`}
            >
              <DiffCell line={row.left} side="left" reading={reading} />
              <DiffCell line={row.right} side="right" reading={reading} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
