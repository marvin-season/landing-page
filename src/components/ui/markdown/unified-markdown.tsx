"use client";

import { memo, useMemo } from "react";
import * as prod from "react/jsx-runtime";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { cn } from "@/lib/utils";
// 样式
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface UnifiedMarkdownProps {
  content: string;
  className?: string;
}

const MemoizedStrong = memo(({ className, ...props }: any) => {
  return <strong className={cn("font-bold", className)} {...props} />;
});
const components = {
  strong: MemoizedStrong,
};

/**
 * 使用 unified 生态实现的富文本解析组件
 * 支持：GFM (表格、任务列表等)、数学公式 (Katex)、代码高亮 (Highlight.js)
 */
export function UnifiedMarkdown({ content, className }: UnifiedMarkdownProps) {
  const processor = useMemo(() => {
    return (
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        // 如果需要支持 HTML 标签，可以加上 rehype-raw，但需要注意安全
        // .use(rehypeRaw)
        .use(rehypeKatex)
        .use(rehypeHighlight, {
          detect: true,
          ignoreMissing: true,
        })
        .use(rehypeReact, {
          ...prod,
          components: components,
        })
    );
  }, []);

  const contentComponent = useMemo(() => {
    console.log("processor", {
      processor: processor,
    });

    try {
      return processor.processSync(content).result;
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return content;
    }
  }, [processor, content]);

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        className,
      )}
    >
      {contentComponent}
    </div>
  );
}
