// lib/editor/schema.ts
import type { MarkSpec, NodeSpec } from "prosemirror-model";

const userConfirm: NodeSpec = {
  inline: false,
  group: "block",
  attrs: {
    status: { default: "pending" },
    userName: { default: "Guest" },
  },
};

/**
 * variable node
 */
const variableNode: NodeSpec = {
  inline: true,
  group: "inline",
  attrs: {
    label: { default: "" }, // 存储变量名，如 "userName"
  },
  // atom: true 告诉编辑器这是一个原子，光标不能进入内部

  // selectable: true 允许用户点击选中这个标签
  selectable: true,
  draggable: false,
  toDOM(node) {
    return [
      "span",
      {
        class: "variable-tag",
        contentEditable: false,
        // display: inline-block; 让光标从padding后面开始
        style: `display: inline-block; color: blue; background: #e6f7ff; border: 1px solid #91d5ff; padding: 0 10px; border-radius: 4px;`,
      },
      `{${node.attrs.label}}`, // 直接显示属性内容，不使用 0
    ];
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

export { userConfirm, myButton, myMark, variableNode };
