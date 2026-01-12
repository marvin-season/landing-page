// lib/editor/schema.ts
import type { MarkSpec, NodeSpec } from "prosemirror-model";

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

export { userConfirm, myButton, myMark };
