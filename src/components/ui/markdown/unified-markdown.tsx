"use client";

import { useIncrementalMarkdown } from "@/components/ui/markdown/use-incremental-markdown";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

export function UnifiedMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const contentComponent = useIncrementalMarkdown(content);

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        "streaming-content", // 触发 CSS 中的 :last-child 动画
        className,
      )}
    >
      {contentComponent}
    </div>
  );
}
