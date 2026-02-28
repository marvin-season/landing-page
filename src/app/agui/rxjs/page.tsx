"use client";

import {
  Loader2,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/request";

type Thread = {
  id: string;
  resourceId: string;
  title: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function parseError(res: Response, fallback: string): Promise<string> {
  return res
    .json()
    .then((d: { error?: string }) =>
      typeof d?.error === "string" && d.error
        ? d.error
        : `${fallback} (${res.status})`,
    )
    .catch(() => `${fallback} (${res.status})`);
}

function fmtTime(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function RxjsPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/thread?perPage=false");
      if (!res.ok) throw new Error(await parseError(res, "加载失败"));
      const data = (await res.json()) as { threads?: unknown[] };
      const arr = Array.isArray(data.threads) ? data.threads : [];
      setThreads(
        arr.map((t) => {
          const x = t as Record<string, unknown>;
          const id = typeof x.id === "string" ? x.id : "";
          const rid =
            typeof x.resourceId === "string" && x.resourceId
              ? x.resourceId
              : id;
          return {
            id,
            resourceId: rid,
            title: typeof x.title === "string" ? x.title : null,
            createdAt: typeof x.createdAt === "string" ? x.createdAt : null,
            updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : null,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    const resourceId = crypto.randomUUID();
    const title = `会话-${nanoid(6)}`;
    try {
      const data = await request<{ thread?: { resourceId?: string } }>(
        "/api/thread",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceId, threadId: resourceId, title }),
        },
      );
      const rid = data.thread?.resourceId ?? resourceId;
      await load();
      router.push(`/agui/rxjs/${rid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }, [creating, load, router]);

  const rename = useCallback(
    async (thread: Thread) => {
      const t = editTitle.trim();
      if (!t) return;
      setUpdating(thread.id);
      setError(null);
      try {
        await request<{ thread?: { resourceId?: string } }>("/api/thread", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: thread.id,
            resourceId: thread.resourceId,
            title: t,
          }),
        });
        setEditing(null);
        setEditTitle("");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "重命名失败");
      } finally {
        setUpdating(null);
      }
    },
    [editTitle, load],
  );

  const remove = useCallback(
    async (thread: Thread) => {
      setDeleting(thread.id);
      setError(null);
      try {
        await request<{ thread?: { resourceId?: string } }>("/api/thread", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: thread.id,
            resourceId: thread.resourceId,
          }),
        });
        if (editing === thread.id) {
          setEditing(null);
          setEditTitle("");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败");
      } finally {
        setDeleting(null);
      }
    },
    [editing, load],
  );

  const goTo = useCallback(
    (t: Thread) => router.push(`/agui/rxjs/${t.resourceId}`),
    [router],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            RxJS 会话管理
          </h1>
          <p className="text-sm text-muted-foreground">
            创建、查看、重命名或删除会话，点击「进入」开始对话
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              onClick={create}
              disabled={creating}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="size-4" />
              )}
              新建会话
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={load}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              刷新
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              {loading ? "加载中…" : `共 ${threads.length} 条`}
            </h2>
          </div>

          {error && (
            <p
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载会话列表…
            </div>
          ) : threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
              暂无会话，点击上方「新建会话」开始
            </div>
          ) : (
            <ul className="space-y-3">
              {threads.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-border/70 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                >
                  {editing === t.id ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="会话标题"
                        className="flex-1"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => rename(t)}
                          disabled={updating === t.id || !editTitle.trim()}
                        >
                          {updating === t.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "保存"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(null);
                            setEditTitle("");
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {t.title ?? t.id}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          更新于 {fmtTime(t.updatedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" onClick={() => goTo(t)}>
                          进入
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(t.id);
                            setEditTitle(t.title ?? "");
                          }}
                          aria-label="重命名"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove(t)}
                          disabled={deleting === t.id}
                          aria-label="删除"
                        >
                          {deleting === t.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
