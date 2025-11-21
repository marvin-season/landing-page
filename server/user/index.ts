import { publicProcedure, router } from "~/server/trpc";

export const userRouter = router({
  list: publicProcedure.query(async ({ ctx: {db} }) => {
    return await db.user.findMany();
  })
});
