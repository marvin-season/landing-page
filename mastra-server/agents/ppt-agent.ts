import { Agent } from "@mastra/core/agent";
import { FABRIC_PPT_SYSTEM_PROMPT } from "@/app/admin/ppt/fabric-slide-schema";
import { AgentConstant } from "~/mastra-server/constant";

export const pptAgent = new Agent({
  id: AgentConstant.PPT_AGENT,
  name: "PPT Slides Generator",
  instructions: FABRIC_PPT_SYSTEM_PROMPT,
  model: "deepseek/deepseek-chat",
});
