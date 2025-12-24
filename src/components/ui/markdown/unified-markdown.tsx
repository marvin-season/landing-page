"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import processor from "@/components/ui/markdown/processor";

export function UnifiedMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const contentComponent = useMemo(() => {
    try {
      // 执行解析
      return processor.processSync(content).result;
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return content;
    }
  }, [content]);

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
