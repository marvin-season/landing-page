"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc";

export default function AgentPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const createMutation = useMutation({
    ...trpc.thread.create.mutationOptions(),
    onSuccess: (data) => {
      const threadId = data.thread?.id;
      if (threadId) router.push(`/agent/${threadId}`);
    },
  });

  const handleNewChat = useCallback(() => {
    createMutation.mutate(undefined);
  }, [createMutation]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            开始新对话
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            与 AI 助手交流，获取天气、查询数据或发送邮件，随时开始。
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="gap-2 rounded-xl px-8"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-5" />
          )}
          新建对话
        </Button>

        {/* <div className="w-full space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            试试这些
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESET_QUESTIONS.map((preset) => (
              <Button
                key={preset.text}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={handleNewChat}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
}
