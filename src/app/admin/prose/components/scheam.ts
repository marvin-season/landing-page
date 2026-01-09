// lib/editor/schema.ts
import { Schema } from "prosemirror-model";

export const mySchema = new Schema({
  nodes: {
    // 整个文档的根节点
    doc: { content: "block+" },
    // 文本节点
    text: { group: "inline" },
    // 段落节点
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; }, // 渲染到 DOM 时的标签
      parseDOM: [{ tag: "p" }]      // 从 HTML 解析时的规则
    },
    // 还可以继续添加 heading, code_block 等
  },
  marks: {
    // 这里的 marks 处理加粗、斜体等
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }]
    }
  }
});