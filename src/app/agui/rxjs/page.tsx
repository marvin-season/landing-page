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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ThreadItem = {
  id: string;
  title: string | null;
  resourceId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type ThreadListResponse = {
  threads?: unknown[];
};

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // ignore json parse failure and fall back
  }
  return `${fallback} (${response.status})`;
}

export default function RxjsPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/thread?perPage=false");
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "加载会话列表失败"));
      }
      const data = (await response.json()) as ThreadListResponse;
      const list = Array.isArray(data.threads) ? data.threads : [];
      setThreads(
        list
          .map((item) => {
            const t = item as Partial<ThreadItem>;
            if (!t.id || typeof t.id !== "string") return null;
            const resolvedResourceId =
              typeof t.resourceId === "string" && t.resourceId.trim().length > 0
                ? t.resourceId
                : t.id;
            return {
              id: t.id,
              title: typeof t.title === "string" ? t.title : null,
              resourceId: resolvedResourceId,
              createdAt: typeof t.createdAt === "string" ? t.createdAt : null,
              updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : null,
            } satisfies ThreadItem;
          })
          .filter((item): item is ThreadItem => item !== null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载会话列表失败");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleStartSession = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    const resourceId = crypto.randomUUID();
    const threadId = resourceId;
    const title = `会话-${nanoid(6)}`;

    try {
      const response = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, threadId, title }),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "创建会话失败"));
      }
      const data = (await response.json()) as {
        thread?: { resourceId?: unknown; id?: unknown };
      };
      const createdResourceId =
        typeof data.thread?.resourceId === "string" &&
        data.thread.resourceId.trim().length > 0
          ? data.thread.resourceId
          : typeof data.thread?.id === "string" &&
              data.thread.id.trim().length > 0
            ? data.thread.id
            : resourceId;
      await fetchThreads();
      router.push(`/agui/rxjs/${createdResourceId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建会话失败");
    } finally {
      setCreating(false);
    }
  }, [creating, fetchThreads, router]);

  const handleRename = useCallback(
    async (threadId: string) => {
      const title = editingTitle.trim();
      if (!title) return;
      setUpdatingId(threadId);
      setError(null);
      try {
        const response = await fetch("/api/thread", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, title }),
        });
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "重命名失败"));
        }
        setEditingId(null);
        setEditingTitle("");
        await fetchThreads();
      } catch (e) {
        setError(e instanceof Error ? e.message : "重命名失败");
      } finally {
        setUpdatingId(null);
      }
    },
    [editingTitle, fetchThreads],
  );

  const handleDelete = useCallback(
    async (threadId: string) => {
      setDeletingId(threadId);
      setError(null);
      try {
        const response = await fetch("/api/thread", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "删除会话失败"));
        }
        if (editingId === threadId) {
          setEditingId(null);
          setEditingTitle("");
        }
        await fetchThreads();
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除会话失败");
      } finally {
        setDeletingId(null);
      }
    },
    [editingId, fetchThreads],
  );

  const handleSwitch = useCallback(
    (thread: ThreadItem) => {
      router.push(`/agui/rxjs/${thread.resourceId}`);
    },
    [router],
  );

  const renderTime = (value: string | null) => {
    if (!value) return "未知时间";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 pt-4">
      <Card className="sticky top-4 z-20 border-border/80 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">RxJS 会话管理</CardTitle>
          <CardDescription>
            支持会话的创建、查询、重命名、删除，并可切换进入指定会话。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              onClick={handleStartSession}
              disabled={creating}
              className="gap-2 rounded-full"
            >
              {creating ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <MessageSquarePlus className="size-5" aria-hidden />
              )}
              新建会话
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={fetchThreads}
              disabled={loading}
              className="gap-2 rounded-full"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-5" aria-hidden />
              )}
              刷新列表
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">会话列表</CardTitle>
          <CardDescription>
            {loading ? "加载中…" : `共 ${threads.length} 条会话`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              正在加载会话列表…
            </div>
          ) : threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无会话，点击上方“新建会话”开始。
            </p>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-3"
              >
                {editingId === thread.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      placeholder="输入会话标题"
                      className="min-w-0 flex-1"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRename(thread.id)}
                        disabled={
                          updatingId === thread.id || !editingTitle.trim()
                        }
                      >
                        {updatingId === thread.id ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          "保存"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingTitle("");
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {thread.title ?? thread.id}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        resourceId: {thread.resourceId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        更新于 {renderTime(thread.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => handleSwitch(thread)}>
                        进入会话
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingId(thread.id);
                          setEditingTitle(thread.title ?? "");
                        }}
                        aria-label="重命名会话"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDelete(thread.id)}
                        disabled={deletingId === thread.id}
                        className="text-destructive hover:text-destructive"
                        aria-label="删除会话"
                      >
                        {deletingId === thread.id ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Trash2 className="size-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
