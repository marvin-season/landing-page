import { useEffect } from "react";
import { CITATION_HIGHLIGHT_IMPLEMENTATION } from "./highlighters/resolve";
import { attachCitationLifecycle } from "./lifecycle";
import type { CitationQuery, PdfCitationViewer } from "./viewer";

export function usePdfCitationHighlight({
  viewer,
  query,
  currentDocumentId,
  enabled,
  pageElement,
}: {
  viewer: PdfCitationViewer;
  query: CitationQuery | null;
  currentDocumentId: string;
  enabled: boolean;
  pageElement: HTMLDivElement | null;
}) {
  useEffect(() => {
    if (!query || !pageElement) return;
    return attachCitationLifecycle({
      viewer,
      query,
      currentDocumentId,
      enabled,
      implementation: CITATION_HIGHLIGHT_IMPLEMENTATION,
    });
  }, [viewer, query, currentDocumentId, enabled, pageElement]);
}
