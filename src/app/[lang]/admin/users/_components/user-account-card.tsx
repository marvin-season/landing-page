"use client";

import { Button, Input } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import type { CreatableRole } from "@/lib/auth-users/roles";
import { isCreatableRole } from "@/lib/auth-users/roles";
import { formatAbsoluteTime, formatRelativeTime } from "./format-user-time";
import {
  creatableRoleOptions,
  roleLabel,
  roleTone,
  userInitial,
} from "./roles";

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
  pendingPassword: boolean;
  pendingRole: boolean;
  savedPassword: boolean;
  savedRole: boolean;
  onSubmitPassword: (password: string) => Promise<void>;
  onSubmitRole: (role: CreatableRole) => Promise<void>;
};

export function UserDetail({
  username,
  role,
  updatedAt,
  locale,
  canManage,
  pendingPassword,
  pendingRole,
  savedPassword,
  savedRole,
  onSubmitPassword,
  onSubmitRole,
}: UserDetailProps) {
  const passwordId = useId();
  const confirmId = useId();
  const roleGroupId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [draftRole, setDraftRole] = useState<CreatableRole>(
    isCreatableRole(role) ? role : "admin",
  );
  const absolute = formatAbsoluteTime(updatedAt, locale);
  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSubmitPassword =
    password.length > 0 && password === confirm && !pendingPassword;
  const canEditRole = canManage && isCreatableRole(role);
  const roleChanged = canEditRole && draftRole !== role;
  const canSubmitRole = roleChanged && !pendingRole;
  const pending = pendingPassword || pendingRole;

  useEffect(() => {
    if (isCreatableRole(role)) {
      setDraftRole(role);
      setRoleError("");
    }
  }, [role]);

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

      {savedRole ? (
        <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
          角色已更新
        </p>
      ) : null}
      {savedPassword ? (
        <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
          密码已更新
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-8 flex min-h-0 flex-1 flex-col gap-8 border-t pt-6">
          {canEditRole ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!roleChanged) return;

                setRoleError("");
                try {
                  await onSubmitRole(draftRole);
                } catch (submitError) {
                  setRoleError(
                    submitError instanceof Error
                      ? submitError.message
                      : "修改失败",
                  );
                }
              }}
            >
              <h3 className="text-sm font-medium text-foreground">修改角色</h3>
              <div
                role="radiogroup"
                aria-labelledby={roleGroupId}
                className="grid grid-cols-2 gap-2"
              >
                <p id={roleGroupId} className="sr-only">
                  角色
                </p>
                {creatableRoleOptions.map((option) => {
                  const selected = draftRole === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm transition-[background-color,border-color,color] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        selected
                          ? "border-foreground/15 bg-muted text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={selected}
                        className="sr-only"
                        disabled={pending}
                        onChange={() => {
                          setDraftRole(option.value);
                          setRoleError("");
                        }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              {roleError ? (
                <p role="alert" className="text-sm text-destructive">
                  {roleError}
                </p>
              ) : null}
              <div className="flex items-center justify-end pt-1">
                <Button type="submit" size="sm" disabled={!canSubmitRole}>
                  {pendingRole ? "保存中…" : "保存角色"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              超级管理员的角色不可修改。
            </p>
          )}

          <form
            className="flex flex-col gap-4 border-t pt-6"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!password) {
                setPasswordError("密码不能为空");
                return;
              }
              if (password !== confirm) {
                setPasswordError("两次密码不一致");
                return;
              }

              setPasswordError("");
              try {
                await onSubmitPassword(password);
                setPassword("");
                setConfirm("");
              } catch (submitError) {
                setPasswordError(
                  submitError instanceof Error
                    ? submitError.message
                    : "修改失败",
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
                  aria-invalid={Boolean(passwordError) || confirmMismatch}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError("");
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
                  aria-invalid={Boolean(passwordError) || confirmMismatch}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setPasswordError("");
                  }}
                />
              </div>
            </div>
            {passwordError ? (
              <p role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            ) : confirmMismatch ? (
              <p role="alert" className="text-sm text-destructive">
                两次密码不一致
              </p>
            ) : null}
            <div className="flex items-center justify-end pt-1">
              <Button type="submit" size="sm" disabled={!canSubmitPassword}>
                {pendingPassword ? "保存中…" : "保存密码"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          只有超级管理员可以修改角色或密码。
        </p>
      )}
    </section>
  );
}
