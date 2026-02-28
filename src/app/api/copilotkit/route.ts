import { AgnoAgent } from "@ag-ui/agno";
import { MastraAgent } from "@ag-ui/mastra";

import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import type { NextRequest } from "next/server";

import { mastra } from "$";

const serviceAdapter = new ExperimentalEmptyAdapter();
const mastraAgents = MastraAgent.getLocalAgents({ mastra, resourceId: "1" });

const runtime = new CopilotRuntime({
  agents: {
    // @ts-ignore
    agnoAgent: new AgnoAgent({ url: "http://localhost:7777/agui" }),
    ...mastraAgents,
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
