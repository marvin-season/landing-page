"use client";

import { Button } from "@landing-page/ui";
import { cn } from "@landing-page/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  PencilLine,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTRPC } from "@/lib/trpc";

const sketchNotes = [
  {
    title: "Ask",
    text: "Start from a rough question.",
    className: "agent-yellow-fill rotate-[-1.2deg]",
  },
  {
    title: "Think",
    text: "Let tools and context join in.",
    className: "agent-green-fill rotate-[0.8deg]",
  },
  {
    title: "Act",
    text: "Turn the answer into the next move.",
    className: "agent-blue-fill rotate-[-0.6deg]",
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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-10 md:py-16">
      <span className="agent-doodle-corner left-8 top-8 hidden rotate-[-12deg] md:block">
        * idea board
      </span>
      <span className="agent-doodle-corner bottom-10 right-10 hidden rotate-[9deg] md:block">
        {"{ } -> !"}
      </span>

      <div className="agent-paper-panel agent-hand-border mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-5 py-8 text-center sm:px-10 md:py-10">
        <div className="flex flex-col items-center gap-5">
          <div className="agent-hand-border-soft agent-crayon-fill flex size-16 rotate-[-2deg] items-center justify-center">
            <Bot className="size-8" />
          </div>
          <div className="space-y-3">
            <p className="agent-doodle-chip mx-auto inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase">
              <PencilLine className="size-3.5" />
              Sketch-first agent
            </p>
            <h1 className="max-w-2xl text-3xl font-black leading-tight md:text-5xl">
              Start a{" "}
              <span className="agent-scribble-title">new conversation</span>
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-6 text-[var(--agent-muted-ink)] md:text-base">
              Talk to the AI assistant, get weather, query data, send email, or
              use it as a messy notebook that can actually answer back.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="agent-sketched-button gap-2 px-8 font-bold"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-5" />
          )}
          Start a new conversation
        </Button>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          {sketchNotes.map((note) => (
            <div
              key={note.title}
              className={cn(
                "agent-hand-border-soft p-4 text-left transition-transform hover:rotate-0",
                note.className,
              )}
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <Send className="size-4" />
                {note.title}
              </div>
              <p className="text-xs leading-5 text-[var(--agent-muted-ink)]">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
