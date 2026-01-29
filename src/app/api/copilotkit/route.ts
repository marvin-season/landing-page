import { MastraAgent } from "@ag-ui/mastra";
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
} from "@copilotkit/runtime";
import type { NextRequest } from "next/server";

import { mastra } from "@/mastra"; // the path to your Mastra instance

const serviceAdapter = new ExperimentalEmptyAdapter();
const agents = MastraAgent.getLocalAgents({ mastra })
console.log("agents", "agents", MastraAgent);

const runtime = new CopilotRuntime({
  agents,
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
