import { z } from "zod";
import { AGENT_ID, RESOURCE_ID } from "@/lib/service/helper/contsant";
import { mastra } from "@/mastra";
import { publicProcedure, router } from "~/server/trpc";

async function getMemory() {
  const m = await mastra.getAgentById(AGENT_ID).getMemory();
  return m!;
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
      if (typeof memory.getThreadById !== "function") {
        throw new Error("getThreadById not supported");
      }
      return { thread: { id: input.threadId, title: input.title } };
    }),

  delete: publicProcedure
    .input(z.object({ threadId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const memory = await getMemory();
      await memory.deleteThread(input.threadId);
      return { success: true };
    }),
});
