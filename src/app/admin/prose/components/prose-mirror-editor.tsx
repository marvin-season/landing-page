"use client";

import { baseKeymap } from "prosemirror-commands";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";
import initialJson from "@/app/admin/prose/components/data";
import {
  myButton,
  myMark,
  userConfirm,
} from "@/app/admin/prose/components/scheam";
import UserConfirmView from "./user-confirm-view";

const myNodes = basicSchema.spec.nodes.append({
  "my-button": myButton,
  "user-confirm": userConfirm,
});
const myMarks = basicSchema.spec.marks.append({
  "my-mark": myMark,
});
const schema = new Schema({
  nodes: myNodes,
  marks: myMarks,
});
export default function ProseMirrorEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    // 1. 定义你的初始数据对象 (通常从 API 获取)

    // 2. 将 JSON 转换为 ProseMirror 的 Node 对象
    const doc = schema.nodeFromJSON(initialJson);

    const state = EditorState.create({
      schema,
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
      // 关键：告诉编辑器，当遇到 user-confirm 节点时，用我的类来渲染
      nodeViews: {
        "user-confirm": (node, view, getPos) =>
          new UserConfirmView(node, view, getPos as () => number),
      },
    });
    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-100 text-sm text-gray-500">
          提示：点击“确认”或“拒绝”会触发 Transaction，支持 Cmd+Z 撤销。
        </div>
        <div ref={editorRef} className="prose-container" />
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
          padding: 20px;
          outline: none;
        }

      `}</style>
    </div>
  );
}
