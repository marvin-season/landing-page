"use client";

import { Button } from "@landing-page/design-system";
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
    className:
      "agent-yellow-fill rotate-[-1.2deg] shinchan:rotate-0 apple:rotate-0",
  },
  {
    title: "Think",
    text: "Let tools and context join in.",
    className:
      "agent-green-fill rotate-[0.8deg] shinchan:rotate-0 apple:rotate-0",
  },
  {
    title: "Act",
    text: "Turn the answer into the next move.",
    className:
      "agent-blue-fill rotate-[-0.6deg] shinchan:rotate-0 apple:rotate-0",
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
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-6 md:py-8">
      <span className="agent-doodle-corner left-8 top-8 hidden rotate-[-12deg] md:block shinchan:hidden apple:hidden">
        * idea board
      </span>
      <span className="agent-doodle-corner bottom-10 right-10 hidden rotate-[9deg] md:block shinchan:hidden apple:hidden">
        {"{ } -> !"}
      </span>

      <div className="agent-paper-panel agent-hand-border mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-4 py-5 text-center sm:px-6 md:py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="agent-hand-border-soft agent-crayon-fill flex size-10 rotate-[-2deg] items-center justify-center shinchan:rotate-0 apple:rotate-0">
            <Bot className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="agent-doodle-chip mx-auto inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold uppercase">
              <PencilLine className="size-3" />
              Sketch-first agent
            </p>
            <h1 className="max-w-2xl text-2xl font-semibold leading-tight md:text-3xl">
              Start a{" "}
              <span className="agent-scribble-title">new conversation</span>
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-5 text-[var(--agent-muted-ink)] md:text-sm">
              Talk to the AI assistant, get weather, query data, send email, or
              use it as a messy notebook that can actually answer back.
            </p>
          </div>
        </div>

        <Button
          size="md"
          onClick={handleNewChat}
          disabled={createMutation.isPending}
          className="agent-sketched-button gap-2 px-5 font-medium h-9"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
          Start a new conversation
        </Button>

        <div className="grid w-full gap-2 sm:grid-cols-3">
          {sketchNotes.map((note) => (
            <div
              key={note.title}
              className={cn(
                "agent-hand-border-soft p-3 text-left transition-transform hover:rotate-0",
                note.className,
              )}
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                <Send className="size-3.5" />
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
