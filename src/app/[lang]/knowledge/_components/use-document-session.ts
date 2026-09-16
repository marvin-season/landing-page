"use client";

import { useLingui } from "@lingui/react/macro";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createKnowledgeDocument,
  getDocumentKind,
  isDocumentTooLarge,
  type KnowledgeDocument,
  readMarkdownSource,
} from "./document/model";
import { type SampleDocument, sampleFileType } from "./document/samples";

export function useDocumentSession() {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const sampleRequest = useRef<AbortController | null>(null);
  const activeDocumentId = useRef<string | null>(null);
  const dragDepth = useRef(0);
  const [source, setSource] = useState<KnowledgeDocument | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(
    () => () => {
      uploadVersion.current++;
      sampleRequest.current?.abort();
    },
    [],
  );

  const sourceId = source?.id;
  const onDocumentError = useCallback(
    (message: string) => {
      if (activeDocumentId.current === sourceId) setDocumentError(message);
    },
    [sourceId],
  );

  function beginLoad() {
    const version = ++uploadVersion.current;
    sampleRequest.current?.abort();
    sampleRequest.current = null;
    setUploadError(null);
    setReading(true);
    return version;
  }

  async function readFile(file: File, version: number) {
    const kind = getDocumentKind(file.name);
    if (!kind) return;
    const payload =
      kind === "markdown"
        ? { kind, markdown: await readMarkdownSource(file) }
        : { kind };
    if (uploadVersion.current !== version) return;
    const next = createKnowledgeDocument(crypto.randomUUID(), file, payload);
    activeDocumentId.current = next.id;
    setSource(next);
    setDocumentError(null);
  }

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
    if (isDocumentTooLarge(file, kind)) {
      setUploadError(
        t`PDF files must be under 20 MB and Markdown files under 1 MB.`,
      );
      return;
    }
    const version = beginLoad();
    try {
      await readFile(file, version);
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
    setUploadError(null);
    setDocumentError(null);
    setReading(false);
  }

  async function openSample(sample: SampleDocument) {
    const version = beginLoad();
    const controller = new AbortController();
    sampleRequest.current = controller;
    try {
      const response = await fetch(sample.path, { signal: controller.signal });
      if (!response.ok) throw new Error("Sample unavailable");
      const blob = await response.blob();
      if (uploadVersion.current !== version) return;
      await readFile(
        new File([blob], sample.name, {
          type: sampleFileType(sample.kind),
        }),
        version,
      );
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

  return {
    source,
    uploadError,
    documentError,
    reading,
    dragging,
    inputRef,
    onDocumentError,
    upload,
    openSample,
    removeDocument,
    dropTargetProps: {
      onDragEnter(event: DragEvent<HTMLElement>) {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      },
      onDragOver(event: DragEvent<HTMLElement>) {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault();
        void upload(event.dataTransfer.files);
      },
    },
  };
}
