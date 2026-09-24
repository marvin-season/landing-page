"use client";

import { Button, Input } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useId, useState, useSyncExternalStore } from "react";
import { formatAbsoluteTime, formatRelativeTime } from "./format-user-time";
import { roleLabel, roleTone, userInitial } from "./roles";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

type UserRowProps = {
  username: string;
  role: string;
  updatedAt: string;
  locale: string;
  selected: boolean;
  flashed: boolean;
  onSelect: () => void;
};

export function UserRow({
  username,
  role,
  updatedAt,
  locale,
  selected,
  flashed,
  onSelect,
}: UserRowProps) {
  const isClient = useIsClient();
  const absolute = formatAbsoluteTime(updatedAt, locale);
  const relative = isClient ? formatRelativeTime(updatedAt, locale) : absolute;

  return (
    <button
      id={`user-row-${username}`}
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full scroll-mt-10 touch-manipulation items-center gap-3 px-4 py-3 text-left transition-[background-color,box-shadow] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected
          ? "bg-muted/80 shadow-[inset_2px_0_0_0_var(--color-primary)]"
          : null,
        flashed ? "bg-primary/10" : null,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          roleTone(role),
        )}
      >
        {userInitial(username)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-medium text-foreground"
          translate="no"
        >
          {username}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {roleLabel(role)}
        </span>
      </span>
      <time
        dateTime={updatedAt}
        title={absolute}
        className="shrink-0 text-xs tabular-nums text-muted-foreground"
      >
        {relative}
      </time>
    </button>
  );
}

type UserDetailProps = {
  username: string;
  role: string;
  updatedAt: string;
  locale: string;
  canManage: boolean;
  pending: boolean;
  saved: boolean;
  onSubmit: (password: string) => Promise<void>;
};

export function UserDetail({
  username,
  role,
  updatedAt,
  locale,
  canManage,
  pending,
  saved,
  onSubmit,
}: UserDetailProps) {
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const absolute = formatAbsoluteTime(updatedAt, locale);
  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length > 0 && password === confirm && !pending;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full text-base font-medium",
            roleTone(role),
          )}
        >
          {userInitial(username)}
        </span>
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold text-pretty text-foreground"
            translate="no"
          >
            {username}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {roleLabel(role)}
            <span className="mx-1.5 text-border">·</span>
            <time dateTime={updatedAt}>更新于 {absolute}</time>
          </p>
        </div>
      </div>

      {saved ? (
        <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
          密码已更新
        </p>
      ) : null}

      {canManage ? (
        <form
          className="mt-8 flex min-h-0 flex-1 flex-col gap-4 border-t pt-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!password) {
              setError("密码不能为空");
              return;
            }
            if (password !== confirm) {
              setError("两次密码不一致");
              return;
            }

            setError("");
            try {
              await onSubmit(password);
              setPassword("");
              setConfirm("");
            } catch (submitError) {
              setError(
                submitError instanceof Error ? submitError.message : "修改失败",
              );
            }
          }}
        >
          <h3 className="text-sm font-medium text-foreground">修改密码</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={passwordId} className="text-sm text-foreground">
                新密码
              </label>
              <Input
                id={passwordId}
                name="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="输入新密码…"
                value={password}
                disabled={pending}
                aria-invalid={Boolean(error) || confirmMismatch}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={confirmId} className="text-sm text-foreground">
                确认密码
              </label>
              <Input
                id={confirmId}
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="再输入一次…"
                value={confirm}
                disabled={pending}
                aria-invalid={Boolean(error) || confirmMismatch}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  setError("");
                }}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : confirmMismatch ? (
            <p role="alert" className="text-sm text-destructive">
              两次密码不一致
            </p>
          ) : null}
          <div className="flex items-center justify-end pt-1">
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {pending ? "保存中…" : "保存密码"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          只有超级管理员可以修改密码。
        </p>
      )}
    </section>
  );
}
