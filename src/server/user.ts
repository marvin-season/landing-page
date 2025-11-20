import z from "zod";
import { publicProcedure, router } from "@/server/trpc";

export const userRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    console.log("ctx", ctx);
    return [
      { id: 1, name: "John Doe" },
      { id: 2, name: "John Smith" },
    ];
  }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return { id: input.id, name: "John Doe" };
    }),
});
