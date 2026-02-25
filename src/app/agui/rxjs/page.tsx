"use client";

import { MessageSquarePlus } from "lucide-react";
/**
 * 流式对话入口：点击「开始会话」创建新 resourceId 并跳转到 /agui/rxjs/[resourceId]。
 */
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function RxjsPage() {
  const router = useRouter();

  const handleStartSession = () => {
    const resourceId = crypto.randomUUID();
    router.push(`/agui/rxjs/${resourceId}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        流式对话示例
      </h1>
      <p className="text-center text-sm text-muted-foreground">
        点击下方按钮开始新会话，会话 ID 将用于本次对话的请求标识。
      </p>
      <Button
        type="button"
        size="lg"
        onClick={handleStartSession}
        className="gap-2 rounded-full"
      >
        <MessageSquarePlus className="size-5" aria-hidden />
        开始会话
      </Button>
    </div>
  );
}
