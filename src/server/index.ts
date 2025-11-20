import { z } from "zod";
import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  userList: publicProcedure.query(async () => {
    return [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Doe" },
    ];
  }),
  userById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return { id: input.id, name: "John Doe" };
    }),
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
