export function buildKnowledgePrompt(instruction: string, quoteText?: string) {
  const task = instruction.trim();
  const quote = quoteText?.trim();
  if (quote) {
    return [
      task || "Respond to this passage.",
      "",
      "Quoted passage:",
      quote,
    ].join("\n");
  }
  return task;
}

export function toKnowledgeChatMessages(
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    quote?: { text: string };
  }>,
) {
  const start = messages.findIndex((message) => message.role === "user");
  if (start === -1) return [];
  const result: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
  }> = [];
  for (const message of messages.slice(start)) {
    const text =
      message.role === "user"
        ? buildKnowledgePrompt(message.text, message.quote?.text)
        : message.text.trim();
    if (!text) continue;
    result.push({ id: message.id, role: message.role, text });
  }
  return result;
}
