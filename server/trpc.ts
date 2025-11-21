import { initTRPC } from "@trpc/server";

export const createTRPCContext = async (opts?: { headers: Headers }) => {
  return {
    session: {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
    },
    ...opts,
  };
};
/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<typeof createTRPCContext>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const createCallerFactory = t.createCallerFactory;
