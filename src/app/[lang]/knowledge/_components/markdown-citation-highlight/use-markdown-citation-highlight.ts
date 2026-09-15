import { useEffect } from "react";
import {
  attachMarkdownCitationLifecycle,
  type MarkdownCitationQuery,
} from "./lifecycle";

export function useMarkdownCitationHighlight({
  article,
  container,
  query,
  currentDocumentId,
}: {
  article: HTMLElement | null;
  container: HTMLElement | null;
  query: MarkdownCitationQuery | null;
  currentDocumentId: string;
}) {
  useEffect(() => {
    if (!query || !article || !container) return;
    return attachMarkdownCitationLifecycle({
      article,
      container,
      query,
      currentDocumentId,
    });
  }, [article, container, query, currentDocumentId]);
}
