import { Agent } from "@mastra/core/agent";
import { AgentConstant } from "~/mastra-server/constant";

export const knowledgeAgent = new Agent({
  id: AgentConstant.KNOWLEDGE_AGENT,
  name: "Knowledge Passage Agent",
  instructions: `
You help a reader with a quoted passage from a document.
Only use the quoted passage and the user's instruction.
Do not assume you have the rest of the document.
Keep answers concise. Reply in the user's language.
`,
  model: "deepseek/deepseek-chat",
});
