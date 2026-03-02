import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mastra } from "~/mastra-server";
import { AGENT_ID } from "~/mastra-server/constant";

export async function POST(req: Request) {
  const session = await auth();
  const resourceId = session?.user?.id;
  if (!resourceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await req.json();

  const { threadId } = params;

  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  const agentId = AGENT_ID;
  const stream = await handleChatStream({
    mastra,
    agentId,
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: threadId,
        resource: resourceId,
      },
    },
  });
  return createUIMessageStreamResponse({ stream });
}
