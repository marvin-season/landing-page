"use client";

import { cn } from "@landing-page/utils";
import type { ReactNode } from "react";
import { useIncrementalMarkdown } from "./use-incremental-markdown";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

export function UnifiedMarkdown({
  content,
  className,
  hasNextChunk = false,
}: {
  content: string;
  className?: string;
  hasNextChunk?: boolean;
}) {
  const contentComponent = useIncrementalMarkdown(content, {
    hasNextChunk,
  });

  return (
    <MarkdownProse className={className}>{contentComponent}</MarkdownProse>
  );
}

export function MarkdownProse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        "streaming-content", // 触发 CSS 中的 :last-child 动画
        className,
      )}
    >
      {children}
    </div>
  );
}
