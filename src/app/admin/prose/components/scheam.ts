// lib/editor/schema.ts
import { Schema } from "prosemirror-model";


export const mySchema = new Schema({
  nodes: {
    // 必须保留 doc 和 text，这是最基础的
    doc: { content: "block+" },
    text: { group: "inline" },
    
    // 我们的 H1 节点
    heading: {
      group: "block",      // 这是一个块级元素
      content: "inline*",  // 里面可以包含任意数量的行内元素（文字、加粗等）
      defining: true,      // 粘贴时尽量保留这个节点类型
      
      // 1. 从数据渲染成 HTML
      toDOM() { 
        return ["h1", 0]; // 0 是占位符，表示节点的内容（文字）将放在这里
      },
      
      // 2. 从 HTML 解析成数据
      parseDOM: [
        { tag: "h1" }
      ]
    },

    // 还需要一个段落节点，否则回车没地方去
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }]
    }
  }
});