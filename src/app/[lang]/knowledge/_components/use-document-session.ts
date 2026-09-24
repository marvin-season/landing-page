"use client";

import { useLingui } from "@lingui/react/macro";
import { useSessionStorageState } from "ahooks";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
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
import {
  canPersistUpload,
  createSampleSnapshot,
  createUploadSnapshot,
  DOCUMENT_SESSION_KEY,
  documentFromUpload,
  findStoredSample,
  type PersistedDocument,
  parsePersistedDocument,
} from "./document-session-storage";

export function useDocumentSession() {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const sampleRequest = useRef<AbortController | null>(null);
  const activeDocumentId = useRef<string | null>(null);
  const dragDepth = useRef(0);
  const [persisted, setPersisted] = useSessionStorageState<
    PersistedDocument | undefined
  >(DOCUMENT_SESSION_KEY, {
    defaultValue: undefined,
    getInitialValueInEffect: true,
    deserializer: parsePersistedDocument,
    onError() {},
  });
  const [source, setSource] = useState<KnowledgeDocument | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const restoredUpload = useMemo(() => {
    if (source || persisted?.origin !== "upload") return null;
    return documentFromUpload(persisted);
  }, [persisted, source]);
  const resolvedSource = source ?? restoredUpload;

  useEffect(
    () => () => {
      uploadVersion.current++;
      sampleRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (resolvedSource) activeDocumentId.current = resolvedSource.id;
  }, [resolvedSource]);

  const restoreSampleId =
    resolvedSource || persisted?.origin !== "sample" ? undefined : persisted.id;
  const restoreSamplePath =
    resolvedSource || persisted?.origin !== "sample"
      ? undefined
      : persisted.path;

  useEffect(() => {
    if (!restoreSampleId || !restoreSamplePath) return;
    const sample = findStoredSample(restoreSamplePath);
    const version = ++uploadVersion.current;
    sampleRequest.current?.abort();
    const controller = new AbortController();
    sampleRequest.current = controller;
    setUploadError(null);
    setReading(true);

    void (async () => {
      try {
        if (!sample) throw new Error("sample");
        const response = await fetch(sample.path, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Sample unavailable");
        const blob = await response.blob();
        if (uploadVersion.current !== version) return;
        const file = new File([blob], sample.name, {
          type: sampleFileType(sample.kind),
        });
        const kind = getDocumentKind(file.name);
        if (!kind) return;
        const payload =
          kind === "markdown"
            ? { kind, markdown: await readMarkdownSource(file) }
            : { kind };
        if (uploadVersion.current !== version) return;
        setSource(createKnowledgeDocument(restoreSampleId, file, payload));
        setDocumentError(null);
      } catch {
        if (uploadVersion.current === version && !controller.signal.aborted) {
          setPersisted(undefined);
          setUploadError(t`The sample could not be loaded. Please try again.`);
        }
      } finally {
        if (uploadVersion.current === version) {
          sampleRequest.current = null;
          setReading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [restoreSampleId, restoreSamplePath, setPersisted, t]);

  const sourceId = resolvedSource?.id;
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

  async function persistUpload(document: KnowledgeDocument, version: number) {
    if (!canPersistUpload(document)) {
      if (uploadVersion.current === version) setPersisted(undefined);
      return;
    }
    try {
      const snapshot = await createUploadSnapshot(document);
      if (uploadVersion.current === version) setPersisted(snapshot);
    } catch {
      if (uploadVersion.current === version) setPersisted(undefined);
    }
  }

  async function readFile(
    file: File,
    version: number,
    id = crypto.randomUUID(),
  ) {
    const kind = getDocumentKind(file.name);
    if (!kind) return;
    const payload =
      kind === "markdown"
        ? { kind, markdown: await readMarkdownSource(file) }
        : { kind };
    if (uploadVersion.current !== version) return;
    const next = createKnowledgeDocument(id, file, payload);
    activeDocumentId.current = next.id;
    setSource(next);
    setDocumentError(null);
    return next;
  }

  async function loadSample(
    sample: SampleDocument,
    version: number,
    id: string,
  ) {
    const controller = new AbortController();
    sampleRequest.current = controller;
    try {
      const response = await fetch(sample.path, { signal: controller.signal });
      if (!response.ok) throw new Error("Sample unavailable");
      const blob = await response.blob();
      if (uploadVersion.current !== version) return;
      return await readFile(
        new File([blob], sample.name, {
          type: sampleFileType(sample.kind),
        }),
        version,
        id,
      );
    } finally {
      if (uploadVersion.current === version) sampleRequest.current = null;
    }
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
      const next = await readFile(file, version);
      if (next) await persistUpload(next, version);
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
    setPersisted(undefined);
    setSource(null);
    setUploadError(null);
    setDocumentError(null);
    setReading(false);
  }

  async function openSample(sample: SampleDocument) {
    const version = beginLoad();
    try {
      const next = await loadSample(sample, version, crypto.randomUUID());
      if (next && uploadVersion.current === version) {
        setPersisted(createSampleSnapshot(next.id, sample));
      }
    } catch {
      if (uploadVersion.current === version) {
        setUploadError(t`The sample could not be loaded. Please try again.`);
      }
    } finally {
      if (uploadVersion.current === version) setReading(false);
    }
  }

  return {
    source: resolvedSource,
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
