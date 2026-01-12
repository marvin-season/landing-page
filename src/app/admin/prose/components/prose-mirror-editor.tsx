"use client";

import { baseKeymap } from "prosemirror-commands";
// 1. 引入必要的命令和按键绑定
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { type MarkSpec, type NodeSpec, Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useEffect, useRef } from "react";

const myButton: NodeSpec = {
  inline: true,
  content: "text*",
  group: "inline",
  attrs: {
    color: {
      default: "red",
    },
  },
  toDOM(node) {
    return [
      "button",
      { class: "my-custom-button", style: `color: ${node.attrs.color};` },
      0,
    ];
  },
  parseDOM: [{ tag: "button.my-custom-button" }],
};

const myMark: MarkSpec = {
  attrs: {
    color: {
      default: "red",
    },
  },
  toDOM(mark) {
    return [
      "span",
      {
        style: `color: ${mark.attrs.color};`,
        class: "my-custom-mark",
      },
      0,
    ];
  },
  // 解析 DOM：识别什么样的 HTML 应该转为这个 mark 一般用于粘贴或者初始化 html 模板
  parseDOM: [
    {
      tag: "span.my-custom-mark",
      getAttrs: (dom) => ({ color: dom.style.color }),
    },
  ],
};

const myNodes = basicSchema.spec.nodes.append({
  "my-button": myButton,
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
    const initialJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [
            {
              type: "text",
              text: "Hello, world ",
            },
            {
              type: "text",
              text: "(From JSON)!",
              marks: [
                {
                  type: "my-mark",
                  attrs: {
                    color: "red",
                  },
                },
              ],
            },
          ],
        },
        {
          type: "my-button",
          content: [
            {
              type: "text",
              text: "Click me",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "这段文字带有 ",
            },
            {
              type: "text",
              marks: [
                {
                  type: "my-mark",
                  attrs: {
                    color: "blue",
                  },
                },
              ],
              text: "自定义标记",
            },
            {
              type: "text",
              text: "。",
            },
          ],
        },
      ],
    };

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
        .my-custom-mark {
          border: 1px solid red;
          padding: 2px 4px;
          border-radius: 4px;
          font-weight: bold;
          background: #f0f0f0;
          font-size: 14px;
        }
        .my-custom-button {
          border: 1px solid blue;
          padding: 2px 4px;
          border-radius: 4px;
          background: #f0f0f0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
