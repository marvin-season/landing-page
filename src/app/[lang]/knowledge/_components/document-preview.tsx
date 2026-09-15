"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText, Loader2, Quote, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DocumentQuote,
  type KnowledgeDocument,
  MAX_QUOTE_CHARACTERS,
  normalizeQuoteRects,
} from "./document-model";
import { useMarkdownCitationHighlight } from "./markdown-citation-highlight/use-markdown-citation-highlight";

function PreviewLoading() {
  return (
    <div
      className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
      <Trans>Loading preview…</Trans>
    </div>
  );
}

const PdfPreview = dynamic(() => import("./pdf-preview"), {
  ssr: false,
  loading: PreviewLoading,
});
const DocumentMarkdown = dynamic(() => import("./document-markdown"), {
  loading: PreviewLoading,
});

export function DocumentPreview({
  document: source,
  pageNumber,
  onPageChange,
  onError,
  onQuote,
  activeQuote,
}: {
  document: KnowledgeDocument;
  pageNumber: number;
  onPageChange: (page: number) => void;
  onError: (message: string) => void;
  onQuote: (quote: DocumentQuote) => void;
  activeQuote: DocumentQuote | null;
}) {
  const { t } = useLingui();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [article, setArticle] = useState<HTMLElement | null>(null);
  const [markdownReady, setMarkdownReady] = useState(false);
  const [selection, setSelection] = useState<{
    text: string;
    pageNumber?: number;
    rects?: DocumentQuote["rects"];
  } | null>(null);
  const onMarkdownRendered = useCallback(() => setMarkdownReady(true), []);
  const citationQuote =
    activeQuote?.documentId === source.id ? activeQuote : null;
  const markdownQuery = useMemo(() => {
    if (source.kind !== "markdown" || !citationQuote) return null;
    const quote = citationQuote.text;
    if (!quote.trim()) return null;
    return { documentId: citationQuote.documentId, quote };
  }, [source.kind, citationQuote]);

  useMarkdownCitationHighlight({
    article: markdownReady ? article : null,
    container: scrollContainer,
    query: markdownQuery,
    currentDocumentId: source.id,
  });

  useEffect(() => {
    let frame = 0;
    const updateSelection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const selected = window.getSelection();
        const root = rootRef.current;
        if (
          !selected ||
          !root ||
          selected.isCollapsed ||
          !selected.rangeCount
        ) {
          setSelection(null);
          return;
        }
        const range = selected.getRangeAt(0);
        const start =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element)
            : range.startContainer.parentElement;
        const end =
          range.endContainer.nodeType === Node.ELEMENT_NODE
            ? (range.endContainer as Element)
            : range.endContainer.parentElement;
        if (
          !start ||
          !end ||
          !root.contains(start) ||
          !root.contains(end) ||
          !start.closest("[data-document-content]") ||
          !end.closest("[data-document-content]")
        ) {
          setSelection(null);
          return;
        }
        const text = selected.toString().trim();
        const pageElement = start.closest<HTMLElement>("[data-page-number]");
        const page = pageElement?.dataset.pageNumber;
        const rects = pageElement
          ? normalizeQuoteRects(
              range.getClientRects(),
              pageElement.getBoundingClientRect(),
            )
          : undefined;
        setSelection(
          text
            ? { text, pageNumber: page ? Number(page) : undefined, rects }
            : null,
        );
      });
    };
    document.addEventListener("selectionchange", updateSelection);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", updateSelection);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      {source.kind !== "pdf" ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
          <FileText className="size-4 shrink-0 text-primary" />
          <h2 className="text-sm font-medium">
            <Trans>Document preview</Trans>
          </h2>
          <span className="ml-auto text-xs text-muted-foreground">
            <Trans>Select text to quote</Trans>
          </span>
        </div>
      ) : null}
      {source.kind === "pdf" ? (
        <PdfPreview
          file={source.file}
          documentId={source.id}
          pageNumber={pageNumber}
          onPageChange={onPageChange}
          onError={onError}
          activeQuote={citationQuote}
        />
      ) : (
        <div
          ref={setScrollContainer}
          className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/20 p-4 sm:p-6"
        >
          <article
            ref={setArticle}
            data-document-content
            className="relative min-h-full rounded-lg border border-border/40 bg-card p-5 shadow-sm sm:p-8"
          >
            <DocumentMarkdown
              content={source.markdown ?? ""}
              onRendered={onMarkdownRendered}
            />
          </article>
        </div>
      )}
      <AnimatePresence>
        {selection ? (
          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="absolute inset-x-4 bottom-4 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md"
            role="region"
            aria-label={t`Selected text`}
          >
            <div className="mb-3 flex items-start gap-2">
              <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                {selection.text}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6 shrink-0"
                aria-label={t`Dismiss selection`}
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setSelection(null);
                }}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            {selection.text.length > MAX_QUOTE_CHARACTERS ? (
              <p className="mb-2 text-xs text-destructive" role="status">
                <Trans>
                  Select a shorter passage (up to 4,000 characters).
                </Trans>
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={selection.text.length > MAX_QUOTE_CHARACTERS}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                onQuote({
                  id: crypto.randomUUID(),
                  documentId: source.id,
                  documentName: source.file.name,
                  ...selection,
                });
                window.getSelection()?.removeAllRanges();
                setSelection(null);
              }}
            >
              <Quote className="size-3.5" />
              <Trans>Quote in chat</Trans>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
