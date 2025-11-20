import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/server";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
