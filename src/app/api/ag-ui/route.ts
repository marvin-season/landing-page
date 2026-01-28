import { HttpAgent, randomUUID } from "@ag-ui/client";
import type { NextRequest } from "next/server";

// 为每个请求创建新的 agent 实例，避免状态共享问题
function createAgent() {
  return new HttpAgent({
    url: "http://localhost:7777/agui",
  });
}

export const POST = async (req: NextRequest) => {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = createAgent();

    // 添加用户消息
    agent.addMessage({
      id: randomUUID(),
      role: "user",
      content: message,
    });

    // 创建 SSE 流
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await agent.runAgent(undefined, {
            onTextMessageContentEvent: ({ event }) => {
              // 发送文本内容增量
              const data = JSON.stringify({
                type: "textMessageContent",
                delta: event.delta,
                messageId: event.messageId,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onTextMessageEndEvent: ({ messages }) => {
              // 发送文本消息结束事件
              const data = JSON.stringify({
                type: "textMessageEnd",
                messages: messages,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onRunErrorEvent: ({ event }) => {
              // 发送错误事件
              const data = JSON.stringify({
                type: "runError",
                message: event.message,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            onRunFinishedEvent: ({ messages }) => {
              // 发送运行完成事件
              const data = JSON.stringify({
                type: "runFinished",
                messages: messages,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            },
          });
        } catch (error) {
          // 发送错误并关闭流
          const errorData = JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
