import { nanoid } from "nanoid";

type BuildSubmitMessageBodyOptions = {
  threadId: string;
  text: string;
};

export function buildSubmitMessageBody({
  threadId,
  text,
}: BuildSubmitMessageBodyOptions): Record<string, unknown> {
  return {
    threadId,
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
