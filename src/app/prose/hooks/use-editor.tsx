import { baseKeymap } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import { focusAtEnd } from "@/app/prose/commands/tr-command";
import { useNodeViewFactory } from "@/app/prose/components/NodeViewPortal";
import { ReactNodeView } from "@/app/prose/components/ReactNodeView";
import UserConfirmForm from "@/app/prose/components/UserConfirmForm";
import initialJson from "@/app/prose/data";
import { variablePlugin } from "@/app/prose/plugin/variable-menu";

export const useEditor = (schema: Schema) => {
  const { addPortal, removePortal, PortalRenderer } = useNodeViewFactory();
  const editorRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const doc = schema.nodeFromJSON(initialJson);
    const state = EditorState.create({
      schema,
      doc,
      plugins: [
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
        }),
        keymap(baseKeymap),
        history(),
        // placeholderPlugin("请输入内容..."),
        variablePlugin(),
        gapCursor(),
      ],
    });
    const view = new EditorView(editorRef.current, {
      state,
      nodeViews: {
        "user-confirm": (node, view, getPos) =>
          new ReactNodeView(node, view, getPos, UserConfirmForm, {
            addPortal,
            removePortal,
          }),
      },
    });
    // 聚焦末尾
    focusAtEnd(view);
    setView(view);
    return () => {
      view.destroy();
    };
  }, [schema, addPortal, removePortal]);

  return { editorRef, view, PortalRenderer };
};
