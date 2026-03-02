import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server";
import { createTRPCContext } from "~/server/trpc";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () =>
      await createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
      );
    },
  });
}
export { handler as GET, handler as POST };
