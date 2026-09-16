import type { PDFDocumentProxy } from "pdfjs-dist";

export const DOCUMENT_KINDS = ["pdf", "markdown"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

type DocumentFormat = {
  kind: DocumentKind;
  label: "PDF" | "Markdown";
  mimeType: string;
  extensions: readonly string[];
  maxBytes: number;
};

export const DOCUMENT_FORMATS = {
  pdf: {
    kind: "pdf",
    label: "PDF",
    mimeType: "application/pdf",
    extensions: [".pdf"],
    maxBytes: 20 * 1024 * 1024,
  },
  markdown: {
    kind: "markdown",
    label: "Markdown",
    mimeType: "text/markdown",
    extensions: [".md", ".markdown"],
    maxBytes: 1024 * 1024,
  },
} as const satisfies Record<DocumentKind, DocumentFormat>;

export const MAX_PDF_BYTES = DOCUMENT_FORMATS.pdf.maxBytes;
export const MAX_MARKDOWN_BYTES = DOCUMENT_FORMATS.markdown.maxBytes;
export const MAX_CONTEXT_CHARACTERS = 60_000;
export const MAX_QUOTE_CHARACTERS = 4_000;

export const DOCUMENT_FILE_ACCEPT = [
  ...DOCUMENT_FORMATS.pdf.extensions,
  ...DOCUMENT_FORMATS.markdown.extensions,
  DOCUMENT_FORMATS.pdf.mimeType,
  DOCUMENT_FORMATS.markdown.mimeType,
].join(",");

type KnowledgeDocumentBase = {
  id: string;
  file: File;
};

export type PdfKnowledgeDocument = KnowledgeDocumentBase & {
  kind: "pdf";
};

export type MarkdownKnowledgeDocument = KnowledgeDocumentBase & {
  kind: "markdown";
  markdown: string;
};

export type KnowledgeDocument =
  | PdfKnowledgeDocument
  | MarkdownKnowledgeDocument;

export type DocumentSourcePayload =
  | { kind: "pdf" }
  | { kind: "markdown"; markdown: string };

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
  rects?: QuoteRect[];
};

export type KnowledgeMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  quote?: DocumentQuote;
};

export type QuoteRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Page-relative coordinates survive zooming and responsive preview resizing.
export function normalizeQuoteRects(
  rects: Iterable<Pick<DOMRect, "left" | "top" | "right" | "bottom">>,
  page: Pick<DOMRect, "left" | "top" | "width" | "height">,
): QuoteRect[] {
  if (page.width <= 0 || page.height <= 0) return [];
  const result: QuoteRect[] = [];
  const seen = new Set<string>();
  for (const rect of rects) {
    const left = Math.max(0, rect.left - page.left);
    const top = Math.max(0, rect.top - page.top);
    const right = Math.min(page.width, rect.right - page.left);
    const bottom = Math.min(page.height, rect.bottom - page.top);
    if (right <= left || bottom <= top) continue;
    const normalized = {
      left: left / page.width,
      top: top / page.height,
      width: (right - left) / page.width,
      height: (bottom - top) / page.height,
    };
    const key = JSON.stringify(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

export function getDocumentKind(name: string): DocumentKind | null {
  const lower = name.toLowerCase();
  for (const kind of DOCUMENT_KINDS) {
    if (
      DOCUMENT_FORMATS[kind].extensions.some((extension) =>
        lower.endsWith(extension),
      )
    ) {
      return kind;
    }
  }
  return null;
}

export function isDocumentTooLarge(file: File, kind: DocumentKind) {
  return file.size > DOCUMENT_FORMATS[kind].maxBytes;
}

export function decodeMarkdownBytes(bytes: ArrayBuffer): string {
  const markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!markdown.trim()) throw new Error("empty");
  if (markdown.includes("\0")) throw new Error("binary");
  return markdown;
}

export async function readMarkdownSource(file: File) {
  return decodeMarkdownBytes(await file.arrayBuffer());
}

export function createKnowledgeDocument(
  id: string,
  file: File,
  payload: DocumentSourcePayload,
): KnowledgeDocument {
  return payload.kind === "markdown"
    ? { id, file, kind: "markdown", markdown: payload.markdown }
    : { id, file, kind: "pdf" };
}

export function documentContentFromSource(
  source: KnowledgeDocument,
): DocumentContent | null {
  return source.kind === "markdown"
    ? limitDocumentContent(source.markdown)
    : null;
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

/** 暂时不使用。聊天接入后用于提取全文上下文；当前高亮只搜索 PDF 文本层。 */
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
