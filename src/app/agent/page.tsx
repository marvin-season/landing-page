"use client";

import { Button } from "@landing-page/design-system";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTRPC } from "@/lib/trpc";

const notes = [
  {
    title: "Ask",
    text: "Start from a rough question.",
  },
  {
    title: "Think",
    text: "Let tools and context join in.",
  },
  {
    title: "Act",
    text: "Turn the answer into the next move.",
  },
] as const;

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
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 md:py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <Bot className="size-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Start a new conversation
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
              Talk to the AI assistant, get weather, query data, send email, or
              use it as a notebook that can actually answer back.
            </p>
          </div>
        </div>

        <Button
          size="md"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="gap-2 px-5"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
          Start a new conversation
        </Button>

        <div className="grid w-full gap-2 sm:grid-cols-3">
          {notes.map((note) => (
            <div
              key={note.title}
              className="rounded-lg border bg-card p-3 text-left"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                <Send className="size-3.5" />
                {note.title}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
