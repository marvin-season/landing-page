import { z } from "zod";
import { createCallerFactory, publicProcedure, router } from "./trpc";

export const appRouter = router({
  userList: publicProcedure.query(async () => {
    return [
      { id: 1, name: "John Doe" },
      { id: 2, name: "John Smith" },
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
export const apiCaller = createCallerFactory(appRouter)({});
