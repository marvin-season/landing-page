"use client";

import { isDevelopment } from "@landing-page/utils";
import Dexie, { type Table } from "dexie";
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
import { migrateChapterEditorDraft } from "./chapter-editor-drafts";
import {
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
const novels: Table<{ key: string; novel: Novel; previous?: Novel }, string> =
  db.table("novels");

export function addNovelCopy(key: string, novel: Novel) {
  return novels.add({ key, novel });
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
  const latest = useRef(novel);
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
  configRef.current = room.config;
  roomIdRef.current = room.id;
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
      isDevelopment ? loadServerNovel(roomIdRef.current) : null,
    ])
      .then(async ([saved, server]) => {
        if (!active) return;
        let novel = saved?.novel ?? createNovel(configRef.current);
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
          await novels.put({
            key,
            novel,
            previous: previousRef.current,
          });
        }
        if (!active) return;
        latest.current = novel;
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
          if (restored.mode === "rewrite") {
            try {
              if (current && current.text !== restored.text)
                await migrateChapterEditorDraft(key, current.id, restored.text);
              if (active) backup.clear();
            } catch {
              if (active) setDraftBackupFailed(true);
            }
          } else if (current) {
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
            ? restorePendingResult(pending, latest.current, configRef.current)
            : null;
          if (pending && !restoredPending) pendingBackup.clear();
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

  function update(next: Novel, { persistFirst = false, touch = true } = {}) {
    next = invalidateEditedCheckpoint(latest.current, next);
    if (
      touch &&
      exportNovel(latest.current, "txt") !== exportNovel(next, "txt")
    ) {
      next = { ...next, updatedAt: Date.now() };
    }
    const previous = previousRef.current;
    function publish() {
      onUpdate();
      latest.current = next;
      setNovel(next);
      publishSync(next);
    }
    if (!persistFirst) publish();
    setSaving(true);
    const write = writes.current.then(async () => {
      await novels.put({ key, novel: next, previous });
      if (persistFirst) publish();
      if (latest.current === next) setSaving(false);
    });
    writes.current = write.catch(() => {
      setSaving(false);
      setError("小说未能保存到本机，请先导出章节，避免刷新后丢失。");
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
    return update({
      ...current,
      title: context.title,
      style: context.style,
      outline: context.outline,
    });
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
