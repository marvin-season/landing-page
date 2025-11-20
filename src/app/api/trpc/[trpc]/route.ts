import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    onError: ({ path, error }) => {
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
      );
    },
  });
}
export { handler as GET, handler as POST };
