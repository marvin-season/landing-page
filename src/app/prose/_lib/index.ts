import { DOMParser } from "prosemirror-model";
import type { createProseMirrorSchema } from "@/app/prose/_lib/schema/create-schema";

/**
 * 从 HTML 模板创建 ProseMirror 文档
 * @param schema - ProseMirror schema
 * @param htmlTemplate - HTML 字符串模板
 * @returns ProseMirror Node 文档
 */
export function parseHTMLTemplate(
  schema: ReturnType<typeof createProseMirrorSchema>,
  htmlTemplate: string,
) {
  // 确保在客户端环境
  if (typeof document === "undefined") {
    throw new Error("parseHTMLTemplate 只能在客户端使用");
  }

  // 创建一个临时 DOM 元素来解析 HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlTemplate.trim();

  // 使用 DOMParser 解析 HTML
  // DOMParser 会根据 schema 中定义的 parseDOM 规则来解析节点
  // 例如：div.user-confirm 会被解析为 user-confirm 节点
  const parser = DOMParser.fromSchema(schema);
  const doc = parser.parse(tempDiv);

  return doc;
}
