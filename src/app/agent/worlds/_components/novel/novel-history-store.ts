import Dexie, { liveQuery, type Table } from "dexie";
import type { ChapterTextRange } from "./chapter-text";
import type { Chapter } from "./model";
import type { PlotMode } from "./plot-edit";
import type { ThinkingHistoryEntry } from "./thinking-history";

export type HistoryOperation =
  | { kind: "continuation"; chapter: Chapter; afterId?: string | null }
  | { kind: "rewrite"; range?: ChapterTextRange }
  | { kind: "chapter-save"; afterId: string | null }
  | { kind: PlotMode; beforeId?: string }
  | { kind: "summary" };

type HistorySummary = Omit<ThinkingHistoryEntry, "task" | "status"> & {
  key: string;
  kind?: "chapter-save";
  status: ThinkingHistoryEntry["status"] | "running";
  hasResult: boolean;
  incomplete?: boolean;
};

type HistoryContent = {
  operation: HistoryOperation;
  sources: Chapter[];
  raw: string;
  results?: Chapter[];
};

type HistoryDetail = Omit<HistoryContent, "sources"> & {
  key: string;
  id: string;
  sources: { id: string; title: string; hash: string }[];
};

type Snapshot = { key: string; hash: string; text: string };

const db = new Dexie("world-novel-history");
db.version(1).stores({
  entries: "[key+id], [key+createdAt+id], key",
  details: "[key+id], key",
  snapshots: "[key+hash], key",
});
const entries: Table<HistorySummary> = db.table("entries");
const details: Table<HistoryDetail> = db.table("details");
const snapshots: Table<Snapshot> = db.table("snapshots");

type HistoryCursor = Pick<HistorySummary, "createdAt" | "id">;

async function historyPage(key: string, cursor?: HistoryCursor, size = 20) {
  const rows = await entries
    .where("[key+createdAt+id]")
    .between(
      [key, 0, ""],
      cursor
        ? [key, cursor.createdAt, cursor.id]
        : [key, Number.MAX_SAFE_INTEGER, "\uffff"],
      true,
      false,
    )
    .reverse()
    .limit(size + 1)
    .toArray();
  return {
    entries: rows.slice(0, size),
    next: rows.length > size ? rows[size - 1] : undefined,
  };
}

export function observeNovelHistory(key: string, cursor?: HistoryCursor) {
  return liveQuery(() => historyPage(key, cursor));
}

export async function readNovelHistory(key: string, id: string) {
  return db.transaction("r", details, snapshots, async () => {
    const detail = await details.get([key, id]);
    if (!detail) return undefined;
    const rows = await snapshots.bulkGet(
      detail.sources.map(({ hash }) => [key, hash]),
    );
    const sources = detail.sources.map(({ id, title }, index) => {
      const snapshot = rows[index];
      if (!snapshot) throw new Error("找不到本轮写作的原文。");
      return { id, title, text: snapshot.text };
    });
    return { ...detail, sources } satisfies HistoryContent;
  });
}

async function textHash(text: string) {
  // UTF-16 code units preserve the exact source, including lone surrogates.
  const units = Uint16Array.from({ length: text.length }, (_, i) =>
    text.charCodeAt(i),
  );
  const hash = await crypto.subtle.digest("SHA-256", units);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function startNovelHistory(
  entry: HistorySummary,
  operation: HistoryOperation,
  chapters: Chapter[],
  result?: Pick<HistoryContent, "raw" | "results">,
) {
  const hashes = await Promise.all(chapters.map(({ text }) => textHash(text)));
  const { key, id } = entry;
  await db.transaction("rw", entries, details, snapshots, async () => {
    if (await entries.get([key, id])) return;
    const existing = await snapshots.bulkGet(hashes.map((hash) => [key, hash]));
    await snapshots.bulkPut(
      chapters.flatMap(({ text }, i) =>
        existing[i] ? [] : [{ key, hash: hashes[i], text }],
      ),
    );
    await details.put({
      key,
      id,
      operation,
      sources: chapters.map(({ id, title }, i) => ({
        id,
        title,
        hash: hashes[i],
      })),
      raw: "",
      ...result,
    });
    await entries.put(entry);
  });
}

export async function saveNovelHistoryResult(
  key: string,
  id: string,
  status: HistorySummary["status"],
  raw: string,
  {
    phase,
    tools,
    answer,
    error,
    incomplete,
    results,
  }: Pick<
    HistorySummary,
    "phase" | "tools" | "answer" | "error" | "incomplete"
  > &
    Pick<HistoryContent, "results">,
) {
  await db.transaction("rw", entries, details, async () => {
    const [entry, detail] = await Promise.all([
      entries.get([key, id]),
      details.get([key, id]),
    ]);
    if (!entry || !detail) throw new Error("找不到本轮写作记录。");
    if (entry.status !== "running" && status === "running") return;
    if (entry.status === "completed" && status !== "completed") return;
    const result = raw || detail.raw;
    await details.put({
      ...detail,
      raw: result,
      results: results ?? detail.results,
    });
    await entries.put({
      ...entry,
      status,
      phase: phase ?? entry.phase,
      tools,
      answer,
      error,
      incomplete:
        incomplete || (status !== "completed" && Boolean(result.trim())),
      hasResult: Boolean(result.trim() || results?.length),
    });
  });
}

async function exportRows<T>(table: Table<T>, key: string) {
  const chunks: Blob[] = [];
  let batch: string[] = [];
  let first = true;
  await table
    .where("key")
    .equals(key)
    .each((row) => {
      batch.push(first ? "" : ",", JSON.stringify(row));
      first = false;
      if (batch.length >= 40) {
        chunks.push(new Blob(batch));
        batch = [];
      }
    });
  if (batch.length) chunks.push(new Blob(batch));
  return chunks;
}

export async function exportNovelHistory(
  key: string,
  legacy: ThinkingHistoryEntry[] = [],
) {
  return db.transaction("r", entries, details, snapshots, async () => {
    const [entryRows, detailRows, snapshotRows] = await Promise.all([
      exportRows(entries, key),
      exportRows(details, key),
      exportRows(snapshots, key),
    ]);
    return new Blob(
      [
        `{"version":1,"exportedAt":${Date.now()},"entries":[`,
        ...entryRows,
        '],"details":[',
        ...detailRows,
        '],"snapshots":[',
        ...snapshotRows,
        '],"legacy":',
        JSON.stringify(legacy),
        "}",
      ],
      { type: "application/json" },
    );
  });
}

export type { HistoryContent, HistoryCursor, HistorySummary };
