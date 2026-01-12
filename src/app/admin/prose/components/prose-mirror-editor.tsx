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
import UserConfirmView from "./user-confirm-view";

const userConfirm: NodeSpec = {
  inline: false,
  group: "block",
  atom: true, // 设置为原子节点，不可直接编辑内部文字
  attrs: {
    status: { default: "pending" },
    userName: { default: "Guest" },
  },
};

const myButton: NodeSpec = {
  inline: true,
  content: "text*",
  group: "inline",
  /**
   * 默认情况下（defining: false），如果你选中一个节点的所有内容并按退格键，或者把内容替换为其他内容，这个节点容器通常会消失，内容会被“合并”到父节点中。
   */
  defining: true,
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
          type: "user-confirm",
          attrs: {
            userName: "张三",
            status: "pending",
          },
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
        .my-custom-button {
          border: 1px solid #007bff;
          padding: 0 4px;
          border-radius: 4px;
          background: #e7f1ff;
        }
        .user-confirm-node {
          align-items: center;
          gap: 10px;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #ddd;
          background: #fff;
          margin: 0 5px;
          font-size: 14px;
        }
        .user-label { font-weight: bold; }
        .btn-confirm { background: #52c41a; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
        .btn-cancel { background: #ff4d4f; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
        .status-confirmed { border-color: #52c41a; background: #f6ffed; }
        .status-canceled { border-color: #ff4d4f; background: #fff1f0; }
        .status-text { font-weight: bold; }
      `}</style>
    </div>
  );
}
