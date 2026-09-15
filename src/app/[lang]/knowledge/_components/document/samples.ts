import {
  DOCUMENT_FORMATS,
  type DocumentKind,
  type DocumentQuote,
  type PdfKnowledgeDocument,
} from "./model";

export type SampleDocument = {
  path: string;
  name: string;
  title: string;
  kind: DocumentKind;
};

export const SAMPLE_DOCUMENTS = [
  {
    path: "/knowledge/examples/letters-to-the-lighthouse.pdf",
    name: "灯塔来信_5000字扩写版.pdf",
    title: "灯塔来信 · Letters to the Lighthouse",
    kind: "pdf",
  },
  {
    path: "/knowledge/examples/reading-notes.md",
    name: "阅读与知识笔记.md",
    title: "把阅读变成自己的知识",
    kind: "markdown",
  },
] as const satisfies readonly SampleDocument[];

export const MOCK_PDF_QUOTE = {
  pageNumber: 1,
  text: `外婆学英文的样子忽然浮上心头。她会把 breakfast 念得像两块饼干掉在桌上，却坚持每天记五个
词，说码头来的外国船员越来越多，总不能只会摆手。小时候的林夏嫌她发音奇怪，后来出国旅行
，收到她的消息，也总是匆忙回复一个表情。如今那本卷边的单词簿还摊着，铅笔横在页缝里，仿
佛主人只是出去买了一袋盐。`,
} as const;

export function sampleFileType(kind: DocumentKind) {
  return DOCUMENT_FORMATS[kind].mimeType;
}

export function sampleFormatLabel(kind: DocumentKind) {
  return DOCUMENT_FORMATS[kind].label;
}

export function createSeededPdfQuote(
  source: PdfKnowledgeDocument,
): DocumentQuote {
  return {
    id: crypto.randomUUID(),
    documentId: source.id,
    documentName: source.file.name,
    text: MOCK_PDF_QUOTE.text,
    pageNumber: MOCK_PDF_QUOTE.pageNumber,
  };
}
