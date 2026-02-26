import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

function resolveAgentId(value: unknown): string {
  if (typeof value === "string" && value.length > 0) return value;
  return AgentConstant.GENERAL_AGENT;
}

function resolveResourceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const resourceId = value.trim();
  return resourceId.length > 0 ? resourceId : null;
}

export async function POST(req: Request) {
  const params = await req.json();
  const resourceId = resolveResourceId(params.resourceId);
  if (!resourceId) {
    return NextResponse.json(
      { error: "resourceId is required in request body" },
      { status: 400 },
    );
  }

  const agentId = resolveAgentId(params.agentId);
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
  const resourceId = resolveResourceId(req.nextUrl.searchParams.get("resourceId"));
  if (!resourceId) {
    return NextResponse.json(
      { error: "Resource ID is required" },
      { status: 400 },
    );
  }
  const agentId = resolveAgentId(req.nextUrl.searchParams.get("agentId"));

  const memory = await mastra
    .getAgentById(agentId)
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
