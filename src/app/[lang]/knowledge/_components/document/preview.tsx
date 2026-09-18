"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Languages, Loader2, Quote, Text, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  type DocumentQuote,
  type KnowledgeDocument,
  MAX_QUOTE_CHARACTERS,
  normalizeQuoteRects,
} from "./model";
import {
  TRANSLATION_INSTRUCTIONS,
  TRANSLATION_LANGUAGE_OPTIONS,
  type TranslationLanguage,
  useTranslationLanguage,
} from "./translation-language";

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

const PdfPreview = dynamic(() => import("./pdf/preview"), {
  ssr: false,
  loading: PreviewLoading,
});
const MarkdownPreview = dynamic(() => import("./markdown/preview"), {
  loading: PreviewLoading,
});

function DocumentKindPreview({
  source,
  pageNumber,
  onPageChange,
  onError,
  activeQuote,
}: {
  source: KnowledgeDocument;
  pageNumber: number;
  onPageChange: (page: number) => void;
  onError: (message: string) => void;
  activeQuote: DocumentQuote | null;
}) {
  switch (source.kind) {
    case "pdf":
      return (
        <PdfPreview
          file={source.file}
          documentId={source.id}
          pageNumber={pageNumber}
          onPageChange={onPageChange}
          onError={onError}
          activeQuote={
            activeQuote?.documentId === source.id ? activeQuote : null
          }
        />
      );
    case "markdown":
      return <MarkdownPreview content={source.markdown} />;
  }
}

function TranslationLanguagePicker({
  value,
  onChange,
}: {
  value: TranslationLanguage;
  onChange: (value: TranslationLanguage) => void;
}) {
  const { t } = useLingui();
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] text-muted-foreground">
        <Trans>Translate to</Trans>
      </p>
      <div
        className="grid grid-cols-4 gap-1"
        role="radiogroup"
        aria-label={t`Translate to`}
      >
        {TRANSLATION_LANGUAGE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "subtle" : "ghost"}
            className="h-7 min-w-0 px-1 text-[11px] truncate"
            role="radio"
            aria-checked={value === option.value}
            aria-label={option.label}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function DocumentPreview({
  document: source,
  onError,
  onQuote,
  onPrompt,
  locateQuote,
  busy = false,
}: {
  document: KnowledgeDocument;
  onError: (message: string) => void;
  onQuote: (quote: DocumentQuote) => void;
  onPrompt: (quote: DocumentQuote, text: string) => void;
  locateQuote: DocumentQuote | null;
  busy?: boolean;
}) {
  const { t, i18n } = useLingui();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useTranslationLanguage();
  const [pageNumber, setPageNumber] = useState(1);
  const [selection, setSelection] = useState<{
    text: string;
    pageNumber?: number;
    rects?: DocumentQuote["rects"];
  } | null>(null);
  const activeQuote =
    locateQuote?.documentId === source.id ? locateQuote : null;

  useEffect(() => {
    if (!locateQuote?.pageNumber) return;
    if (locateQuote.documentId !== source.id) return;
    setPageNumber(locateQuote.pageNumber);
  }, [locateQuote, source.id]);

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

  function quoteFromSelection() {
    if (!selection) return null;
    return {
      id: crypto.randomUUID(),
      documentId: source.id,
      documentName: source.file.name,
      ...selection,
    };
  }

  function finishSelection() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <DocumentKindPreview
        source={source}
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        onError={onError}
        activeQuote={activeQuote}
      />
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
            <TranslationLanguagePicker
              value={language}
              onChange={setLanguage}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="min-w-0 flex-1"
                disabled={busy || selection.text.length > MAX_QUOTE_CHARACTERS}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  const quote = quoteFromSelection();
                  if (!quote) return;
                  onQuote(quote);
                  finishSelection();
                }}
              >
                <Quote className="size-3.5" />
                <Trans>Chat</Trans>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-w-0 flex-1"
                disabled={busy || selection.text.length > MAX_QUOTE_CHARACTERS}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  const quote = quoteFromSelection();
                  if (!quote) return;
                  onPrompt(quote, i18n._(TRANSLATION_INSTRUCTIONS[language]));
                  finishSelection();
                }}
              >
                <Languages className="size-3.5" />
                <Trans>Translate</Trans>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-w-0 flex-1"
                disabled={busy || selection.text.length > MAX_QUOTE_CHARACTERS}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  const quote = quoteFromSelection();
                  if (!quote) return;
                  onPrompt(quote, t`Summarize this passage.`);
                  finishSelection();
                }}
              >
                <Text className="size-3.5" />
                <Trans>Summarize</Trans>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
