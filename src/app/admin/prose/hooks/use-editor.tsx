import { baseKeymap } from "prosemirror-commands";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import { focusAtEnd } from "@/app/admin/prose/commands/tr-command";
import UserConfirmView from "@/app/admin/prose/components/user-confirm-view";
import { variablePlugin } from "@/app/admin/prose/plugin/variable-menu";
export const useEditor = (schema: Schema) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const state = EditorState.create({
      schema,
      plugins: [
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
        }),
        keymap(baseKeymap),
        history(),
        // placeholderPlugin("请输入内容..."),
        variablePlugin(),
      ],
    });
    const view = new EditorView(editorRef.current, {
      state,
      // 关键：告诉编辑器，当遇到 user-confirm 节点时，用我的类来渲染
      nodeViews: {
        "user-confirm": (...params) => new UserConfirmView(...params),
      },
    });
    // 聚焦末尾
    focusAtEnd(view);
    setView(view);
    return () => {
      view.destroy();
    };
  }, [schema]);

  return { editorRef, view };
};
