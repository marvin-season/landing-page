"use client";

import { Button, Card, CardContent, Input } from "@landing-page/design-system";
import { useState } from "react";

type UserPasswordCardProps = {
  username: string;
  role: string;
  updatedAt: string;
  pending: boolean;
  onSubmit: (password: string) => Promise<void>;
};

export function UserPasswordCard({
  username,
  role,
  updatedAt,
  pending,
  onSubmit,
}: UserPasswordCardProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        <div>
          <p className="text-sm font-medium text-foreground">{username}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "super_admin" ? "超级管理员" : role}
            <span className="mx-1.5 text-border">·</span>
            {updatedAt.replace("T", " ").slice(0, 16)}
          </p>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!password) {
              setSaved(false);
              setError("密码不能为空");
              return;
            }
            if (password !== confirm) {
              setSaved(false);
              setError("两次密码不一致");
              return;
            }

            setError("");
            setSaved(false);
            try {
              await onSubmit(password);
              setPassword("");
              setConfirm("");
              setSaved(true);
            } catch (submitError) {
              setError(
                submitError instanceof Error ? submitError.message : "修改失败",
              );
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${username}-password`}
              className="text-sm text-foreground"
            >
              新密码
            </label>
            <Input
              id={`${username}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={pending}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
                setSaved(false);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${username}-confirm`}
              className="text-sm text-foreground"
            >
              确认密码
            </label>
            <Input
              id={`${username}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirm}
              disabled={pending}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setConfirm(event.target.value);
                setError("");
                setSaved(false);
              }}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-muted-foreground">密码已更新</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "保存中" : "修改密码"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
