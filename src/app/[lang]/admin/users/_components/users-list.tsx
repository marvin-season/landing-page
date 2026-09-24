"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { UserRole } from "@/lib/auth-users/roles";
import { useTRPC } from "@/lib/trpc";
import { CreateUserForm } from "./create-user-card";
import { ROLE_ORDER, roleLabel } from "./roles";
import { UserDetail, UserRow } from "./user-account-card";
import { UsersSkeleton } from "./users-page-ui";

type RoleFilter = "all" | UserRole;
type Panel =
  | { type: "idle" }
  | { type: "create" }
  | { type: "user"; username: string };

type PublicUser = {
  username: string;
  role: UserRole;
  updatedAt: string;
};

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "super_admin", label: "超级管理员" },
  { value: "admin", label: "管理员" },
  { value: "guest", label: "访客" },
];

const desktopQuery = "(min-width: 768px)";

function subscribeDesktop(onStoreChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => true,
  );
}

function filterUsers(
  users: PublicUser[],
  query: string,
  roleFilter: RoleFilter,
) {
  const needle = query.trim().toLowerCase();
  return users.filter((user) => {
    if (roleFilter !== "all" && user.role !== roleFilter) return false;
    return needle.length === 0 || user.username.toLowerCase().includes(needle);
  });
}

function groupUsers(users: PublicUser[]) {
  return ROLE_ORDER.flatMap((role) => {
    const items = users.filter((user) => user.role === role);
    return items.length > 0 ? [{ role, items }] : [];
  });
}

function countByRole(users: PublicUser[]) {
  const counts = {
    all: users.length,
    super_admin: 0,
    admin: 0,
    guest: 0,
  };

  for (const user of users) {
    counts[user.role] += 1;
  }

  return counts;
}

export function UsersList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [panel, setPanel] = useState<Panel>({ type: "idle" });
  const [savedUsername, setSavedUsername] = useState("");
  const [flashUsername, setFlashUsername] = useState("");
  const listQuery = useQuery(trpc.user.list.queryOptions());
  const createMutation = useMutation(trpc.user.create.mutationOptions());
  const updateMutation = useMutation(
    trpc.user.updatePassword.mutationOptions(),
  );
  const users = listQuery.data?.users ?? [];
  const canManage = listQuery.data?.canManage === true;
  const counts = countByRole(users);
  const visibleUsers = filterUsers(users, query, roleFilter);
  const visibleUsersRef = useRef(visibleUsers);
  visibleUsersRef.current = visibleUsers;
  const groups = groupUsers(visibleUsers);
  const selectedUser =
    panel.type === "user"
      ? users.find((user) => user.username === panel.username)
      : undefined;

  async function refreshUsers() {
    await queryClient.invalidateQueries(trpc.user.list.queryFilter());
  }

  function closePanel() {
    setPanel({ type: "idle" });
  }

  function flash(username: string) {
    setFlashUsername(username);
  }

  useEffect(() => {
    if (!flashUsername) return;
    const timer = window.setTimeout(() => setFlashUsername(""), 1600);
    return () => window.clearTimeout(timer);
  }, [flashUsername]);

  useEffect(() => {
    if (panel.type !== "user") return;
    document
      .getElementById(`user-row-${panel.username}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [panel]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const inField =
        target instanceof HTMLElement &&
        Boolean(
          target.closest(
            "input, textarea, select, [contenteditable=true], [role='radiogroup']",
          ),
        );

      if (event.key === "/" && !inField) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === "Escape") {
        if (panel.type !== "idle") {
          event.preventDefault();
          setPanel({ type: "idle" });
          return;
        }
        if (query) {
          event.preventDefault();
          setQuery("");
        }
        return;
      }

      if (inField || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) {
        return;
      }

      const visible = visibleUsersRef.current;
      if (visible.length === 0) return;
      event.preventDefault();
      const names = visible.map((user) => user.username);
      const current =
        panel.type === "user" ? names.indexOf(panel.username) : -1;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        current === -1
          ? delta > 0
            ? 0
            : names.length - 1
          : Math.max(0, Math.min(names.length - 1, current + delta));
      const nextName = names[nextIndex];
      if (nextName) {
        setPanel({ type: "user", username: nextName });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel, query]);

  if (listQuery.isPending) {
    return <UsersSkeleton />;
  }

  const detail =
    panel.type === "create" ? (
      <CreateUserForm
        pending={createMutation.isPending}
        onCancel={closePanel}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
          await refreshUsers();
          setSavedUsername("");
          flash(input.username);
          setPanel({ type: "user", username: input.username });
        }}
      />
    ) : selectedUser ? (
      <UserDetail
        key={selectedUser.username}
        username={selectedUser.username}
        role={selectedUser.role}
        updatedAt={selectedUser.updatedAt}
        locale="zh"
        canManage={canManage}
        pending={
          updateMutation.isPending &&
          updateMutation.variables?.username === selectedUser.username
        }
        saved={savedUsername === selectedUser.username}
        onSubmit={async (password) => {
          await updateMutation.mutateAsync({
            username: selectedUser.username,
            password,
          });
          await refreshUsers();
          setSavedUsername(selectedUser.username);
          flash(selectedUser.username);
        }}
      />
    ) : (
      <div className="flex h-full min-h-48 flex-col justify-center">
        <p className="text-sm leading-6 text-muted-foreground">
          {canManage
            ? "从左侧选择一个账号，或新建管理员 / 访客。"
            : "从左侧选择一个账号查看详情。"}
        </p>
      </div>
    );

  return (
    <div className="mt-8 flex flex-col gap-4">
      {listQuery.error ? (
        <Alert>
          <AlertTitle>无法加载账号</AlertTitle>
          <AlertDescription>{listQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchRef}
            id={searchId}
            type="search"
            name="user-search"
            autoComplete="off"
            spellCheck={false}
            placeholder="搜索用户名…"
            aria-label="搜索用户名"
            value={query}
            className="h-10 pr-10 pl-9"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? null : (
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border bg-muted px-1.5 text-[10px] leading-5 text-muted-foreground md:inline">
              /
            </kbd>
          )}
        </div>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => setPanel({ type: "create" })}
          >
            新建账号
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => {
          if (filter.value !== "all" && counts[filter.value] === 0) {
            return null;
          }

          const selected = roleFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={selected}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-[background-color,border-color,color] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-foreground/15 bg-muted text-foreground"
                  : "border-border text-muted-foreground",
              )}
              onClick={() => setRoleFilter(filter.value)}
            >
              {filter.label}
              <span className="ml-1.5 tabular-nums">
                {counts[filter.value]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm shinchan:matte-surface apple:glass-surface md:grid md:min-h-96 md:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="min-w-0 border-b md:border-r md:border-b-0">
          <div className="max-h-[min(36rem,calc(100dvh-16rem))] overflow-y-auto overscroll-contain">
            {users.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                暂无账号
              </p>
            ) : visibleUsers.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                没有匹配「{query || roleLabel(roleFilter)}」的账号
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.role}>
                  <h3 className="sticky top-0 z-10 border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
                    {roleLabel(group.role)}
                    <span className="ml-1.5 tabular-nums">
                      {group.items.length}
                    </span>
                  </h3>
                  <ul>
                    {group.items.map((user) => (
                      <li key={user.username}>
                        <UserRow
                          username={user.username}
                          role={user.role}
                          updatedAt={user.updatedAt}
                          locale="zh"
                          selected={
                            panel.type === "user" &&
                            panel.username === user.username
                          }
                          flashed={flashUsername === user.username}
                          onSelect={() =>
                            setPanel({
                              type: "user",
                              username: user.username,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>

        <div className="hidden min-w-0 p-6 md:block">
          {isDesktop ? detail : null}
        </div>
      </div>

      {isDesktop ? null : (
        <Sheet
          open={panel.type !== "idle"}
          onOpenChange={(open) => {
            if (!open) closePanel();
          }}
        >
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto overscroll-contain"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                {panel.type === "create"
                  ? "新建账号"
                  : (selectedUser?.username ?? "账号")}
              </SheetTitle>
              <SheetDescription>
                {panel.type === "create"
                  ? "只能创建管理员或访客。"
                  : selectedUser
                    ? roleLabel(selectedUser.role)
                    : "查看账号详情"}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">{detail}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
