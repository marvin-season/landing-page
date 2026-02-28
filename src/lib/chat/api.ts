import type { UIMessage } from "ai";
import { nanoid } from "nanoid";


type BuildSubmitMessageBodyOptions = {
  text: string;
};

type FetchChatHistoryOptions = {
  threadId: string;
};

export function buildSubmitMessageBody({
  text,
}: BuildSubmitMessageBodyOptions): Record<string, unknown> {
  return {
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
  threadId,
}: FetchChatHistoryOptions): string {
  const searchParams = new URLSearchParams({
    threadId,
  });
  return `/api/chat?${searchParams.toString()}`;
}

export async function fetchChatHistory({
  threadId,
}: FetchChatHistoryOptions): Promise<UIMessage[]> {
  const response = await fetch(buildChatHistoryUrl({ threadId }));
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as UIMessage[]) : [];
}
