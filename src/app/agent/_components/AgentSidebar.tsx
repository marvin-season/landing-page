"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Menu, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTRPC } from "@/lib/trpc";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

function ThreadListContent({
  onItemClick,
  className,
}: {
  onItemClick?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const params = useParams();
  const threadId = typeof params.threadId === "string" ? params.threadId : null;
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
      const tid = data.thread?.id;
      if (tid) {
        onItemClick?.();
        router.push(`/agent/${tid}`);
      }
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
      if (threadId === variables.threadId) {
        onItemClick?.();
        router.push("/agent");
      }
    },
  });

  const handleNewChat = useCallback(() => {
    createMutation.mutate(undefined);
  }, [createMutation]);

  const handleRename = useCallback(
    (id: string) => {
      const t = editTitle.trim();
      if (!t) return;
      updateMutation.mutate({ threadId: id, title: t });
    },
    [editTitle, updateMutation],
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      deleteMutation.mutate({ threadId: id });
    },
    [deleteMutation],
  );

  const error =
    listError?.message ??
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message ??
    null;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="shrink-0 p-3">
        <Button
          className="w-full justify-center gap-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
          新建对话
        </Button>
      </div>

      {error && (
        <div className="mx-3 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : threads.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            暂无会话
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id}>
                {editing === t.id ? (
                  <div
                    className="flex items-center gap-1 rounded-lg bg-sidebar-accent/50 p-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="会话标题"
                      className="h-8 flex-1 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(t.id);
                        if (e.key === "Escape") {
                          setEditing(null);
                          setEditTitle("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleRename(t.id)}
                      disabled={
                        (updateMutation.isPending &&
                          updateMutation.variables?.threadId === t.id) ||
                        !editTitle.trim()
                      }
                    >
                      {updateMutation.isPending &&
                      updateMutation.variables?.threadId === t.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "保存"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditing(null);
                        setEditTitle("");
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Link
                    href={`/agent/${t.id}`}
                    onClick={onItemClick}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      threadId === t.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t.title ?? "新对话"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dayjs(t.updatedAt).fromNow()}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditing(t.id);
                          setEditTitle(t.title ?? "");
                        }}
                        aria-label="重命名"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDelete(t.id, e)}
                        disabled={
                          deleteMutation.isPending &&
                          deleteMutation.variables?.threadId === t.id
                        }
                        aria-label="删除"
                      >
                        {deleteMutation.isPending &&
                        deleteMutation.variables?.threadId === t.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AgentSidebar() {
  const pathname = usePathname();
  const isAgentRoute = pathname.startsWith("/agent");
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <ThreadListContent />
    </aside>
  );

  const mobileHeader = (
    <header className="flex h-14 shrink-0 items-center border-b border-border/60 bg-background/95 px-4 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="打开会话列表">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar p-0"
        >
          <ThreadListContent onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="ml-2 text-sm font-medium">Agent</span>
    </header>
  );

  return (
    <>
      {isAgentRoute && sidebarContent}
      {isAgentRoute && mobileHeader}
    </>
  );
}
