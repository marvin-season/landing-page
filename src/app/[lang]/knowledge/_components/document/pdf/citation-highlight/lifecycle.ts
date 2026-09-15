import {
  type Implementation,
  resolveHighlighter,
} from "./highlighters/resolve";
import { createCitationHighlight } from "./session";
import type { CitationQuery, PdfCitationViewer } from "./viewer";

export function attachCitationLifecycle(options: {
  viewer: PdfCitationViewer;
  query: CitationQuery;
  currentDocumentId: string;
  enabled: boolean;
  implementation: Implementation;
}): () => void {
  const { viewer, query, currentDocumentId, enabled, implementation } = options;
  if (
    !enabled ||
    !query ||
    query.documentId !== currentDocumentId ||
    !viewer.isDocumentLoaded ||
    !Number.isInteger(query.page) ||
    query.page < 1 ||
    query.page > viewer.numPages
  ) {
    return () => {};
  }

  const page = viewer.getPageElement(query.page - 1);
  const container = viewer.getScrollContainer();
  if (!page || !container) return () => {};

  const { highlight, clear } = createCitationHighlight(
    page,
    query.quote,
    container,
    resolveHighlighter(implementation),
  );

  let frame: number | undefined;
  let observer: MutationObserver;

  const observePage = () =>
    observer.observe(page, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"],
    });

  const scheduleHighlight = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      observer.disconnect();
      try {
        highlight();
      } finally {
        observePage();
      }
    });
  };

  observer = new MutationObserver(scheduleHighlight);
  observePage();
  const unsubscribe = viewer.onPageOrTextLayerRendered((page1) => {
    if (page1 === query.page) scheduleHighlight();
  });
  scheduleHighlight();

  return () => {
    observer.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    clear();
    unsubscribe();
  };
}
