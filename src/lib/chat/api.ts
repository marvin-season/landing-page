import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { AgentConstant } from "@/lib/constant/agent";

export const DEFAULT_CHAT_AGENT_ID = AgentConstant.GENERAL_AGENT;

type BuildSubmitMessageBodyOptions = {
  resourceId: string;
  text: string;
  agentId?: string;
};

type FetchChatHistoryOptions = {
  resourceId: string;
  agentId?: string;
};

export function buildSubmitMessageBody({
  resourceId,
  text,
  agentId = DEFAULT_CHAT_AGENT_ID,
}: BuildSubmitMessageBodyOptions): Record<string, unknown> {
  return {
    resourceId,
    agentId,
    id: resourceId,
    messages: [
      {
        parts: [{ type: "text", text: text.trim() || " " }],
        id: nanoid(),
        role: "user",
      },
    ],
    trigger: "submit-message",
  };
}

export function buildChatHistoryUrl({
  resourceId,
  agentId = DEFAULT_CHAT_AGENT_ID,
}: FetchChatHistoryOptions): string {
  const searchParams = new URLSearchParams({
    resourceId,
    agentId,
  });
  return `/api/chat?${searchParams.toString()}`;
}

export async function fetchChatHistory({
  resourceId,
  agentId = DEFAULT_CHAT_AGENT_ID,
}: FetchChatHistoryOptions): Promise<UIMessage[]> {
  const response = await fetch(buildChatHistoryUrl({ resourceId, agentId }));
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as UIMessage[]) : [];
}
