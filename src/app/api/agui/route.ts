import { MastraAgent } from "@ag-ui/mastra";
import { NextResponse } from "next/server";
import { mastra } from "$";
import { AGENT_ID, RESOURCE_ID } from "$/constant";

const mastraAgent = MastraAgent.getLocalAgent({
  mastra,
  agentId: AGENT_ID,
  resourceId: RESOURCE_ID,
});

export const agents = {
  mastraAgent,
};

export const GET = async () => {
  const agentIds = Object.keys(agents);
  return NextResponse.json({ agentIds });
};
