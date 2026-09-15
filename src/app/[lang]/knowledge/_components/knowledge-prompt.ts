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
