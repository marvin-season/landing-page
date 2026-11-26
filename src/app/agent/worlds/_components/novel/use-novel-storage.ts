"use client";

import { isDevelopment } from "@landing-page/utils";
import Dexie, { liveQuery, type Table } from "dexie";
import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorldRoom } from "@/lib/group-chat/model";
import {
  type ChapterDraftBackup,
  createChapterDraftBackup,
} from "./chapter-draft-backup";
import {
  type Chapter,
  createNovel,
  exportNovel,
  invalidateEditedCheckpoint,
  type Novel,
  type NovelWritingContext,
  renameChapter as renameStoredChapter,
} from "./model";
import {
  loadServerNovel,
  restoreNovelBackup,
  type ServerNovel,
  saveNovelToServer,
  syncNovelFromServer,
} from "./novel-server-sync";
import { type NovelSyncDivergence, novelSyncStatus } from "./novel-sync";
import {
  createPendingResultBackup,
  type PendingResultBackup,
} from "./pending-result-backup";
import {
  type RestoredPendingState,
  restorePendingResult,
} from "./restore-pending-result";

const db = new Dexie("world-novels");
db.version(1).stores({ novels: "key" });
type NovelRecord = {
  key: string;
  novel: Novel;
  previous?: Novel;
  version?: string;
};
const novels: Table<NovelRecord, string> = db.table("novels");
const changedInAnotherTab =
  "另一个标签页已保存此作品。请保留手头修改，刷新后核对最新正文。";

export function addNovelCopy(key: string, novel: Novel) {
  return novels.add({ key, novel, version: crypto.randomUUID() });
}

export function getNovelCopy(key: string) {
  return novels.get(key);
}

export async function getNovelCopyByRoomId(roomId: string) {
  const exact = await novels.get(roomId);
  if (exact) return exact;
  const suffix = `:${roomId}`;
  return (
    (await novels.filter((row) => row.key.endsWith(suffix)).first()) ?? null
  );
}

export function observeNovelList(roomIds: readonly string[]) {
  const requested = new Set(roomIds);
  return liveQuery(async () => {
    const rows = await novels
      .filter(({ key }) => requested.has(key.slice(key.lastIndexOf(":") + 1)))
      .toArray();
    return new Map(
      rows.map(({ key, novel }) => [
        key.slice(key.lastIndexOf(":") + 1),
        { title: novel.title, updatedAt: novel.updatedAt },
      ]),
    );
  });
}

export function useNovelStorage(
  room: WorldRoom,
  {
    generating,
    onError: setError,
    onUpdate,
    onDraftRestored,
    onPendingRestored,
  }: {
    generating: RefObject<boolean>;
    onError: (message: string) => void;
    onUpdate: () => void;
    onDraftRestored: (draft: ChapterDraftBackup) => void;
    onPendingRestored: (
      pending: PendingResultBackup,
      restored: RestoredPendingState,
    ) => void;
  },
) {
  const key = `${room.ownerId}:${room.id}`;
  const [novel, setNovel] = useState(() => createNovel(room.config));
  const [ready, setReady] = useState(false);
  const [draftBackupFailed, setDraftBackupFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncPrompt, setSyncPrompt] = useState<NovelSyncDivergence | null>(
    null,
  );
  const [serverSynced, setServerSynced] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [missingLocal, setMissingLocal] = useState(false);
  const [syncReadFailed, setSyncReadFailed] = useState(false);
  const [conflictedPlot, setConflictedPlot] = useState<Chapter[] | null>(null);
  const latest = useRef(novel);
  const committed = useRef(novel);
  const storageVersion = useRef<string | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const previousRef = useRef<Novel | undefined>(undefined);
  const serverCopy = useRef<ServerNovel | null>(null);
  const serverSync = useRef<Promise<unknown> | null>(null);
  const backup = useMemo(
    () => createChapterDraftBackup(key, setDraftBackupFailed),
    [key],
  );
  const pendingBackup = useMemo(
    () =>
      createPendingResultBackup(
        key,
        () => window.localStorage,
        setDraftBackupFailed,
      ),
    [key],
  );
  const configRef = useRef(room.config);
  const roomIdRef = useRef(room.id);
  const roomVersionRef = useRef(room.version);
  configRef.current = room.config;
  roomIdRef.current = room.id;
  roomVersionRef.current = room.version;
  const restoreEditor = useEffectEvent(onDraftRestored);
  const restorePending = useEffectEvent(onPendingRestored);
  function publishSync(novel: Novel) {
    const status = novelSyncStatus(
      novel,
      serverCopy.current,
      exportNovel(novel, "txt"),
    );
    setSyncPrompt(status.kind === "diverged" ? status.reason : null);
    setServerSynced(status.kind === "match");
    return status;
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      novels.get(key),
      isDevelopment
        ? loadServerNovel(roomIdRef.current).catch(() => {
            if (active) setSyncReadFailed(true);
            return null;
          })
        : null,
    ])
      .then(async ([saved, server]) => {
        if (!active) return;
        let novel = saved?.novel ?? createNovel(configRef.current);
        setMissingLocal(!saved);
        storageVersion.current = saved?.version;
        previousRef.current = saved?.previous;
        setHasLocalBackup(Boolean(saved?.previous));
        serverCopy.current = server;
        const status = novelSyncStatus(
          novel,
          server,
          exportNovel(novel, "txt"),
        );
        if (
          status.kind === "match" &&
          (novel.updatedAt !== status.updatedAt ||
            novel.syncedAt !== status.updatedAt)
        ) {
          novel = {
            ...novel,
            updatedAt: status.updatedAt,
            syncedAt: status.updatedAt,
          };
        }
        if (!active) return;
        latest.current = novel;
        committed.current = novel;
        setNovel(novel);
        setSyncPrompt(status.kind === "diverged" ? status.reason : null);
        setServerSynced(status.kind === "match");
        const restored = await backup.read();
        if (!active) return;
        let restoredEditor = false;
        if (restored) {
          const current = latest.current.chapters.find(
            ({ id }) => id === restored.chapter.id,
          );
          if (current) {
            backup.clear();
          } else {
            restoreEditor(restored);
            restoredEditor = true;
          }
        }
        if (!active) return;
        if (!restoredEditor) {
          const pending = pendingBackup.read();
          const restoredPending = pending
            ? restorePendingResult(
                pending,
                latest.current,
                configRef.current,
                storageVersion.current ?? "legacy",
                roomVersionRef.current,
              )
            : null;
          if (pending && !restoredPending) {
            if (pending.kind === "plot") {
              setError(
                "正文或设定已变，旧剧情草稿无法直接应用。可从文件菜单导出待整理草稿。",
              );
              setConflictedPlot(pending.draft.chapters);
            }
            if (pending.kind !== "plot") pendingBackup.clear();
          }
          if (pending && restoredPending) {
            restorePending(pending, restoredPending);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setError("无法读取小说存档，请刷新后重试。");
      });
    return () => {
      active = false;
    };
  }, [backup, key, pendingBackup, setError]);
  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") {
        backup.flush();
        pendingBackup.flush();
      }
    }
    function flushAll() {
      backup.flush();
      pendingBackup.flush();
    }
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushAll);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flushAll();
    };
  }, [backup, pendingBackup]);

  function update(
    next: Novel,
    {
      persistFirst = false,
      touch = true,
      backupPrevious = false,
      restoreCheckpoint = false,
    } = {},
  ) {
    if (!restoreCheckpoint)
      next = invalidateEditedCheckpoint(latest.current, next);
    if (
      touch &&
      exportNovel(latest.current, "txt") !== exportNovel(next, "txt")
    ) {
      next = { ...next, updatedAt: Date.now() };
    }
    function publish() {
      onUpdate();
      latest.current = next;
      setNovel(next);
      publishSync(next);
    }
    if (!persistFirst) publish();
    setSaving(true);
    const write = writes.current.then(async () => {
      const previous = backupPrevious ? committed.current : previousRef.current;
      const version = crypto.randomUUID();
      await db.transaction("rw", novels, async () => {
        const stored = await novels.get(key);
        if (stored?.version !== storageVersion.current)
          throw new Error(changedInAnotherTab);
        await novels.put({ key, novel: next, previous, version });
      });
      committed.current = next;
      storageVersion.current = version;
      previousRef.current = previous;
      setHasLocalBackup(Boolean(previous));
      setMissingLocal(false);
      if (persistFirst) publish();
      if (latest.current === next) setSaving(false);
    });
    writes.current = write.catch((error: unknown) => {
      setSaving(false);
      setError(
        error instanceof Error && error.message === changedInAnotherTab
          ? changedInAnotherTab
          : "小说未能保存到本机，请先导出章节，避免刷新后丢失。",
      );
    });
    return write.then(
      () => true,
      () => false,
    );
  }
  function updateChapterGoal(chapterGoal: string) {
    const current = latest.current;
    if (current.chapterGoal === chapterGoal) return Promise.resolve(true);
    return update({ ...current, chapterGoal });
  }
  function renameChapter(chapterId: string, title: string) {
    const next = renameStoredChapter(latest.current, chapterId, title);
    if (!next || next === latest.current) return Promise.resolve(true);
    return update(next);
  }
  function updateContext(context: NovelWritingContext) {
    const current = latest.current;
    return update(
      {
        ...current,
        title: context.title,
        style: context.style,
        outline: context.outline,
      },
      { persistFirst: true },
    );
  }

  const syncHost = {
    busy: () => !ready || generating.current,
    lock: serverSync,
    novel: () => latest.current,
    roomId: () => roomIdRef.current,
    server: serverCopy,
    previous: previousRef,
    rememberBackup(backupNovel: Novel | undefined) {
      previousRef.current = backupNovel;
      setHasLocalBackup(Boolean(backupNovel));
    },
    publish: publishSync,
    update,
    clearDraft: () => backup.clear(),
  };

  return {
    key,
    storageVersion,
    missingLocal,
    syncReadFailed,
    conflictedPlot,
    setConflictedPlot,
    novel,
    latest,
    update,
    updateChapterGoal,
    renameChapter,
    updateContext,
    ready,
    saving,
    syncPrompt,
    serverSynced,
    hasLocalBackup,
    saveToServer: () => saveNovelToServer(syncHost),
    syncFromServer: () => syncNovelFromServer(syncHost),
    restoreLocalBackup: () => restoreNovelBackup(syncHost),
    draftBackupFailed,
    backup,
    pendingBackup,
  };
}
