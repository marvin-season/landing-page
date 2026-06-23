"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { cn } from "@landing-page/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  LogOut,
  Menu,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/lib/trpc";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

function useCreateThread(onCreated?: () => void) {
  const router = useRouter();
  const trpc = useTRPC();

  return useMutation({
    ...trpc.thread.create.mutationOptions(),
    onSuccess: (data) => {
      const threadId = data.thread?.id;
      if (threadId) {
        onCreated?.();
        router.push(`/agent/${threadId}`);
      }
    },
  });
}

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

  const createMutation = useCreateThread(() => {
    refetch();
    onItemClick?.();
  });

  const handleNewChat = useCallback(() => {
    createMutation.mutate(undefined);
  }, [createMutation]);

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
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="shrink-0 p-3">
        <Button
          className="agent-sketched-button w-full justify-center gap-3 font-bold"
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
        <div className="agent-hand-border-soft mx-3 mb-2 bg-white/70 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--agent-muted-ink)]">
            <Loader2 className="size-4 animate-spin" />
            加载中…
          </div>
        ) : threads.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--agent-muted-ink)]">
            暂无会话
          </div>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id}>
                {editing === t.id ? (
                  <div
                    className="agent-hand-border-soft agent-yellow-fill flex items-center gap-1 px-1.5 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="会话标题"
                      className="agent-sketched-input h-8 flex-1 text-sm"
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
                      className="agent-sketched-button h-8 px-2"
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
                      className="h-8 rounded-full px-2 hover:bg-black/5"
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
                      "group flex items-center gap-2 rounded-[15px_18px_14px_16px] border border-transparent px-3 py-2.5 text-sm transition-all",
                      threadId === t.id
                        ? "agent-blue-fill border-[rgba(34,32,26,0.22)] shadow-[0_4px_14px_rgba(34,32,26,0.07)]"
                        : "hover:border-[rgba(34,32,26,0.24)] hover:bg-white/45",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t.title ?? "新对话"}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--agent-muted-ink)]">
                      {dayjs(t.updatedAt).fromNow()}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-full hover:bg-white/70"
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
                        className="size-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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

type DesktopRailButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

function DesktopRailButton({
  label,
  onClick,
  children,
  disabled,
  className,
}: DesktopRailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "agent-hand-border-soft size-10 bg-white/55 hover:bg-white/80",
            className,
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function DesktopCollapsedContent({
  user,
  onExpand,
}: {
  user?: { id: string; name?: string | null; email?: string | null };
  onExpand: () => void;
}) {
  const createMutation = useCreateThread();

  return (
    <div className="agent-doodle-grid flex h-full w-full animate-in fade-in-0 flex-col items-center py-3 duration-200">
      <div className="flex w-full flex-col items-center gap-2">
        <DesktopRailButton label="展开侧边栏" onClick={onExpand}>
          <ChevronsRight className="size-4" />
        </DesktopRailButton>
        <DesktopRailButton
          label="新建对话"
          onClick={() => createMutation.mutate(undefined)}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
        </DesktopRailButton>
      </div>

      <div className="mt-auto flex w-full flex-col items-center">
        {user ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="agent-hand-border-soft flex size-10 items-center justify-center bg-white/60 text-sm font-bold text-[var(--agent-ink)] transition-colors hover:bg-white/85"
                aria-label="账户"
              >
                {(user.name || user.email || user.id || "用")
                  .slice(0, 1)
                  .toUpperCase()}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="end" className="w-56">
              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">
                  {user.name || user.email || user.id || "用户"}
                </p>
                {user.email ? (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                >
                  <LogOut className="size-4" />
                  退出登录
                </Button>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <DesktopRailButton
            label="退出登录"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          >
            <LogOut className="size-4" />
          </DesktopRailButton>
        )}
      </div>
    </div>
  );
}

type AgentSidebarProps = {
  user?: { id: string; name?: string | null; email?: string | null };
};

function UserFooter({
  user,
  className,
}: {
  user: { id: string; name?: string | null; email?: string | null };
  className?: string;
}) {
  const displayName = user.name || user.email || user.id || "用户";
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "agent-hand-border-soft flex w-full items-center gap-2 bg-white/45 px-2 py-2 text-left text-sm text-[var(--agent-muted-ink)] transition-colors hover:bg-white/75 hover:text-[var(--agent-ink)]",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{displayName}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-56">
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">{displayName}</p>
          {user.email ? (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          >
            <LogOut className="size-4" />
            退出登录
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function AgentSidebar({ user }: AgentSidebarProps) {
  const pathname = usePathname();
  const isAgentRoute = pathname.startsWith("/agent");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const desktopSidebar = (
    <aside
      className={cn(
        "agent-doodle-grid hidden h-full shrink-0 overflow-hidden border-r border-[rgba(34,32,26,0.18)] bg-[rgba(248,241,223,0.72)] text-[var(--agent-ink)] transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-14" : "w-64",
      )}
      data-collapsed={collapsed}
    >
      {collapsed ? (
        <DesktopCollapsedContent
          user={user}
          onExpand={() => setCollapsed(false)}
        />
      ) : (
        <div className="flex h-full w-64 animate-in fade-in-0 duration-200 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(34,32,26,0.16)] px-3">
            <span className="agent-scribble-title text-sm font-black">
              Agent
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="agent-hand-border-soft size-8 bg-white/45 hover:bg-white/75"
              onClick={() => setCollapsed(true)}
              aria-label="收起侧边栏"
            >
              <ChevronsLeft className="size-4" />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ThreadListContent className="flex-1" />
          </div>
          <div className="shrink-0 border-t border-[rgba(34,32,26,0.16)] p-2">
            {user ? (
              <UserFooter user={user} />
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 rounded-full text-[var(--agent-muted-ink)] hover:bg-white/60 hover:text-[var(--agent-ink)]"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="size-4" />
                退出登录
              </Button>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  const mobileHeader = (
    <header className="agent-doodle-grid flex h-14 shrink-0 items-center border-b border-[rgba(34,32,26,0.18)] bg-[rgba(255,253,244,0.92)] px-4 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="agent-hand-border-soft size-9 bg-white/60"
            aria-label="打开会话列表"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="agent-sketch agent-doodle-grid flex w-72 flex-col border-[var(--agent-border)] bg-[var(--agent-paper)] p-0"
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <ThreadListContent onItemClick={() => setOpen(false)} />
          </div>
          <div className="shrink-0 border-t border-[rgba(34,32,26,0.16)] p-2">
            {user ? (
              <UserFooter user={user} />
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 rounded-full text-[var(--agent-muted-ink)] hover:bg-white/60 hover:text-[var(--agent-ink)]"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                <LogOut className="size-4" />
                退出登录
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <span className="agent-scribble-title ml-2 text-sm font-black">
        Agent
      </span>
    </header>
  );

  return (
    <>
      {isAgentRoute && desktopSidebar}
      {isAgentRoute && mobileHeader}
    </>
  );
}
