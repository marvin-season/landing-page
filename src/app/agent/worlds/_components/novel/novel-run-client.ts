import Dexie, { type Table } from "dexie";
import {
  type NovelRunStatus,
  novelRunStatus,
} from "@/lib/group-chat/novel-run-contract";
import type { NovelTask } from "./model";

export type NovelRunRequest = {
  roomId: string;
  runId: string;
  version: number;
  task: NovelTask;
  prompt: string;
};

export type NovelRunRecord<T> = {
  key: string;
  createdAt: number;
  request: NovelRunRequest;
  run: T;
};

const db = new Dexie("world-novel-runs");
db.version(1).stores({ runs: "key" });
const records: Table<NovelRunRecord<unknown>, string> = db.table("runs");

export function readNovelRun<T>(key: string) {
  return records.get(key) as Promise<NovelRunRecord<T> | undefined>;
}

export function replaceNovelRun<T>(
  entry: NovelRunRecord<T>,
  previousId?: string,
) {
  return db.transaction("rw", records, async () => {
    const previous = await records.get(entry.key);
    if (previous?.request.runId !== previousId) return false;
    await records.put(entry);
    return true;
  });
}

export function clearNovelRun(key: string, runId: string) {
  return db.transaction("rw", records, async () => {
    if ((await records.get(key))?.request.runId === runId)
      await records.delete(key);
  });
}

export class RunHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestNovelRun(
  request: NovelRunRequest,
  method: "GET" | "POST" | "DELETE",
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  const url =
    method === "POST"
      ? "/api/novel"
      : `/api/novel?${new URLSearchParams({ roomId: request.roomId, runId: request.runId })}`;
  const response = await fetcher(url, {
    method,
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
    ...(method === "POST"
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }
      : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new RunHttpError(
      response.status,
      response.status === 413
        ? "HTTP 413"
        : data?.error || `HTTP ${response.status}`,
    );
  }
  return response;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function followNovelRun(
  entry: Pick<NovelRunRecord<unknown>, "request" | "createdAt">,
  {
    signal,
    resumed,
    onUpdate,
    onConnection,
    fetcher = fetch,
    delay = wait,
  }: {
    signal: AbortSignal;
    resumed: boolean;
    onUpdate: (snapshot: NovelRunStatus) => void;
    onConnection: (reconnecting: boolean) => void;
    fetcher?: typeof fetch;
    delay?: typeof wait;
  },
) {
  const maySubmit = () => Date.now() - entry.createdAt < 10 * 60 * 1000;
  let needsSubmit = !resumed;
  let known = false;
  let retries = 0;
  while (!signal.aborted) {
    if (needsSubmit && !maySubmit())
      throw new Error("生成请求未能确认，已停止重试。");
    let snapshot: NovelRunStatus;
    try {
      if (needsSubmit) {
        await requestNovelRun(entry.request, "POST", signal, fetcher);
        needsSubmit = false;
        known = true;
      }
      const response = await requestNovelRun(
        entry.request,
        "GET",
        signal,
        fetcher,
      );
      snapshot = novelRunStatus.parse(await response.json());
      signal.throwIfAborted();
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof RunHttpError) {
        if (error.status === 404 && !known && !needsSubmit && maySubmit()) {
          // The page may have closed before its first POST reached the server.
          needsSubmit = true;
          continue;
        }
        if (error.status < 500 && error.status !== 408) throw error;
      }
      onConnection(true);
      await delay(Math.min(8_000, 800 * 2 ** retries), signal);
      retries++;
      continue;
    }
    known = true;
    retries = 0;
    onConnection(false);
    onUpdate(snapshot);
    if (snapshot.status !== "running") return;
    await delay(900, signal);
  }
}

export async function cancelNovelRun(
  request: NovelRunRequest,
  signal: AbortSignal,
) {
  const response = await requestNovelRun(request, "DELETE", signal, fetch);
  return novelRunStatus.parse(await response.json());
}
