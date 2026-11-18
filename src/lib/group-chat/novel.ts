import { handleChatStream } from "@mastra/ai-sdk";
import type { Mastra } from "@mastra/core/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import {
  maxNovelPromptLength,
  novelTaskSchema,
  rewriteInstructions,
  summaryInstructions,
  writerInstructions,
} from "@/app/agent/worlds/_components/novel/model";
import { idSchema, WorldError } from "@/lib/group-chat/model";
import { providerError } from "@/lib/group-chat/provider";
import { worldSessionId } from "@/lib/group-chat/session";
import type { WorldStore } from "./store";

const inputSchema = z.object({
  roomId: idSchema,
  prompt: z.string().trim().min(1).max(maxNovelPromptLength),
  task: novelTaskSchema,
});

const instructionsByTask = {
  chapter: writerInstructions,
  summary: summaryInstructions,
  rewrite: rewriteInstructions,
};

export function createNovelHandler({
  getUser,
  store,
  mastra,
}: {
  getUser: () => Promise<string | null>;
  store: Pick<WorldStore, "get">;
  mastra: Mastra;
}) {
  return async function handle(request: Request) {
    const ownerId = await getUser();
    if (!ownerId) return Response.json({ error: "请先登录" }, { status: 401 });
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "请求来源不被允许" }, { status: 403 });
    try {
      const { roomId, prompt, task } = inputSchema.parse(await request.json());
      const room = await store.get(ownerId, roomId);
      if (room.kind !== "novel")
        throw new WorldError("wrong_world_kind", "请在小说存档中创作章节", 409);
      if (room.status === "ended")
        throw new WorldError("ended", "小说已结束", 409);
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
          instructions: instructionsByTask[task],
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
        return Response.json(
          { error: "小说请求格式无效或上下文过长" },
          { status: 400 },
        );
      const failure =
        error instanceof WorldError ? error : providerError(error);
      return Response.json(
        { error: failure.message },
        { status: failure.status },
      );
    }
  };
}
