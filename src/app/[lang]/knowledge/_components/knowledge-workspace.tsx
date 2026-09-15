"use client";

import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  FolderOpen,
  Loader2,
  Replace,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentChat, type KnowledgeMessage } from "./document-chat";
import {
  type DocumentContent,
  type DocumentQuote,
  formatFileSize,
  getDocumentKind,
  type KnowledgeDocument,
  limitDocumentContent,
  MAX_MARKDOWN_BYTES,
  MAX_PDF_BYTES,
} from "./document-model";
import { DocumentPreview } from "./document-preview";

const sampleDocuments = [
  {
    path: "/knowledge/examples/letters-to-the-lighthouse.pdf",
    name: "灯塔来信_5000字扩写版.pdf",
    title: "灯塔来信 · Letters to the Lighthouse",
    format: "PDF",
    type: "application/pdf",
  },
  {
    path: "/knowledge/examples/reading-notes.md",
    name: "阅读与知识笔记.md",
    title: "把阅读变成自己的知识",
    format: "Markdown",
    type: "text/markdown",
  },
] as const;

const MOCK_PDF_QUOTE = {
  pageNumber: 1,
  text: `外婆学英文的样子忽然浮上心头。她会把 breakfast 念得像两块饼干掉在桌上，却坚持每天记五个
词，说码头来的外国船员越来越多，总不能只会摆手。小时候的林夏嫌她发音奇怪，后来出国旅行
，收到她的消息，也总是匆忙回复一个表情。如今那本卷边的单词簿还摊着，铅笔横在页缝里，仿
佛主人只是出去买了一袋盐。`,
} as const;

export function KnowledgeWorkspace() {
  const { t } = useLingui();
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const sampleRequest = useRef<AbortController | null>(null);
  const activeDocumentId = useRef<string | null>(null);
  const dragDepth = useRef(0);
  const [source, setSource] = useState<KnowledgeDocument | null>(null);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [quote, setQuote] = useState<DocumentQuote | null>(null);
  const [activeQuote, setActiveQuote] = useState<DocumentQuote | null>(null);
  const [messages, setMessages] = useState<KnowledgeMessage[]>([]);
  const seededQuoteDocumentId = useRef<string | null>(null);

  useEffect(
    () => () => {
      uploadVersion.current++;
      sampleRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!source || source.kind !== "pdf") return;
    if (seededQuoteDocumentId.current === source.id) return;
    seededQuoteDocumentId.current = source.id;
    setMessages((current) => {
      if (current.length > 0) return current;
      return [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: t`I pulled a passage from this document. Click it to highlight the original text.`,
          quote: {
            id: crypto.randomUUID(),
            documentId: source.id,
            documentName: source.file.name,
            text: MOCK_PDF_QUOTE.text,
            pageNumber: MOCK_PDF_QUOTE.pageNumber,
          },
        },
      ];
    });
  }, [source, t]);

  const sourceId = source?.id;
  const onDocumentError = useCallback(
    (message: string) => {
      if (activeDocumentId.current === sourceId) setDocumentError(message);
    },
    [sourceId],
  );

  async function upload(files: FileList | File[]) {
    setDragging(false);
    dragDepth.current = 0;
    if (files.length !== 1) {
      setUploadError(t`Please choose one document at a time.`);
      return;
    }
    const file = files[0];
    const kind = getDocumentKind(file.name);
    if (!kind) {
      setUploadError(t`Please upload a PDF or Markdown file.`);
      return;
    }
    if (!file.size) {
      setUploadError(t`This file is empty. Please choose another file.`);
      return;
    }
    if (file.size > (kind === "pdf" ? MAX_PDF_BYTES : MAX_MARKDOWN_BYTES)) {
      setUploadError(
        t`PDF files must be under 20 MB and Markdown files under 1 MB.`,
      );
      return;
    }
    const version = ++uploadVersion.current;
    sampleRequest.current?.abort();
    sampleRequest.current = null;
    setUploadError(null);
    setReading(true);
    try {
      let markdown: string | undefined;
      if (kind === "markdown") {
        const bytes = await file.arrayBuffer();
        markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!markdown.trim()) throw new Error("empty");
        if (markdown.includes("\0")) throw new Error("binary");
      }
      if (uploadVersion.current !== version) return;
      const id = crypto.randomUUID();
      activeDocumentId.current = id;
      setSource({ id, file, kind, markdown });
      setContent(
        markdown === undefined ? null : limitDocumentContent(markdown),
      );
      setDocumentError(null);
      setPageNumber(1);
      setQuote(null);
      setActiveQuote(null);
      setMessages([]);
    } catch {
      if (uploadVersion.current === version)
        setUploadError(
          t`This file could not be read. Use a valid UTF-8 Markdown file.`,
        );
    } finally {
      if (uploadVersion.current === version) setReading(false);
    }
  }

  function removeDocument() {
    uploadVersion.current++;
    sampleRequest.current?.abort();
    sampleRequest.current = null;
    activeDocumentId.current = null;
    setSource(null);
    setContent(null);
    setQuote(null);
    setActiveQuote(null);
    setMessages([]);
    setUploadError(null);
    setDocumentError(null);
    setReading(false);
  }

  async function openSample(sample: (typeof sampleDocuments)[number]) {
    const version = ++uploadVersion.current;
    sampleRequest.current?.abort();
    const controller = new AbortController();
    sampleRequest.current = controller;
    setUploadError(null);
    setReading(true);
    try {
      const response = await fetch(sample.path, { signal: controller.signal });
      if (!response.ok) throw new Error("Sample unavailable");
      const blob = await response.blob();
      if (uploadVersion.current !== version) return;
      await upload([
        new File([blob], sample.name, {
          type: sample.type,
        }),
      ]);
    } catch {
      if (uploadVersion.current === version && !controller.signal.aborted) {
        setUploadError(t`The sample could not be loaded. Please try again.`);
      }
    } finally {
      if (uploadVersion.current === version) {
        sampleRequest.current = null;
        setReading(false);
      }
    }
  }

  const notice =
    documentError ??
    (content && !content.text
      ? t`No selectable text was found. Scanned PDFs need OCR before text-based questions can be answered.`
      : content?.truncated
        ? t`This is a long document. The first 60,000 characters are prepared for chat; quote a specific passage to include text from later pages.`
        : undefined);

  return (
    <section
      aria-label={t`Default workspace`}
      className="relative flex min-h-0 flex-1 flex-col"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        void upload(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.md,.markdown,application/pdf,text/markdown"
        className="sr-only"
        tabIndex={-1}
        aria-label={t`Upload document`}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) void upload(files);
        }}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/70">
            <FolderOpen className="size-4 text-primary" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-medium">
              <Trans>Default workspace</Trans>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Trans>No account needed · PDF & Markdown</Trans>
            </p>
          </div>
        </div>
        {source ? (
          <div className="flex max-w-full items-center gap-2">
            <span
              className="max-w-40 truncate text-xs text-muted-foreground"
              title={source.file.name}
            >
              {source.file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(source.file.size)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
            >
              <Replace className="size-3.5" />
              <Trans>Replace</Trans>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={t`Remove document`}
              onClick={removeDocument}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {uploadError ? (
        <p
          className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive shrink-0 max-h-24 overflow-y-auto"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {source ? (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-sm shinchan:matte-surface min-h-0 flex-1"
          >
            <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2 overflow-y-auto">
              <div
                id="knowledge-panel-document"
                className="min-h-[420px] min-w-0 flex-col flex border-b border-border/60 lg:border-r lg:border-border/60 h-[65dvh] lg:h-auto lg:min-h-0 lg:border-b-0"
              >
                <DocumentPreview
                  document={source}
                  pageNumber={pageNumber}
                  onPageChange={setPageNumber}
                  onError={onDocumentError}
                  onQuote={setQuote}
                  onPrompt={(selectedQuote, text) => {
                    setQuote(null);
                    setMessages((previous) => [
                      ...previous,
                      {
                        id: crypto.randomUUID(),
                        role: "user",
                        text,
                        quote: selectedQuote,
                      },
                    ]);
                  }}
                  activeQuote={activeQuote}
                />
              </div>
              <div
                id="knowledge-panel-chat"
                className="min-h-[420px] min-w-0 flex-col flex h-[65dvh] lg:h-auto lg:min-h-0"
              >
                <DocumentChat
                  quote={quote}
                  onQuoteChange={setQuote}
                  messages={messages}
                  busy={false}
                  error={null}
                  notice={notice}
                  onSubmit={(text, selectedQuote) =>
                    setMessages((previous) => [
                      ...previous,
                      {
                        id: crypto.randomUUID(),
                        role: "user",
                        text,
                        quote: selectedQuote ?? undefined,
                      },
                    ])
                  }
                  onStop={() => {}}
                  onRetry={() => {}}
                  onLocate={(selectedQuote) => {
                    if (selectedQuote.documentId !== source.id) return;
                    if (selectedQuote.pageNumber)
                      setPageNumber(selectedQuote.pageNumber);
                    setActiveQuote({ ...selectedQuote });
                  }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="group flex min-h-100 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center transition-colors duration-300 hover:border-primary/50 hover:bg-primary/3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait motion-reduce:transition-none"
            >
              <span className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
                {reading ? (
                  <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Upload className="size-6" />
                )}
              </span>
              <span className="text-xl font-medium">
                <Trans>Bring a document. Start a conversation.</Trans>
              </span>
              <span className="mt-3 text-sm leading-6 text-muted-foreground">
                <Trans>
                  Drop a PDF or Markdown file here, or click to browse.
                </Trans>
              </span>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                <Trans>PDF up to 20 MB · Markdown up to 1 MB</Trans>
              </span>
            </button>
            <div className="mt-4 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground">
                <Trans>Try a sample document</Trans>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {sampleDocuments.map((sample) => (
                  <button
                    key={sample.path}
                    type="button"
                    disabled={reading}
                    onClick={() => void openSample(sample)}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <FileText
                      className="size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span
                        className="block truncate text-sm font-medium"
                        title={sample.title}
                      >
                        {sample.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {sample.name}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                      {sample.format}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-sm">
          <p className="flex items-center gap-3 text-sm font-medium text-primary">
            <Upload className="size-5" />
            <Trans>Drop to open this document</Trans>
          </p>
        </div>
      ) : null}
      {reading && source ? (
        <p
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground shrink-0"
          role="status"
        >
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          <Trans>Reading document…</Trans>
        </p>
      ) : null}
    </section>
  );
}
