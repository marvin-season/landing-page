import { Fragment } from "react";
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
import components from "@/components/ui/markdown/components";

function rehypeStreamSplitter() {
  return (tree: any) => {
    // 1. 寻找最后一个包含文本的节点
    let lastTextNodeParent: any = null;
    let lastTextNodeIndex = -1;

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

export interface ProcessorOptions {
  streaming?: boolean;
}

export const createProcessor = (options: ProcessorOptions = {}) => {
  const p = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeHighlight, { detect: true, ignoreMissing: true });

  if (options.streaming) {
    p.use(rehypeStreamSplitter);
  }

  return p.use(rehypeReact, {
    ...prod,
    Fragment,
    components: components,
  });
};

const defaultProcessor = createProcessor({ streaming: true });
export default defaultProcessor;
