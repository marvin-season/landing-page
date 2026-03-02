import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export const createTRPCContext = async (opts?: {
  headers?: Headers;
  session?: Session | null;
}) => {
  const session = opts?.session ?? (await auth());
  return {
    ...opts,
    session,
  };
};

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<typeof createTRPCContext>().create();

/**
 * Protected procedure: requires auth, provides session.user.id as resourceId
 */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id },
  });
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceAuth);

export const createCallerFactory = t.createCallerFactory;
