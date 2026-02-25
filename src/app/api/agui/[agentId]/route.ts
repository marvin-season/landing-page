import { randomUUID } from "@ag-ui/client";
import { type NextRequest, NextResponse } from "next/server";
import { agents } from "../route";

export const GET = async (
  _: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) => {
  // 获取路径参数
  const { agentId } = await params;

  const agent = agents[agentId as keyof typeof agents];
  if (!agent) {
    return NextResponse.json(
      { error: `Agent ${agentId} not found` },
      { status: 404 },
    );
  }

  const observable = agent.run({
    messages: [
      {
        id: randomUUID(),
        role: "user",
        content: "北京的天气怎么样？",
      },
    ],
    threadId: randomUUID(),
    runId: randomUUID(),
    tools: [],
    context: [],
  });

  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    start(controller) {
      observable.subscribe({
        next: (event) => {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        },
        error: (err) => {
          console.error("Stream error:", err);
          controller.error(err);
        },
        complete: () => {
          controller.close();
        },
      });
    },
  });

  return new NextResponse(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
