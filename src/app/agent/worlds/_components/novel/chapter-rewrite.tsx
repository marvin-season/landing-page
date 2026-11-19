"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MarkdownProse } from "@/components/ui/unified-markdown";
import { renderChapterMarkdown } from "./chapter-markdown";
import type { ChapterTextRange } from "./model";
import { type RewriteControls, RewritePopover } from "./rewrite-form";

export function ChapterReading({
  title,
  text,
  rewriting,
  preview,
  draftReady,
  compactContext,
  onCompactContextChange,
  writer,
  onClose,
  onApply,
  onRewrite,
  ended,
}: Omit<RewriteControls, "onApply"> & {
  title: string;
  text: string;
  rewriting: boolean;
  onApply: () => boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [appliedRange, setAppliedRange] = useState<ChapterTextRange>();
  const markStart = rewriting ? 0 : appliedRange?.start;
  const markEnd = rewriting ? text.length : appliedRange?.end;
  const content = useMemo(
    () =>
      renderChapterMarkdown(
        text,
        markStart !== undefined && markEnd !== undefined
          ? { start: markStart, end: markEnd }
          : undefined,
      ),
    [markEnd, markStart, text],
  );
  useLayoutEffect(() => {
    if (rewriting) heading.current?.scrollIntoView({ block: "nearest" });
  }, [rewriting]);

  return (
    <article className="flex flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 ref={heading} className="font-serif text-xl">
          {title}
        </h3>
        {!rewriting && appliedRange ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-500" />
            已应用润色
          </span>
        ) : null}
      </div>
      <div>
        <MarkdownProse
          className={
            rewriting
              ? "[&_[data-rewrite-mark]]:bg-primary/20 [&_[data-rewrite-mark]]:text-inherit"
              : "[&_[data-rewrite-mark]]:bg-emerald-400/30 [&_[data-rewrite-mark]]:text-inherit"
          }
        >
          {content}
        </MarkdownProse>
      </div>
      {rewriting ? (
        <RewritePopover
          anchor={heading}
          isPassage={false}
          preview={preview}
          draftReady={draftReady}
          compactContext={compactContext}
          onCompactContextChange={onCompactContextChange}
          writer={writer}
          ended={ended}
          onClose={onClose}
          onRewrite={onRewrite}
          onApply={() => {
            if (onApply()) setAppliedRange({ start: 0, end: preview.length });
          }}
        />
      ) : null}
    </article>
  );
}
