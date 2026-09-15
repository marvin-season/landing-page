import { createMarkdownCitationHighlight } from "./session";

export type MarkdownCitationQuery = {
  documentId: string;
  quote: string;
};

export function attachMarkdownCitationLifecycle(options: {
  article: HTMLElement;
  container: HTMLElement;
  query: MarkdownCitationQuery;
  currentDocumentId: string;
}): () => void {
  const { article, container, query, currentDocumentId } = options;
  if (query.documentId !== currentDocumentId || !query.quote.trim()) {
    return () => {};
  }

  const { highlight, clear } = createMarkdownCitationHighlight(
    article,
    query.quote,
    container,
  );

  let frame: number | undefined;
  const scheduleHighlight = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      highlight();
    });
  };

  scheduleHighlight();
  const observer = new ResizeObserver(scheduleHighlight);
  observer.observe(article);

  return () => {
    observer.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
    clear();
  };
}
