import {
  createKnowledgeDocument,
  DOCUMENT_FORMATS,
  type KnowledgeDocument,
} from "./document/model";
import { SAMPLE_DOCUMENTS, type SampleDocument } from "./document/samples";

export const DOCUMENT_SESSION_KEY = "knowledge:document";

/** sessionStorage quota is typically ~5 MB; base64 makes PDFs ~4/3 as large. */
export const MAX_SESSION_DOCUMENT_BYTES = 3.5 * 1024 * 1024;

export type PersistedDocument =
  | {
      v: 1;
      origin: "sample";
      id: string;
      path: string;
    }
  | {
      v: 1;
      origin: "upload";
      id: string;
      name: string;
      type: string;
      lastModified: number;
      kind: "markdown";
      markdown: string;
    }
  | {
      v: 1;
      origin: "upload";
      id: string;
      name: string;
      type: string;
      lastModified: number;
      kind: "pdf";
      data: string;
    };

export function parsePersistedDocument(
  raw: string,
): PersistedDocument | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    return isPersistedDocument(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function findStoredSample(path: string): SampleDocument | undefined {
  return SAMPLE_DOCUMENTS.find((sample) => sample.path === path);
}

export function createSampleSnapshot(
  id: string,
  sample: SampleDocument,
): PersistedDocument {
  return { v: 1, origin: "sample", id, path: sample.path };
}

export function canPersistUpload(document: KnowledgeDocument) {
  return (
    document.kind === "markdown" ||
    document.file.size <= MAX_SESSION_DOCUMENT_BYTES
  );
}

export async function createUploadSnapshot(
  document: KnowledgeDocument,
): Promise<PersistedDocument> {
  const type = document.file.type || DOCUMENT_FORMATS[document.kind].mimeType;
  const meta = {
    v: 1 as const,
    origin: "upload" as const,
    id: document.id,
    name: document.file.name,
    type,
    lastModified: document.file.lastModified,
  };
  if (document.kind === "markdown") {
    return { ...meta, kind: "markdown", markdown: document.markdown };
  }
  return { ...meta, kind: "pdf", data: await readAsBase64(document.file) };
}

export function documentFromUpload(
  record: Extract<PersistedDocument, { origin: "upload" }>,
): KnowledgeDocument {
  if (record.kind === "markdown") {
    const file = new File([record.markdown], record.name, {
      type: record.type,
      lastModified: record.lastModified,
    });
    return createKnowledgeDocument(record.id, file, {
      kind: "markdown",
      markdown: record.markdown,
    });
  }
  const file = new File([base64ToBytes(record.data)], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
  return createKnowledgeDocument(record.id, file, { kind: "pdf" });
}

function isPersistedDocument(value: unknown): value is PersistedDocument {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.v !== 1 || typeof record.id !== "string") return false;
  if (record.origin === "sample") {
    return (
      typeof record.path === "string" && Boolean(findStoredSample(record.path))
    );
  }
  if (record.origin !== "upload") return false;
  if (
    typeof record.name !== "string" ||
    typeof record.type !== "string" ||
    typeof record.lastModified !== "number"
  ) {
    return false;
  }
  if (record.kind === "markdown") {
    return typeof record.markdown === "string" && Boolean(record.markdown);
  }
  return (
    record.kind === "pdf" &&
    typeof record.data === "string" &&
    Boolean(record.data)
  );
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("read"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.readAsDataURL(file);
  });
}

function base64ToBytes(data: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
