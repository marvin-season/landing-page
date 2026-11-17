import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Agent } from "@mastra/core/agent";

export type WorldAgentPurpose = "actor" | "narrator" | "summary" | "writer";

function worldAgent(purpose: WorldAgentPurpose, name: string): Agent {
  return new Agent({
    id: `world-${purpose}`,
    name,
    // context.ts builds the per-call role instructions; provider.ts passes them
    // to stream(). Turn selection belongs to schedule.ts, not an agent.
    instructions: "按照本次提供的世界上下文完成纯文本生成，不调用工具。",
    model: ({ requestContext }) =>
      createOpenAICompatible({
        name: "world-proxy",
        baseURL: process.env.GROUP_CHAT_BASE_URL || "http://127.0.0.1:3425/v1",
        apiKey: process.env.GROUP_CHAT_API_KEY || "magpie",
        headers: requestContext.get("sessionId")
          ? { "X-Magpie-Session": requestContext.get("sessionId") as string }
          : undefined,
        // The provider omits tool_choice when no tools are registered. The
        // local agent proxy still needs an explicit opt-out of upstream tools.
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            body: JSON.stringify({
              ...JSON.parse(String(init?.body)),
              tool_choice: "none",
            }),
          }),
      }).chatModel(requestContext.get("model") as string),
    maxRetries: 0,
    // group-chat owns history and summaries. Automatic memory must not mix roles.
  });
}

export const worldAgents = {
  actor: worldAgent("actor", "World NPC"),
  narrator: worldAgent("narrator", "World Narrator"),
  summary: worldAgent("summary", "World Summary"),
  writer: worldAgent("writer", "World Novel Writer"),
};
