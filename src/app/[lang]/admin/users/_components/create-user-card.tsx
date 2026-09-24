"use client";

import { Button, Input } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { useId, useState } from "react";
import type { CreatableRole } from "@/lib/auth-users/roles";
import { creatableRoleOptions } from "./roles";

type CreateUserFormProps = {
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    username: string;
    password: string;
    role: CreatableRole;
  }) => Promise<void>;
};

export function CreateUserForm({
  pending,
  onCancel,
  onSubmit,
}: CreateUserFormProps) {
  const usernameId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const roleGroupId = useId();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CreatableRole>("admin");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    password === confirm &&
    !pending;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <h2 className="text-lg font-semibold text-pretty text-foreground">
        新建账号
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        只能创建管理员或访客。
      </p>

      <form
        className="mt-6 flex min-h-0 flex-1 flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const name = username.trim();
          if (!name) {
            setError("用户名不能为空");
            return;
          }
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
            await onSubmit({ username: name, password, role });
          } catch (submitError) {
            setError(
              submitError instanceof Error ? submitError.message : "创建失败",
            );
          }
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={usernameId} className="text-sm text-foreground">
            用户名
          </label>
          <Input
            id={usernameId}
            name="username"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="例如 guest…"
            value={username}
            disabled={pending}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p id={roleGroupId} className="text-sm text-foreground">
            角色
          </p>
          <div
            role="radiogroup"
            aria-labelledby={roleGroupId}
            className="grid grid-cols-2 gap-2"
          >
            {creatableRoleOptions.map((option) => {
              const selected = role === option.value;
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
                      setRole(option.value);
                      setError("");
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordId} className="text-sm text-foreground">
              密码
            </label>
            <Input
              id={passwordId}
              name="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="输入密码…"
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

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            取消
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {pending ? "创建中…" : "创建"}
          </Button>
        </div>
      </form>
    </section>
  );
}
