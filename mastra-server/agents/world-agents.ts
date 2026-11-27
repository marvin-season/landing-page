import { Agent } from "@mastra/core/agent";

export type WorldAgentPurpose = "actor" | "narrator" | "summary" | "writer";

function worldAgent(purpose: WorldAgentPurpose, name: string): Agent {
  return new Agent({
    id: `world-${purpose}`,
    name,
    // context.ts / novel model.ts 组装每次调用的角色指令；provider / novel 经 stream 传入。
    // 选人属于 schedule.ts。历史与摘要由 group-chat 存档，不启用自动 Memory。
    instructions: "按照本次提供的世界上下文完成纯文本生成，不调用工具。",
    model: "deepseek/deepseek-chat",
    maxRetries: 0,
  });
}

export const worldAgents = {
  actor: worldAgent("actor", "World NPC"),
  narrator: worldAgent("narrator", "World Narrator"),
  summary: worldAgent("summary", "World Summary"),
  writer: worldAgent("writer", "World Novel Writer"),
};
