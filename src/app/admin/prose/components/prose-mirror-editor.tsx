"use client";

import { baseKeymap } from "prosemirror-commands";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

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
    const doc = basicSchema.nodeFromJSON(initialJson);

    const state = EditorState.create({
      schema: basicSchema,
      doc: doc, // 直接传入转换后的文档对象
      plugins: [
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
        }),
        keymap(baseKeymap),
        history(),
      ],
    });
    const view = new EditorView(editorRef.current, {
      state,
    });
    return () => {
      view.destroy();
    };
  }, []);
  return (
    <div>
      <div ref={editorRef}></div>
      <style global>{`
        .ProseMirror {
          min-height: 600px;
          padding: 10px;
          outline: none !important;
        }
        .ProseMirror-focused {
          border: none;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}
