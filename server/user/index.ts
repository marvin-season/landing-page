import { publicProcedure, router } from "~/server/trpc";

export const userRouter = router({
  list: publicProcedure.query(async () => {
    return [{
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
    }, {
      id: "2",
      name: "Jane Doe",
      email: "jane.doe@example.com",
    }];
  }),
});
