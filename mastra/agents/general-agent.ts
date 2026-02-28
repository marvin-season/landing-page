import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { AgentConstant } from "@/lib/constant/agent";
import { sendEmailTool } from "../tools/email-tool";
import { stockQuoteTool } from "../tools/stock-tool";
import { weatherTool } from "../tools/weather-tool";

export const generalAgent = new Agent({
  id: AgentConstant.GENERAL_AGENT,
  name: "General Agent",
  instructions: `
      You are a general-purpose assistant. Be accurate, concise, and helpful.
      Core behaviors:
      - Prefer step-by-step guidance for multi-step tasks.
      - If a request is out of scope or cannot be completed, explain why and propose alternatives.
      - Respond in the user's language when possible.

`,
  // model: "ollama/qwen2.5:7b",
  //   model: ollama("qwen2.5:7b"),
  model: "deepseek/deepseek-chat",
  tools: { weatherTool, stockQuoteTool, sendEmailTool },

  memory: new Memory(),
});
