import type { UIMessage } from "ai";

export function getLastUserMessage(messages: UIMessage[]) {
  return messages.findLast((m) => m.role === "user");
}

export function getUserMessages(messages: UIMessage[]) {
  return messages.filter((m) => m.role === "user");
}

