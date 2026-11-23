import { applyServerExport } from "./import-novel";
import { exportNovel, type Novel } from "./model";

export type ServerNovel = {
  text: string;
  fileName: string;
  updatedAt: number;
};

export type NovelServerSyncHost = {
  busy: () => boolean;
  lock: { current: Promise<unknown> | null };
  novel: () => Novel;
  roomId: () => string;
  server: { current: ServerNovel | null };
  previous: { current: Novel | undefined };
  rememberBackup: (novel: Novel | undefined) => void;
  publish: (novel: Novel) => void;
  update: (
    novel: Novel,
    options?: { persistFirst?: boolean; touch?: boolean },
  ) => Promise<boolean>;
  clearDraft: () => void;
};

export async function loadServerNovel(id: string) {
  const response = await fetch(
    `/api/novel/save-txt?id=${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("无法读取服务器上的小说。");
  const data = (await response.json()) as {
    text?: unknown;
    fileName?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof data.text !== "string" ||
    typeof data.fileName !== "string" ||
    typeof data.updatedAt !== "number"
  )
    throw new Error("无法读取服务器上的小说。");
  return {
    text: data.text,
    fileName: data.fileName,
    updatedAt: data.updatedAt,
  };
}

async function locked<T>(host: NovelServerSyncHost, work: () => Promise<T>) {
  if (host.lock.current) throw new Error("正在同步，请稍候。");
  if (host.busy()) throw new Error("正在生成或读取小说，请稍后再同步。");
  const run = work();
  host.lock.current = run;
  try {
    return await run;
  } finally {
    host.lock.current = null;
  }
}

export function saveNovelToServer(host: NovelServerSyncHost) {
  return locked(host, async () => {
    const submitted = host.novel();
    const text = exportNovel(submitted, "txt");
    const response = await fetch("/api/novel/save-txt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: host.roomId(),
        title: submitted.title,
        text,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      path?: string;
      fileName?: string;
      updatedAt?: number;
    };
    if (!response.ok || typeof data.updatedAt !== "number")
      throw new Error(data.error || "保存到服务器失败。");
    const fileName =
      typeof data.fileName === "string" ? data.fileName : "小说.txt";
    const current = host.novel();
    host.server.current = { text, fileName, updatedAt: data.updatedAt };
    if (exportNovel(current, "txt") !== text) {
      host.publish(current);
      throw new Error("保存期间本地正文又有修改，服务器上是刚才提交的那一版。");
    }
    const next = {
      ...current,
      updatedAt: data.updatedAt,
      syncedAt: data.updatedAt,
    };
    if (!(await host.update(next, { touch: false, persistFirst: true }))) {
      host.publish(host.novel());
      throw new Error("服务器已写入，但本机同步时间未能保存。");
    }
    return data.path || "data/novels";
  });
}

export function syncNovelFromServer(host: NovelServerSyncHost) {
  return locked(host, async () => {
    const server = await loadServerNovel(host.roomId());
    if (!server) throw new Error("服务器上还没有这本小说。");
    const current = host.novel();
    const prior = host.previous.current;
    if (exportNovel(current, "txt") !== server.text) {
      host.rememberBackup(structuredClone(current));
    }
    host.server.current = server;
    const next = {
      ...applyServerExport(current, server.text, server.fileName),
      updatedAt: server.updatedAt,
      syncedAt: server.updatedAt,
    };
    if (!(await host.update(next, { touch: false, persistFirst: true }))) {
      host.rememberBackup(prior);
      host.publish(host.novel());
      throw new Error("服务器内容未能写入本机，本地正文仍保留。");
    }
    host.clearDraft();
  });
}

export function restoreNovelBackup(host: NovelServerSyncHost) {
  return locked(host, async () => {
    const previous = host.previous.current;
    if (!previous) throw new Error("没有可恢复的本地备份。");
    const current = host.novel();
    host.rememberBackup(structuredClone(current));
    const restored = structuredClone(previous);
    const server = host.server.current;
    if (server && exportNovel(restored, "txt") === server.text) {
      restored.updatedAt = server.updatedAt;
      restored.syncedAt = server.updatedAt;
    } else {
      restored.updatedAt = Date.now();
      restored.syncedAt = current.syncedAt;
    }
    if (!(await host.update(restored, { touch: false, persistFirst: true }))) {
      host.rememberBackup(previous);
      throw new Error("本地备份未能恢复。");
    }
    host.clearDraft();
  });
}
