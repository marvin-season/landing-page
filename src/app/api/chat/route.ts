import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { mastra } from "~/mastra-server";
import { AGENT_ID, RESOURCE_ID } from "~/mastra-server/constant";
import { resolveStr } from "~/mastra-server/lib/resolve";

export async function POST(req: Request) {
  const params = await req.json();
  const resourceId = RESOURCE_ID;

  const agentId = AGENT_ID;
  const stream = await handleChatStream({
    mastra,
    agentId,
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: resourceId,
        resource: resourceId,
      },
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function GET(req: NextRequest) {
  const threadId = resolveStr(req.nextUrl.searchParams.get("threadId"));
  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  const memory = await mastra.getAgentById(AGENT_ID).getMemory();
  let response = null;

  try {
    response = await memory?.recall({
      threadId,
      resourceId: RESOURCE_ID,
    });
  } catch {
    console.log("No previous messages found.");
  }

  const uiMessages = toAISdkV5Messages(response?.messages || []);

  return NextResponse.json(uiMessages);
}
