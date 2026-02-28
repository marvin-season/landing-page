"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/lib/trpc";

function fmtTime(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function RxjsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const {
    data: threads = [],
    isLoading: loading,
    error: listError,
    refetch,
  } = useQuery(trpc.thread.list.queryOptions());

  const createMutation = useMutation({
    ...trpc.thread.create.mutationOptions(),
    onSuccess: (data) => {
      refetch();
      const threadId = data.thread?.id;
      if (threadId) router.push(`/agui/rxjs/${threadId}`);
    },
  });

  const updateMutation = useMutation({
    ...trpc.thread.update.mutationOptions(),
    onSuccess: () => {
      setEditing(null);
      setEditTitle("");
      refetch();
    },
  });

  const deleteMutation = useMutation({
    ...trpc.thread.delete.mutationOptions(),
    onSuccess: (_, variables) => {
      if (editing === variables.threadId) {
        setEditing(null);
        setEditTitle("");
      }
      refetch();
    },
  });

  const error =
    listError?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null;

  const create = useCallback(() => {
    createMutation.mutate(undefined);
  }, [createMutation]);

  const rename = useCallback(
    (threadId: string) => {
      const t = editTitle.trim();
      if (!t) return;
      updateMutation.mutate({ threadId, title: t });
    },
    [editTitle, updateMutation],
  );

  const remove = useCallback(
    (threadId: string) => {
      deleteMutation.mutate({ threadId });
    },
    [deleteMutation],
  );

  const goTo = useCallback(
    (threadId: string) => router.push(`/agui/rxjs/${threadId}`),
    [router],
  );

  const threadList = threads;
  console.log(threadList);
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
              disabled={createMutation.isPending}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="size-4" />
              )}
              新建会话
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => refetch()}
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
              {loading ? "加载中…" : `共 ${threadList.length} 条`}
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
          ) : threadList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
              暂无会话，点击上方「新建会话」开始
            </div>
          ) : (
            <ul className="space-y-3">
              {threadList.map((t) => (
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
                          onClick={() => rename(t.id)}
                          disabled={
                            (updateMutation.isPending &&
                              updateMutation.variables?.threadId === t.id) ||
                            !editTitle.trim()
                          }
                        >
                          {updateMutation.isPending &&
                          updateMutation.variables?.threadId === t.id ? (
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
                        <Button size="sm" onClick={() => goTo(t.id)}>
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
                          onClick={() => remove(t.id)}
                          disabled={
                            deleteMutation.isPending &&
                            deleteMutation.variables?.threadId === t.id
                          }
                          aria-label="删除"
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables?.threadId === t.id ? (
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
