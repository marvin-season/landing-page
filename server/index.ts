import { headers } from "next/headers";
import { modelRouter } from "~/server/model";
import { userRouter } from "~/server/user";
import { createCallerFactory, createTRPCContext, router } from "./trpc";

export const appRouter = router({
  user: userRouter,
  model: modelRouter,
});
// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
export const apiCaller = createCallerFactory(appRouter)(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return await createTRPCContext({ headers: heads });
});
