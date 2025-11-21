import { initTRPC } from "@trpc/server";
import { prisma } from "~/server/lib/prisma";
export const createTRPCContext = async (opts?: { headers: Headers }) => {
  return {
    db: prisma,
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
