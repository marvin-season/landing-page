"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ?? searchParams.get("from") ?? "/agent";
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId.trim()) {
      setError("请输入 User ID");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        userId: userId.trim(),
        redirect: false,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.ok) {
        window.location.href = callbackUrl;
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            使用 User ID 登录以使用 Agent 对话
          </p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="userId">User ID</label>
            <Input
              id="userId"
              name="userId"
              type="text"
              placeholder="例如: user-1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading}
              autoFocus
              autoComplete="username"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "登录中…" : "登录"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          登录后将以该 User ID 作为会话与记忆范围
        </p>
      </div>
    </div>
  );
}
