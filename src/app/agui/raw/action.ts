"use server";

import type { AbstractAgent } from "@ag-ui/client";
import { MastraAgent } from "@ag-ui/mastra";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

 const mastraAgent = MastraAgent.getLocalAgent({
  mastra,
  agentId: AgentConstant.WEATHER_AGENT,
  resourceId: "1",
});

export const addMessageToAgent: AbstractAgent["addMessage"] = async (
  ...params
) => mastraAgent.addMessage(...params);

export const invokeAgent = async (
) => mastraAgent.runAgent();
