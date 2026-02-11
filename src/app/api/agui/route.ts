import { MastraAgent } from "@ag-ui/mastra";
import { NextResponse } from "next/server";
import { AgentConstant } from "@/lib/constant/agent";
import { mastra } from "@/mastra";

const mastraAgent = MastraAgent.getLocalAgent({
  mastra,
  agentId: AgentConstant.GENERAL_AGENT,
  resourceId: "1",
});

export const agents = {
  mastraAgent,
};


export const GET = async () => {
  const agentIds = Object.keys(agents);
  return NextResponse.json({ agentIds });
};
