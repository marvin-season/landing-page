"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useLinkStatus } from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import { Link } from "@/components/link/link";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useTRPC } from "@/lib/trpc";
import { isWorldsPath } from "./agent-paths";
import { WorkspaceNav } from "./workspace-nav";
import { WorldsListContent } from "./worlds-list-content";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

function HistoryLinkStatus({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  if (!pending) return children;

  return (
    <span className="flex items-center gap-1 text-primary" role="status">
      <Loader2
        className="size-3 animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      正在打开…
    </span>
  );
}

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
      <div className="shrink-0 p-2">
        <Button
          className="w-full justify-center gap-2"
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
        <div className="mx-3 mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
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
                    className="flex items-center gap-1 rounded-lg bg-muted px-1.5 py-1"
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
                      "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      threadId === t.id ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block truncate leading-5">
                        {t.title ?? "新对话"}
                      </span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">
                        <HistoryLinkStatus>
                          {dayjs(t.updatedAt).fromNow()}
                        </HistoryLinkStatus>
                      </span>
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
          className={cn("size-10", className)}
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

function DesktopRailLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            active && "bg-muted text-foreground",
          )}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type AgentUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function getInitials(user: AgentUser) {
  const source = user.name?.trim() || user.email?.trim() || user.id || "?";
  return source.slice(0, 1).toUpperCase();
}

function UserAvatar({
  user,
  className,
}: {
  user: AgentUser;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {getInitials(user)}
    </span>
  );
}

function UserFooter({
  user,
  compact = false,
  className,
}: {
  user: AgentUser;
  compact?: boolean;
  className?: string;
}) {
  const displayName = user.name || user.email || user.id || "用户";
  const showEmail = Boolean(user.email && user.email !== displayName);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center overflow-hidden rounded-lg transition-colors hover:bg-muted/60",
            compact
              ? "size-10 justify-center p-0"
              : "w-full gap-2 px-2 py-1.5 text-left",
            className,
          )}
          aria-label={compact ? "账户" : undefined}
        >
          <UserAvatar
            user={user}
            className={compact ? "size-10 text-sm" : "size-8"}
          />
          {compact ? null : (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {displayName}
              </span>
              {showEmail ? (
                <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                  {user.email}
                </span>
              ) : null}
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side={compact ? "right" : "top"}
        align={compact ? "end" : "start"}
        sideOffset={8}
        className="w-56"
      >
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} className="size-10 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">
              {displayName}
            </p>
            {user.email ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/auth" })}
        >
          <LogOut className="size-4" />
          退出登录
        </Button>
      </HoverCardContent>
    </HoverCard>
  );
}

function DesktopCollapsedContent({
  user,
  onExpand,
}: {
  user?: AgentUser;
  onExpand: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const worlds = isWorldsPath(pathname);
  const createMutation = useCreateThread();

  return (
    <div className="flex h-full w-full animate-in fade-in-0 flex-col items-center py-3 duration-200">
      <div className="flex w-full flex-col items-center gap-2">
        <DesktopRailButton label="展开侧边栏" onClick={onExpand}>
          <ChevronsRight className="size-4" />
        </DesktopRailButton>
        <DesktopRailLink href="/agent" label="对话" active={!worlds}>
          <MessageSquare className="size-4" />
        </DesktopRailLink>
        <DesktopRailLink href="/agent/worlds" label="开放世界" active={worlds}>
          <Globe className="size-4" />
        </DesktopRailLink>
        {worlds ? (
          <DesktopRailButton
            label="创建世界"
            onClick={() => router.push("/agent/worlds")}
          >
            <Plus className="size-4" />
          </DesktopRailButton>
        ) : (
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
        )}
      </div>

      <div className="mt-auto flex w-full flex-col items-center">
        {user ? (
          <UserFooter user={user} compact />
        ) : (
          <DesktopRailButton
            label="退出登录"
            onClick={() => signOut({ callbackUrl: "/auth" })}
          >
            <LogOut className="size-4" />
          </DesktopRailButton>
        )}
      </div>
    </div>
  );
}

type AgentSidebarProps = {
  user?: AgentUser;
};

export function AgentSidebar({ user }: AgentSidebarProps) {
  const pathname = usePathname();
  const isAgentRoute = pathname.startsWith("/agent");
  const worlds = isWorldsPath(pathname);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeSheet = () => setOpen(false);
  const listContent = (onItemClick?: () => void) =>
    worlds ? (
      <WorldsListContent onItemClick={onItemClick} className="flex-1" />
    ) : (
      <ThreadListContent onItemClick={onItemClick} className="flex-1" />
    );

  const desktopSidebar = (
    <aside
      className={cn(
        "hidden h-full shrink-0 overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-14" : "w-60",
      )}
      data-collapsed={collapsed}
    >
      {collapsed ? (
        <DesktopCollapsedContent
          user={user}
          onExpand={() => setCollapsed(false)}
        />
      ) : (
        <div className="flex h-full w-60 animate-in fade-in-0 duration-200 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-2">
            <span className="px-1 text-sm font-semibold">
              {worlds ? "开放世界" : "对话"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setCollapsed(true)}
              aria-label="收起侧边栏"
            >
              <ChevronsLeft className="size-4" />
            </Button>
          </div>
          <WorkspaceNav />
          <div className="flex min-h-0 flex-1 flex-col">{listContent()}</div>
          <div className="shrink-0 border-t p-2">
            <div className="mb-2">
              <ThemeSwitcher className="w-full" />
            </div>
            {user ? (
              <UserFooter user={user} />
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => signOut({ callbackUrl: "/auth" })}
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
    <header className="flex h-12 shrink-0 items-center border-b bg-background px-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="打开菜单"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-72 flex-col bg-sidebar p-0 text-sidebar-foreground"
        >
          <WorkspaceNav onNavigate={closeSheet} />
          <div className="min-h-0 flex-1 overflow-hidden">
            {listContent(closeSheet)}
          </div>
          <div className="shrink-0 border-t p-2">
            <div className="mb-2">
              <ThemeSwitcher />
            </div>
            {user ? (
              <UserFooter user={user} />
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => signOut({ callbackUrl: "/auth" })}
              >
                <LogOut className="size-4" />
                退出登录
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <span className="ml-2 text-sm font-semibold">
        {worlds ? "开放世界" : "对话"}
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
