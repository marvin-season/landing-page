import type { PDFDocumentProxy } from "pdfjs-dist";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_MARKDOWN_BYTES = 1024 * 1024;
export const MAX_CONTEXT_CHARACTERS = 60_000;
export const MAX_QUOTE_CHARACTERS = 4_000;

export type KnowledgeDocument = {
  id: string;
  file: File;
  kind: "pdf" | "markdown";
  markdown?: string;
};

export type DocumentContent = {
  text: string;
  truncated: boolean;
};

export type DocumentQuote = {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  pageNumber?: number;
};

export function getDocumentKind(name: string) {
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(md|markdown)$/i.test(name)) return "markdown";
  return null;
}

export function limitDocumentContent(text: string): DocumentContent {
  return {
    text: text.slice(0, MAX_CONTEXT_CHARACTERS),
    truncated: text.length > MAX_CONTEXT_CHARACTERS,
  };
}

export function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function extractPdfContent(
  pdf: PDFDocumentProxy,
  signal: AbortSignal,
): Promise<DocumentContent> {
  let text = "";
  for (let number = 1; number <= pdf.numPages; number++) {
    signal.throwIfAborted();
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    signal.throwIfAborted();
    const pageText = content.items
      .map((item) =>
        "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "",
      )
      .join("")
      .trim();
    if (pageText) text += `${text ? "\n\n" : ""}[Page ${number}]\n${pageText}`;
    if (text.length > MAX_CONTEXT_CHARACTERS)
      return limitDocumentContent(text.trim());
  }
  return { text: text.trim(), truncated: false };
}
