"use client";

import {
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@landing-page/design-system";
import { useId, useState } from "react";
import type { CreatableRole } from "@/lib/auth-users/roles";
import { creatableRoleOptions } from "./roles";

type CreateUserCardProps = {
  pending: boolean;
  onSubmit: (input: {
    username: string;
    password: string;
    role: CreatableRole;
  }) => Promise<void>;
};

export function CreateUserCard({ pending, onSubmit }: CreateUserCardProps) {
  const usernameId = useId();
  const roleId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<CreatableRole>("admin");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");

  function resetForm() {
    setUsername("");
    setRole("admin");
    setPassword("");
    setConfirm("");
    setError("");
  }

  function startCreating() {
    resetForm();
    setCreated("");
    setOpen(true);
  }

  function cancelCreating() {
    resetForm();
    setOpen(false);
  }

  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    password === confirm &&
    !pending;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-foreground">新建账号</p>
          <p className="mt-1 text-sm text-muted-foreground">
            只能创建管理员或访客。
          </p>
          {created && !open ? (
            <p className="mt-2 text-sm text-muted-foreground">
              已创建 {created}
            </p>
          ) : null}
        </div>
        {open ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCreating}
          >
            新建
          </Button>
        )}
      </div>

      {open ? (
        <form
          className="flex flex-col gap-3 border-t px-5 py-5"
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
              resetForm();
              setOpen(false);
              setCreated(name);
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
              type="text"
              autoComplete="off"
              autoFocus
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
            <label htmlFor={roleId} className="text-sm text-foreground">
              角色
            </label>
            <Select
              value={role}
              onValueChange={(value) => {
                if (value === "admin" || value === "guest") {
                  setRole(value);
                  setError("");
                }
              }}
            >
              <SelectTrigger id={roleId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordId} className="text-sm text-foreground">
              密码
            </label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="new-password"
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
              type="password"
              autoComplete="new-password"
              value={confirm}
              disabled={pending}
              aria-invalid={Boolean(error) || confirmMismatch}
              onChange={(event) => {
                setConfirm(event.target.value);
                setError("");
              }}
            />
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
              onClick={cancelCreating}
            >
              取消
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {pending ? "创建中" : "创建"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
