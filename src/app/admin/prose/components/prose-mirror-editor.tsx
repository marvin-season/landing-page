"use client";

import { DOMParser, Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

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
      toDOM() {
        return ["h1", 0];
      },
      parseDOM: [{ tag: "h1" }],
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
