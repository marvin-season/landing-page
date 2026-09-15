"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { DocumentQuote } from "../model";
import { usePdfCitationHighlight } from "./citation-highlight/use-pdf-citation-highlight";
import {
  type CitationQuery,
  createReactPdfCitationViewer,
} from "./citation-highlight/viewer";

const assetPath = `/pdfjs/${pdfjs.version}/`;
pdfjs.GlobalWorkerOptions.workerSrc = `${assetPath}pdf.worker.min.mjs`;
const pdfOptions = {
  cMapUrl: `${assetPath}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${assetPath}standard_fonts/`,
  wasmUrl: `${assetPath}wasm/`,
  isEvalSupported: false,
};

type PdfPreviewProps = {
  file: File;
  documentId: string;
  pageNumber: number;
  onPageChange: (page: number) => void;
  onError: (message: string) => void;
  activeQuote: DocumentQuote | null;
};

export default function PdfPreview({
  file,
  documentId,
  pageNumber,
  onPageChange,
  onError,
  activeQuote,
}: PdfPreviewProps) {
  const { t } = useLingui();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageHost, setPageHost] = useState<HTMLDivElement | null>(null);
  const [passwordRequest, setPasswordRequest] = useState<{
    submit: (password: string) => void;
    incorrect: boolean;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [renderError, setRenderError] = useState(false);
  const pdfRef = useRef(pdf);
  pdfRef.current = pdf;
  const pageHostRef = useRef(pageHost);
  pageHostRef.current = pageHost;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const viewer = useMemo(
    () =>
      createReactPdfCitationViewer({
        getDocument: () => pdfRef.current,
        getPageHost: () => pageHostRef.current,
        getScrollContainer: () => containerRef.current,
        goToPage: (page1) => onPageChangeRef.current(page1),
      }),
    [],
  );

  const query = useMemo((): CitationQuery | null => {
    if (!activeQuote) return null;
    const page = activeQuote.pageNumber;
    const quote = activeQuote.text;
    if (
      !quote.trim() ||
      typeof page !== "number" ||
      !Number.isInteger(page) ||
      page < 1
    )
      return null;
    return {
      documentId: activeQuote.documentId,
      page,
      quote,
    };
  }, [activeQuote]);

  usePdfCitationHighlight({
    viewer,
    query,
    currentDocumentId: documentId,
    enabled: query !== null,
    pageElement: pageHost,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0)
        setWidth(Math.max(120, Math.floor(entry.contentRect.width - 32)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const loading = (
    <div
      className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
      <Trans>Loading PDF…</Trans>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 py-2 overflow-x-auto">
        <div
          className="flex min-w-0 items-center gap-2"
          title={t`Select text to quote`}
        >
          <FileText className="size-4 shrink-0 text-primary" />
          <h2 className="sr-only text-sm font-medium sm:not-sr-only sm:truncate">
            <Trans>Document preview</Trans>
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t`Previous page`}
            disabled={!pdf || pageNumber <= 1}
            onClick={() => onPageChange(pageNumber - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">
              <Trans>Page number</Trans>
            </span>
            <input
              key={pageNumber}
              type="number"
              min={1}
              max={pdf?.numPages ?? 1}
              defaultValue={pageNumber}
              disabled={!pdf}
              className="h-8 w-12 rounded-md border border-border bg-background text-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onBlur={(event) => {
                const next = Number(event.currentTarget.value);
                if (
                  Number.isInteger(next) &&
                  next >= 1 &&
                  next <= (pdf?.numPages ?? 1)
                )
                  onPageChange(next);
                else event.currentTarget.value = String(pageNumber);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <span>/ {pdf?.numPages ?? "—"}</span>
          </label>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t`Next page`}
            disabled={!pdf || pageNumber >= pdf.numPages}
            onClick={() => onPageChange(pageNumber + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t`Zoom out`}
            disabled={zoom <= 0.5}
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 tabular-nums"
            title={t`Fit to width`}
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t`Zoom in`}
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/40 p-4"
      >
        {passwordRequest ? (
          <form
            className="mx-auto my-8 flex max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-5"
            onSubmit={(event) => {
              event.preventDefault();
              passwordRequest.submit(password);
              setPasswordRequest(null);
              setPassword("");
            }}
          >
            <LockKeyhole className="size-6 text-primary" />
            <label htmlFor="pdf-password" className="text-sm">
              <Trans>This PDF is password protected.</Trans>
            </label>
            {passwordRequest.incorrect ? (
              <p className="text-xs text-destructive" role="alert">
                <Trans>Incorrect password. Please try again.</Trans>
              </p>
            ) : null}
            <input
              id="pdf-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" disabled={!password}>
              <Trans>Unlock PDF</Trans>
            </Button>
          </form>
        ) : null}
        <Document
          file={file}
          options={pdfOptions}
          suspense={false}
          loading={passwordRequest ? null : loading}
          error={
            <p className="p-6 text-center text-sm text-destructive">
              <Trans>This PDF could not be opened. Try another file.</Trans>
            </p>
          }
          onLoadSuccess={setPdf}
          onLoadError={() =>
            onError(t`This PDF could not be opened. Try another file.`)
          }
          onSourceError={() =>
            onError(t`This PDF could not be opened. Try another file.`)
          }
          onPassword={(submit, reason) =>
            setPasswordRequest({
              submit,
              incorrect: reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD,
            })
          }
          onItemClick={({ pageNumber: page }) => {
            if (page) onPageChange(page);
          }}
          externalLinkTarget="_blank"
          externalLinkRel="noopener noreferrer"
        >
          {pdf && width > 0 ? (
            <div
              key={pageNumber}
              ref={setPageHost}
              data-document-content
              data-page-number={pageNumber}
              className="mx-auto w-fit shadow-sm relative"
            >
              <Page
                pageNumber={pageNumber}
                width={width}
                scale={zoom}
                renderTextLayer
                renderAnnotationLayer
                loading={loading}
                onRenderSuccess={() => {
                  setRenderError(false);
                  viewer.notifyRendered(pageNumber);
                }}
                onRenderTextLayerSuccess={() => {
                  viewer.notifyRendered(pageNumber);
                }}
                onRenderError={() => setRenderError(true)}
                error={
                  <p className="p-6 text-sm text-destructive">
                    <Trans>This page could not be rendered.</Trans>
                  </p>
                }
              />
            </div>
          ) : null}
        </Document>
        {renderError ? (
          <p className="p-4 text-center text-sm text-destructive" role="alert">
            <Trans>This page could not be rendered.</Trans>
          </p>
        ) : null}
      </div>
    </div>
  );
}
