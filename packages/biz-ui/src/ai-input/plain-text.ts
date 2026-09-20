import type { Editor } from "@tiptap/core";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function plainTextToContent(text: string): string {
  if (!text) return "<p></p>";
  return `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
}

export function editorToPlainText(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" });
}
