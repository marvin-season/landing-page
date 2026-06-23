import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { Memory } from "@mastra/memory";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mastra } from "~/mastra-server";
import { AGENT_ID } from "~/mastra-server/constant";
import { protectedProcedure, router } from "~/server/trpc";

async function getMemory(): Promise<Memory> {
  const m = await mastra.getAgentById(AGENT_ID).getMemory();
  return m as Memory;
}

async function getUserThread({
  memory,
  resourceId,
  threadId,
}: {
  memory: Memory;
  resourceId: string;
  threadId: string;
}) {
  const { threads } = await memory.listThreads({
    perPage: false,
    filter: { resourceId },
  });

  return threads.find((thread) => thread.id === threadId) ?? null;
}

export const threadRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memory = await getMemory();
    const { threads } = await memory.listThreads({
      perPage: false,
      filter: { resourceId: ctx.userId },
    });
    return threads;
  }),

  create: protectedProcedure.mutation(async ({ ctx }) => {
    const memory = await getMemory();
    const threadId = crypto.randomUUID();
    const title = "会话";
    const created = await memory.createThread({
      resourceId: ctx.userId,
      threadId,
      title,
    });
    const id = (created as { id?: string })?.id ?? threadId;
    return { thread: { ...created, id } };
  }),

  detail: protectedProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const memory = await getMemory();
      const thread = await getUserThread({
        memory,
        resourceId: ctx.userId,
        threadId: input.threadId,
      });

      if (!thread) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Thread not found",
        });
      }

      return { thread };
    }),

  update: protectedProcedure
    .input(
      z.object({
        threadId: z.string().min(1),
        title: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const memory = await getMemory();
      const existing = await memory.getThreadById({ threadId: input.threadId });

      if (!existing) {
        throw new Error("Thread not found");
      }

      const updated = await memory.updateThread({
        id: input.threadId,
        title: input.title,
        metadata: existing.metadata ?? {},
      });
      return {
        thread: {
          id: updated.id ?? input.threadId,
          title: updated.title ?? input.title,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      };
    }),

  delete: protectedProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const memory = await getMemory();
      await memory.deleteThread(input.threadId);
      return { success: true };
    }),

  detailMessages: protectedProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const memory = await getMemory();
      let response: { messages?: unknown[] } | null = null;
      try {
        response = await memory.recall({
          threadId: input.threadId,
          resourceId: ctx.userId,
        });
      } catch {
        console.log("No previous messages found.");
      }
      const messages = response?.messages ?? [];
      return toAISdkV5Messages(
        messages as Parameters<typeof toAISdkV5Messages>[0],
      );
    }),
});
