import { baseKeymap } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Node, Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef, useState } from "react";
import { useNodeViewFactory } from "@/app/prose/_components/NodeViewPortal";
import { ReactNodeView } from "@/app/prose/_components/ReactNodeView";
import UserConfirmForm from "@/app/prose/_components/UserConfirmForm";
import { focusAtEnd } from "@/app/prose/_lib/commands/tr-command";
import placeholderPlugin from "@/app/prose/_lib/plugin/placeholder";
import { variablePlugin } from "@/app/prose/_lib/plugin/variable-menu";

export const useEditor = (props: {
  schema: Schema;
  doc?: Node;
  editable?: (state: EditorState) => boolean;
}) => {
  const { schema, doc, editable } = props;
  const { addPortal, removePortal, PortalRenderer } = useNodeViewFactory();
  const editorRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

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
        variablePlugin(),
        gapCursor(),
        placeholderPlugin("Please enter your content here..."),
      ],
    });

    const editorView = new EditorView(editorRef.current, {
      state,
      editable,
      nodeViews: {
        "user-confirm": (node, view, getPos) =>
          new ReactNodeView(node, view, getPos, UserConfirmForm, {
            addPortal,
            removePortal,
          }),
      },
    });

    // 聚焦末尾
    focusAtEnd(editorView);
    setView(editorView);

    return () => {
      editorView.destroy();
      setView(null);
    };
  }, [schema, doc, addPortal, removePortal, editable]);

  return { editorRef, view, PortalRenderer };
};
