"use client";

import { cn } from "@landing-page/utils";
import { useMemo } from "react";
import { buildChapterDiff } from "./chapter-diff";
import type { Chapter } from "./model";

function DiffCell({
  line,
  lineNumber,
  side,
  kind,
}: {
  line: string | null;
  lineNumber: number | null;
  side: "left" | "right";
  kind: "equal" | "changed" | "removed" | "added";
}) {
  const changed =
    side === "left"
      ? kind === "removed" || kind === "changed"
      : kind === "added" || kind === "changed";
  return (
    <div
      className={cn(
        "flex min-h-7 min-w-0 border-b border-border/50 px-3 py-1 font-mono text-sm leading-5",
        changed && (side === "left" ? "bg-red-500/10" : "bg-emerald-500/10"),
        line === null && "bg-muted/20",
      )}
    >
      <span className="w-10 shrink-0 select-none pr-3 text-right text-xs text-muted-foreground/70">
        {lineNumber ?? ""}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">
        {line ?? "\u00a0"}
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
          稳定版本
        </div>
        <div className="px-3 py-1">编辑草稿</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-[42rem] grid-cols-2">
          {rows.map((row, index) => (
            <div
              className="contents"
              key={`${row.leftNumber}:${row.rightNumber}:${index}`}
            >
              <DiffCell
                line={row.left}
                lineNumber={row.leftNumber}
                side="left"
                kind={row.kind}
              />
              <DiffCell
                line={row.right}
                lineNumber={row.rightNumber}
                side="right"
                kind={row.kind}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
