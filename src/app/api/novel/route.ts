import { handleChatStream } from "@mastra/ai-sdk";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { auth } from "@/auth";
import {
  summaryInstructions,
  writerInstructions,
} from "@/app/agent/worlds/_components/novel/model";
import { idSchema, WorldError } from "@/lib/group-chat/model";
import { providerError } from "@/lib/group-chat/provider";
import { worldSessionId } from "@/lib/group-chat/session";
import { worldStore } from "@/lib/group-chat/store";
import { mastra } from "~/mastra-server";

export const runtime = "nodejs";

const inputSchema = z.object({
  roomId: idSchema,
  prompt: z.string().trim().min(1).max(150000),
  task: z.enum(["chapter", "summary"]),
});

export async function POST(request: Request) {
  const ownerId = (await auth())?.user?.id;
  if (!ownerId)
    return Response.json({ error: "请先登录" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "请求来源不被允许" }, { status: 403 });
  try {
    const { roomId, prompt, task } = inputSchema.parse(await request.json());
    const room = await worldStore.get(ownerId, roomId);
    const model =
      room.config.characters.find((character) => character.enabled)?.model ||
      room.config.characters[0].model;
    const requestContext = new RequestContext();
    requestContext.set("model", model);
    requestContext.set("sessionId", worldSessionId(room, "writer", model));
    const stream = await handleChatStream({
      mastra,
      agentId: "world-writer",
      params: {
        messages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            parts: [{ type: "text", text: prompt }],
          },
        ],
        instructions: task === "summary" ? summaryInstructions : writerInstructions,
        requestContext,
        abortSignal: request.signal,
        activeTools: [],
        toolChoice: "none",
        maxSteps: 1,
        modelSettings: { maxOutputTokens: 8192, maxRetries: 0 },
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json({ error: "小说请求格式无效或上下文过长" }, { status: 400 });
    const failure = error instanceof WorldError ? error : providerError(error);
    return Response.json({ error: failure.message }, { status: failure.status });
  }
}
