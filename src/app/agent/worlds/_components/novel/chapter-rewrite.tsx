"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { MarkdownProse } from "@/components/ui/unified-markdown";
import { renderChapterMarkdown } from "./chapter-markdown";

export function ChapterReading({
  title,
  text,
  rewriting,
  appliedLength,
}: {
  title: string;
  text: string;
  rewriting: boolean;
  appliedLength?: number;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const markEnd = rewriting ? text.length : appliedLength;
  const content = useMemo(
    () =>
      renderChapterMarkdown(
        text,
        markEnd !== undefined ? { start: 0, end: markEnd } : undefined,
      ),
    [markEnd, text],
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
        {!rewriting && appliedLength !== undefined ? (
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
    </article>
  );
}
