import type { PDFDocumentProxy } from "pdfjs-dist";

export type CitationQuery = {
  documentId: string;
  page: number;
  quote: string;
};

export type PdfCitationViewer = {
  readonly isDocumentLoaded: boolean;
  readonly numPages: number;
  getPageElement(pageIndex0: number): HTMLDivElement | undefined;
  getScrollContainer(): HTMLDivElement;
  goToPage(page1: number): void;
  onPageOrTextLayerRendered(listener: (page1: number) => void): () => void;
};

export type ReactPdfCitationViewer = PdfCitationViewer & {
  notifyRendered: (page1: number) => void;
};

export function createReactPdfCitationViewer(host: {
  getDocument: () => PDFDocumentProxy | null;
  getPageHost: () => HTMLDivElement | null;
  getScrollContainer: () => HTMLDivElement | null;
  goToPage: (page1: number) => void;
}): ReactPdfCitationViewer {
  const listeners = new Set<(page1: number) => void>();

  return {
    get isDocumentLoaded() {
      return host.getDocument() != null;
    },
    get numPages() {
      return host.getDocument()?.numPages ?? 0;
    },
    getPageElement(pageIndex0) {
      const pageHost = host.getPageHost();
      if (!pageHost) return undefined;
      if (Number(pageHost.dataset.pageNumber) !== pageIndex0 + 1)
        return undefined;
      return pageHost;
    },
    getScrollContainer() {
      return host.getScrollContainer() as HTMLDivElement;
    },
    goToPage(page1) {
      host.goToPage(page1);
    },
    onPageOrTextLayerRendered(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notifyRendered(page1) {
      for (const listener of listeners) listener(page1);
    },
  };
}
