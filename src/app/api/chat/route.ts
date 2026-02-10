import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleChatStream({
    mastra,
    agentId: AgentConstant.WEATHER_AGENT,
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: params.resourceId,
        resource: params.resourceId,
      },
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function GET(req: NextRequest) {
  const resourceId = req.nextUrl.searchParams.get("resourceId");
  if (!resourceId) {
    return NextResponse.json(
      { error: "Resource ID is required" },
      { status: 400 },
    );
  }
  const memory = await mastra
    .getAgentById(AgentConstant.WEATHER_AGENT)
    .getMemory();
  let response = null;

  try {
    response = await memory?.recall({
      threadId: resourceId,
      resourceId,
    });
  } catch {
    console.log("No previous messages found.");
  }

  const uiMessages = toAISdkV5Messages(response?.messages || []);

  return NextResponse.json(uiMessages);
}
