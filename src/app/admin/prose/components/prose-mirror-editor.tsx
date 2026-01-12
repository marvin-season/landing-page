"use client";

import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";
import { logger } from "@/lib/logger";

// 组合成一个最简单的 Schema
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "inline*",
      group: "block",
      toDOM() {
        return ["p", 0];
      },
      parseDOM: [{ tag: "p" }],
    },
    heading: {
      content: "inline*",
      group: "block",
      // 定义属性：这个节点现在可以携带一个 level 变量
      attrs: {
        level: { default: 3 },
      },

      // 渲染时：根据 attrs.level 动态生成标签名
      toDOM(node) {
        return ["h" + node.attrs.level, 0];
      },

      // 解析时：不仅匹配标签，还要提取级别
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
    },
    text: { group: "inline" },
  },
});

export default function ProseMirrorEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    // 1. 定义你的初始数据对象 (通常从 API 获取)
    const initialJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Hello, world (From JSON)!" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "这是通过 JSON 初始化的内容。" }],
        },
      ],
    };

    // 2. 将 JSON 转换为 ProseMirror 的 Node 对象
    const doc = mySchema.nodeFromJSON(initialJson);

    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        schema: mySchema,
        doc: doc, // 直接传入转换后的文档对象
      }),
    });
    logger(view.state.doc.toJSON());
    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div ref={editorRef} className="min-h-[600px] border border-red-500"></div>
  );
}
