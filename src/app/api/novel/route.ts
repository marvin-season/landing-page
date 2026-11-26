import { after } from "next/server";
import { auth } from "@/auth";
import { createNovelHandlers } from "@/lib/group-chat/novel";
import { createNovelRunStore } from "@/lib/group-chat/novel-run-store";
import { getWorldDatabase, worldStore } from "@/lib/group-chat/store";
import { mastra } from "~/mastra-server";

export const runtime = "nodejs";
export const maxDuration = 300;

const handle = createNovelHandlers({
  getUser: async () => (await auth())?.user?.id ?? null,
  store: worldStore,
  mastra,
  runs: createNovelRunStore(getWorldDatabase),
  schedule: after,
});

export { handle as DELETE, handle as GET, handle as POST };
