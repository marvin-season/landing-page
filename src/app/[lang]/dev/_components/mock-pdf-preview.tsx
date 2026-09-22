"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  SAMPLE_DOCUMENTS,
  sampleFileType,
} from "../../knowledge/_components/document/samples";

const assetPath = `/pdfjs/${pdfjs.version}/`;
pdfjs.GlobalWorkerOptions.workerSrc = `${assetPath}pdf.worker.min.mjs`;
const pdfOptions = {
  cMapUrl: `${assetPath}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${assetPath}standard_fonts/`,
  wasmUrl: `${assetPath}wasm/`,
  isEvalSupported: false,
};

const MOCK_PDF = SAMPLE_DOCUMENTS.find((sample) => sample.kind === "pdf")!;

export function MockPdfPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(MOCK_PDF.path, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        setFile(
          new File([blob], MOCK_PDF.name, {
            type: sampleFileType("pdf"),
          }),
        );
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) {
        setWidth(Math.max(120, Math.floor(entry.contentRect.width - 32)));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const loading = (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
      Loading PDF…
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-auto bg-muted/40 p-4">
      {error ? (
        <p className="p-6 text-center text-sm text-destructive">
          This PDF could not be opened.
        </p>
      ) : null}
      {file ? (
        <Document
          file={file}
          options={pdfOptions}
          suspense={false}
          loading={loading}
          error={
            <p className="p-6 text-center text-sm text-destructive">
              This PDF could not be opened.
            </p>
          }
          onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
          onLoadError={() => setError(true)}
          onSourceError={() => setError(true)}
        >
          {width > 0
            ? Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index + 1}
                  className="mx-auto mb-4 w-fit shadow-sm last:mb-0"
                >
                  <Page
                    pageNumber={index + 1}
                    width={width}
                    renderTextLayer
                    renderAnnotationLayer={false}
                    loading={loading}
                  />
                </div>
              ))
            : null}
        </Document>
      ) : error ? null : (
        loading
      )}
    </div>
  );
}
