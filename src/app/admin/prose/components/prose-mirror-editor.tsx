"use client";

import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { schema } from "prosemirror-schema-basic"; // 先用基础的，确保不出错
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

// 必须引入基础结构样式，否则光标位置会错乱
import "prosemirror-view/style/prosemirror.css";

export default function BasicEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // 防止 React 严格模式下创建两个编辑器
    if (viewRef.current) return;

    const state = EditorState.create({
      schema,
      plugins: [
        history(), // 允许撤销重做
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
        }),
        keymap(baseKeymap), // 核心：绑定回车、删除、箭头移动等基础操作
      ],
    });

    const view = new EditorView(editorRef.current, {
      state,
      dispatchTransaction(tr) {
        const newState = view.state.apply(tr);
        view.updateState(newState);
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div className="m-10 border p-4 bg-white">
      {/* 给编辑器一个类名并设置 min-height，否则没内容时你会点不到它 */}
      <div
        ref={editorRef}
        className="prose max-w-none outline-none min-h-[150px]"
      />
      <style jsx global>{`
        /* 关键：确保编辑器容器撑开，并且有焦点指示 */
        .ProseMirror {
          min-height: 150px;
          outline: none;
        }
        .ProseMirror p {
          margin-bottom: 1em;
        }
      `}</style>
    </div>
  );
}
