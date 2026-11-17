import { auth } from "@/auth";
import { createNovelHandler } from "@/lib/group-chat/novel";
import { worldStore } from "@/lib/group-chat/store";
import { mastra } from "~/mastra-server";

export const runtime = "nodejs";
export const POST = createNovelHandler({
  getUser: async () => (await auth())?.user?.id ?? null,
  store: worldStore,
  mastra,
});
