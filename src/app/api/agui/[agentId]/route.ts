import { randomUUID } from "@ag-ui/client";
import { type NextRequest, NextResponse } from "next/server";
import { agents } from "../route";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ agentId: keyof typeof agents }> },
) => {
  // 获取路径参数
  const { agentId } = await params;

  const agent = agents[agentId];
  if (!agent) {
    return NextResponse.json(
      { error: `Agent ${agentId} not found` },
      { status: 404 },
    );
  }

  agent.addMessage({
    id: randomUUID(),
    role: "user",
    content: "hello",
  });

  await agent.runAgent(undefined, {
    onTextMessageContentEvent: ({ event }) => {
      // 不换行输出
      process.stdout.write(event.delta);
    },
  });

  return NextResponse.json({ message: `Hello, ${agentId}!` });
};
