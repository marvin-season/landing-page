"use client";

import { Button } from "@landing-page/design-system";
import { Check } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { MarkdownProse } from "@/components/ui/unified-markdown";
import { renderChapterMarkdown } from "./chapter-markdown";

export function ChapterReading({
  title,
  text,
  brief,
  rewriting,
  appliedLength,
  reuseDisabled,
  onReuseBrief,
}: {
  title: string;
  text: string;
  brief?: string;
  rewriting: boolean;
  appliedLength?: number;
  reuseDisabled?: boolean;
  onReuseBrief?: (brief: string) => void;
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
      {brief ? (
        <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              本章要求
            </p>
            {onReuseBrief ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={reuseDisabled}
                onClick={() => onReuseBrief(brief)}
              >
                用作下一章要求
              </Button>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{brief}</p>
        </div>
      ) : null}
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
