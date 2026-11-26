"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { NovelRunStatus } from "@/lib/group-chat/novel-run-contract";
import {
  cancelNovelRun,
  clearNovelRun,
  followNovelRun,
  type NovelRunRecord,
  type NovelRunRequest,
  RunHttpError,
  readNovelRun,
  replaceNovelRun,
} from "./novel-run-client";

type ActiveRun<T> = {
  entry: NovelRunRecord<T>;
  controller: AbortController;
  persisted: boolean;
  stopping?: boolean;
  following?: boolean;
  terminal?: boolean;
};

export function useNovelTask<T>({
  key,
  storageReady,
  onRestore,
  onText,
  onTools,
  onPhase,
  onResult,
  onError,
}: {
  key: string;
  storageReady: boolean;
  onRestore: (entry: NovelRunRecord<T>) => boolean;
  onText: (text: string) => void;
  onTools?: (tools: NonNullable<NovelRunStatus["tools"]>) => void;
  onPhase?: (phase: NovelRunStatus["phase"]) => void;
  onResult: (
    version: number,
    snapshot?: NovelRunStatus,
    error?: string,
  ) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const [checkedKey, setCheckedKey] = useState<string>();
  const [reconnecting, setReconnecting] = useState(false);
  const session = useMemo(
    () => ({
      key,
      active: null as ActiveRun<T> | null,
      journalId: undefined as string | undefined,
      writes: Promise.resolve(),
    }),
    [key],
  );

  function queueJournal(work: () => Promise<void>) {
    const pending = session.writes.then(work);
    session.writes = pending.catch(() => {});
    return pending;
  }

  function removeJournal(runId: string) {
    return queueJournal(async () => {
      await clearNovelRun(key, runId);
      if (session.journalId === runId) session.journalId = undefined;
    });
  }

  async function deliver(
    operation: ActiveRun<T>,
    snapshot?: NovelRunStatus,
    message?: string,
    keepJournal = false,
  ) {
    if (session.active !== operation || operation.terminal) return;
    operation.terminal = true;
    setReconnecting(false);
    try {
      const saved = onResult(
        operation.entry.request.version,
        snapshot,
        message,
      );
      // The result can synchronously start another compression batch.
      if (session.active !== operation) return;
      await queueJournal(async () => {
        if (
          !(await saved) ||
          keepJournal ||
          operation.controller.signal.aborted
        )
          return;
        const { runId } = operation.entry.request;
        await clearNovelRun(key, runId);
        if (session.journalId === runId) session.journalId = undefined;
      });
    } catch {
      onError("任务结果未能保存到本机，请刷新后重新恢复。");
    } finally {
      operation.controller.abort();
      if (session.active === operation) session.active = null;
    }
  }

  function follow(operation: ActiveRun<T>, resumed: boolean) {
    if (operation.following) return;
    operation.following = true;
    const { controller, entry } = operation;
    void followNovelRun(entry, {
      signal: controller.signal,
      resumed,
      onConnection: setReconnecting,
      onUpdate(snapshot) {
        if (session.active !== operation || operation.terminal) return;
        if (snapshot.status === "running") {
          onText(snapshot.text);
          onTools?.(snapshot.tools ?? []);
          onPhase?.(snapshot.phase);
        } else void deliver(operation, snapshot);
      },
    })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          void deliver(
            operation,
            undefined,
            error instanceof Error ? error.message : "无法恢复生成。",
            error instanceof RunHttpError && error.status === 401,
          );
      })
      .finally(() => {
        operation.following = false;
      });
  }

  function start(request: Omit<NovelRunRequest, "runId">, run: T) {
    const entry: NovelRunRecord<T> = {
      key,
      createdAt: Date.now(),
      request: { ...request, runId: crypto.randomUUID() },
      run,
    };
    const operation: ActiveRun<T> = {
      entry,
      controller: new AbortController(),
      persisted: false,
    };
    session.active = operation;
    setReconnecting(false);
    void queueJournal(async () => {
      if (operation.controller.signal.aborted) return;
      if (!(await replaceNovelRun(entry, session.journalId)))
        throw new Error("另一页面正在处理此作品的生成，请刷新后查看。");
      session.journalId = entry.request.runId;
      operation.persisted = true;
      if (
        !operation.controller.signal.aborted &&
        !operation.terminal &&
        !operation.stopping
      )
        follow(operation, false);
    }).catch((error: unknown) => {
      if (!operation.controller.signal.aborted)
        void deliver(
          operation,
          undefined,
          error instanceof Error
            ? error.message
            : "无法保存任务，请检查浏览器存储。",
        );
    });
  }

  const restore = useEffectEvent((entry: NovelRunRecord<T>) => {
    session.journalId = entry.request.runId;
    if (!onRestore(entry)) {
      void removeJournal(entry.request.runId).catch(() => {});
      return;
    }
    const operation: ActiveRun<T> = {
      entry,
      controller: new AbortController(),
      persisted: true,
    };
    session.active = operation;
    follow(operation, true);
  });
  const restoreFailed = useEffectEvent(() => {
    onError("无法读取本机的生成任务，请检查浏览器存储后刷新。");
  });

  useEffect(() => {
    if (!storageReady) return;
    let mounted = true;
    void readNovelRun<T>(key)
      .then((entry) => {
        if (mounted && entry) restore(entry);
      })
      .catch(() => {
        if (mounted) restoreFailed();
      })
      .finally(() => {
        if (mounted) setCheckedKey(key);
      });
    return () => {
      mounted = false;
      session.active?.controller.abort();
    };
  }, [key, session, storageReady]);

  function stop() {
    const operation = session.active;
    if (!operation || operation.stopping || operation.terminal) return;
    operation.stopping = true;
    void cancelNovelRun(
      operation.entry.request,
      operation.controller.signal,
    ).then(
      (snapshot) => deliver(operation, snapshot),
      () => {
        if (
          session.active !== operation ||
          operation.controller.signal.aborted ||
          operation.terminal
        )
          return;
        operation.stopping = false;
        onError("未能停止生成，请检查网络后再试。");
        if (operation.persisted) follow(operation, true);
      },
    );
  }

  return {
    ready: storageReady && checkedKey === key,
    reconnecting,
    start,
    stop,
  };
}
