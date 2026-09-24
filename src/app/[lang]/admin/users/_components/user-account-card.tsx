"use client";

import { Button, Card, Input } from "@landing-page/design-system";
import { useId, useState } from "react";
import { roleLabel } from "./roles";

type UserAccountCardProps = {
  username: string;
  role: string;
  updatedAt: string;
  canManage: boolean;
  pending: boolean;
  onSubmit: (password: string) => Promise<void>;
};

function formatUpdatedAt(updatedAt: string) {
  return updatedAt.replace("T", " ").slice(0, 16);
}

export function UserAccountCard({
  username,
  role,
  updatedAt,
  canManage,
  pending,
  onSubmit,
}: UserAccountCardProps) {
  const passwordId = useId();
  const confirmId = useId();
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function resetForm() {
    setPassword("");
    setConfirm("");
    setError("");
  }

  function startEditing() {
    resetForm();
    setSaved(false);
    setEditing(true);
  }

  function cancelEditing() {
    resetForm();
    setEditing(false);
  }

  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length > 0 && password === confirm && !pending;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-foreground">{username}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleLabel(role)}
            <span className="mx-1.5 text-border">·</span>
            {formatUpdatedAt(updatedAt)}
          </p>
          {saved && !editing ? (
            <p className="mt-2 text-sm text-muted-foreground">密码已更新</p>
          ) : null}
        </div>
        {canManage && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
          >
            修改密码
          </Button>
        ) : null}
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-3 border-t px-5 py-5"
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
              resetForm();
              setEditing(false);
              setSaved(true);
            } catch (submitError) {
              setError(
                submitError instanceof Error ? submitError.message : "修改失败",
              );
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordId} className="text-sm text-foreground">
              新密码
            </label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              autoFocus
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
              onClick={cancelEditing}
            >
              取消
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {pending ? "保存中" : "保存"}
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
