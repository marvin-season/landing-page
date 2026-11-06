import { nanoid } from "nanoid";

export type ChatSubmitMessage = {
  id?: string;
  role: "user" | "assistant";
  text: string;
};

type BuildSubmitMessageBodyOptions = {
  threadId: string;
  text: string;
  messages?: ChatSubmitMessage[];
};

export function buildSubmitMessageBody({
  threadId,
  text,
  messages,
}: BuildSubmitMessageBodyOptions): Record<string, unknown> {
  const items = messages?.length ? messages : [{ role: "user" as const, text }];
  return {
    threadId,
    messages: items.map((message) => ({
      parts: [{ type: "text", text: message.text.trim() || " " }],
      id: message.id ?? nanoid(),
      role: message.role,
    })),
    trigger: "submit-message",
  };
}
