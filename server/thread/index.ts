import { Memory } from "@mastra/memory";
import { z } from "zod";
import { AGENT_ID, RESOURCE_ID } from "~/server/helper/constant";
import { mastra } from "@/mastra";
import { publicProcedure, router } from "~/server/trpc";

async function getMemory(): Promise<Memory> {
  const m = await mastra.getAgentById(AGENT_ID).getMemory();
  return m as Memory;
}

export const threadRouter = router({
  list: publicProcedure.query(async () => {
    const memory = await getMemory();
    const { threads } = await memory.listThreads({ perPage: false });
    return threads.map((t) => ({
      id: t.id,
      resourceId: t.resourceId,
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
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
});
