import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import type { Memory } from "@mastra/memory";
import { z } from "zod";
import { mastra } from "~/mastra-server";
import { AGENT_ID, RESOURCE_ID } from "~/mastra-server/constant";
import { publicProcedure, router } from "~/server/trpc";

async function getMemory(): Promise<Memory> {
  const m = await mastra.getAgentById(AGENT_ID).getMemory();
  return m as Memory;
}

export const threadRouter = router({
  list: publicProcedure.query(async () => {
    const memory = await getMemory();
    const { threads } = await memory.listThreads({ perPage: false, filter: { resourceId: RESOURCE_ID } });
    return threads;
  }),

  create: publicProcedure.mutation(async () => {
    const memory = await getMemory();
    const threadId = crypto.randomUUID();
    const title = "会话";
    const created = await memory.createThread({
      resourceId: RESOURCE_ID,
      threadId,
      title,
    });
    const id = (created as { id?: string })?.id ?? threadId;
    return { thread: { ...created, id } };
  }),

  update: publicProcedure
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

  delete: publicProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const memory = await getMemory();
      await memory.deleteThread(input.threadId);
      return { success: true };
    }),

  detailMessages: publicProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .query(async ({ input }) => {
      const memory = await getMemory();
      let response: { messages?: unknown[] } | null = null;
      try {
        response = await memory.recall({
          threadId: input.threadId,
          resourceId: RESOURCE_ID,
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
