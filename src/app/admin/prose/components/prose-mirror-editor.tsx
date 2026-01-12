"use client";

import { DOMParser, Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

// 组合成一个最简单的 Schema
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
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
    // 修复点 1：创建一个临时的 DOM 元素来承载初始 HTML 字符串
    const tempElement = document.createElement("div");
    tempElement.innerHTML = "<h1>Hello, world!</h1>";

    const view = new EditorView(editorRef.current, {
      state: EditorState.create({
        schema: mySchema,
        // 修复点 2：DOMParser.fromSchema(...).parse(domElement)
        doc: DOMParser.fromSchema(mySchema).parse(tempElement),
      }),
    });

    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div ref={editorRef} className="min-h-[600px] border border-red-500"></div>
  );
}
