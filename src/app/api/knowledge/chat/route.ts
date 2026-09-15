import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStreamResponse } from "ai";
import { mastra } from "~/mastra-server";
import { AgentConstant } from "~/mastra-server/constant";

export const maxDuration = 60;

export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleChatStream({
    mastra,
    agentId: AgentConstant.KNOWLEDGE_AGENT,
    params,
  });
  return createUIMessageStreamResponse({ stream });
}
