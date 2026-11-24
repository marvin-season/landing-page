"use client";

import { cn } from "@landing-page/utils";
import { useMemo } from "react";
import { buildChapterDiff, type ChapterDiffLine } from "./chapter-diff";
import type { Chapter } from "./model";

function DiffCell({
  line,
  side,
}: {
  line: ChapterDiffLine | null;
  side: "left" | "right";
}) {
  const inlineHighlight =
    side === "left" ? "bg-red-500/25 line-through" : "bg-emerald-500/25";
  return (
    <div
      className={cn(
        "flex min-h-7 min-w-0 border-b border-border/50 px-3 py-1 font-mono text-sm leading-5",
        line?.wholeLine &&
          (side === "left" ? "bg-red-500/10" : "bg-emerald-500/10"),
        line === null && "bg-muted/20",
      )}
    >
      <span className="w-10 shrink-0 select-none pr-3 text-right text-xs text-muted-foreground/70">
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
}: {
  base: Chapter;
  draft: Chapter;
}) {
  const rows = useMemo(
    () => buildChapterDiff(base.text, draft.text),
    [base.text, draft.text],
  );

  return (
    <div className="flex min-h-48 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="grid shrink-0 grid-cols-2 border-b border-border bg-muted/40 text-sm font-medium">
        <div className="border-r border-border px-3 py-1 text-muted-foreground">
          原稿
        </div>
        <div className="px-3 py-1">草稿</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-2xl grid-cols-2">
          {rows.map((row) => (
            <div
              className="contents"
              key={`${row.left?.number}:${row.right?.number}`}
            >
              <DiffCell line={row.left} side="left" />
              <DiffCell line={row.right} side="right" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
