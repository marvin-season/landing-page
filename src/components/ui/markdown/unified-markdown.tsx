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
import { visit } from "unist-util-visit";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

// 1. 使用 memo 封装自定义组件，防止因父组件重绘导致的无效 render
const MemoizedStrong = memo(({ className, children, ...props }: any) => {
  return (
    <strong className={cn("font-bold text-primary", className)} {...props}>
      {children}
    </strong>
  );
});
MemoizedStrong.displayName = "MemoizedStrong";

const components = {
  strong: MemoizedStrong,
  // 你可以继续在此添加 p, li, code 等的 memo 版本
};

function rehypeStreamSplitter() {
  return (tree: any) => {
    // 1. 寻找最后一个包含文本的节点
    let lastTextNodeParent: any = null;
    let lastTextNodeIndex: number = -1;

    // 深度优先遍历，找到最后一个文本节点
    visit(tree, "text", (node, index, parent) => {
      if (node.value && node.value.trim() !== "") {
        lastTextNodeParent = parent;
        lastTextNodeIndex = index!;
      }
    });

    // 2. 如果找到了，执行拆分逻辑
    if (lastTextNodeParent && lastTextNodeIndex !== -1) {
      const originalNode = lastTextNodeParent.children[lastTextNodeIndex];
      const textContent = originalNode.value;
      console.log("textContent", textContent);
      // 将纯文本节点替换为一系列 span 节点
      const charNodes = textContent
        .split("")
        .map((char: string, i: number) => ({
          type: "element",
          tagName: "span",
          properties: {
            className: ["streaming-char"],
            // 这里的 Key 很重要，帮助 React 识别增量
            dataCharIndex: i,
            style: "display: inline-block; white-space: pre;",
          },
          children: [{ type: "text", value: char }],
        }));

      // 用拆分后的节点替换原有的文本节点
      lastTextNodeParent.children.splice(lastTextNodeIndex, 1, ...charNodes);
    }
  };
}

export function UnifiedMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const processor = useMemo(() => {
    return unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeHighlight, { detect: true, ignoreMissing: true })
      .use(rehypeStreamSplitter) // 如果需要精准控制动画节点可开启
      .use(rehypeReact, {
        ...prod,
        components: components,
      });
  }, []);

  const contentComponent = useMemo(() => {
    try {
      // 执行解析
      return processor.processSync(content).result;
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return content;
    }
  }, [content, processor]);

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
