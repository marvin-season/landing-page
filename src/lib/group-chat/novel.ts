import { handleChatStream } from "@mastra/ai-sdk";
import type { Mastra } from "@mastra/core/mastra";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";
import {
  maxNovelPromptLength,
  novelTaskSchema,
  rewriteInstructions,
  summaryInstructions,
  writerInstructions,
} from "@/app/agent/worlds/_components/novel/model";
import { idSchema, WorldError, type WorldRoom } from "@/lib/group-chat/model";
import { providerError } from "@/lib/group-chat/provider";
import { worldSessionId } from "@/lib/group-chat/session";
import type { NovelRunStatus } from "./novel-run-contract";
import { type NovelRunStore, novelRunTimeoutMs } from "./novel-run-store";
import type { WorldStore } from "./store";

const keySchema = z.object({ roomId: idSchema, runId: z.uuid() });
const inputSchema = keySchema.extend({
  prompt: z.string().trim().min(1).max(maxNovelPromptLength),
  task: novelTaskSchema,
  version: z.number().int().nonnegative(),
});

const instructionsByTask = {
  chapter: writerInstructions,
  summary: summaryInstructions,
  rewrite: rewriteInstructions,
};

const snapshotIntervalMs = 900;
const connectionEnded = "连接提前结束或没有生成内容。已收到的正文仍可编辑。";

async function generateNovel(
  mastra: Mastra,
  room: WorldRoom,
  { prompt, task }: z.infer<typeof inputSchema>,
  runs: NovelRunStore,
  key: Parameters<NovelRunStore["read"]>[0],
) {
  if ((await runs.read(key))?.status !== "running") return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), novelRunTimeoutMs);
  const { signal } = controller;
  let text = "";
  let published = "";
  let pending: Promise<void> | undefined;
  let result: NovelRunStatus = {
    status: "failed",
    text: "",
    incomplete: true,
    error: connectionEnded,
  };

  function publish() {
    if (pending || signal.aborted) return;
    const snapshot = text;
    pending = (async () => {
      const active =
        snapshot === published
          ? (await runs.read(key))?.status === "running"
          : await runs.write(key, {
              status: "running",
              text: snapshot,
              incomplete: false,
              error: null,
            });
      if (active) published = snapshot;
      else controller.abort();
    })()
      .catch((error) => console.error("Novel progress write failed", error))
      .finally(() => {
        pending = undefined;
      });
  }

  const interval = setInterval(publish, snapshotIntervalMs);
  try {
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
        abortSignal: signal,
        activeTools: [],
        toolChoice: "none",
        maxSteps: 1,
        modelSettings: { maxOutputTokens: 8192, maxRetries: 0 },
      },
    });
    const reader = stream.getReader();
    const cancelReader = () => void reader.cancel().catch(() => {});
    signal.addEventListener("abort", cancelReader, { once: true });
    try {
      signal.throwIfAborted();
      let finish: { incomplete: boolean } | undefined;
      while (!signal.aborted) {
        const { value: event, done } = await reader.read();
        if (done) break;
        if (event.type === "text-delta") {
          const first = text === "";
          text += event.delta;
          if (first) publish();
        } else if (event.type === "finish") {
          finish = {
            incomplete: Boolean(
              event.finishReason && event.finishReason !== "stop",
            ),
          };
        } else if (event.type === "error") {
          result.error = event.errorText || connectionEnded;
          break;
        } else if (event.type === "abort") {
          break;
        }
      }
      if (
        finish &&
        !signal.aborted &&
        text.trim() &&
        result.error === connectionEnded
      )
        result = { status: "completed", text, ...finish, error: null };
    } finally {
      signal.removeEventListener("abort", cancelReader);
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } catch (error) {
    if (!signal.aborted) {
      result.error =
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 413
          ? "HTTP 413"
          : providerError(error).message;
    }
  } finally {
    clearTimeout(timer);
    clearInterval(interval);
    await pending;
    await runs.write(key, { ...result, text });
  }
}

export function createNovelHandlers({
  getUser,
  store,
  mastra,
  runs,
  schedule,
}: {
  getUser: () => Promise<string | null>;
  store: Pick<WorldStore, "get">;
  mastra: Mastra;
  runs: NovelRunStore;
  schedule: (work: () => Promise<void>) => void;
}) {
  return async function handle(request: Request) {
    const ownerId = await getUser();
    if (!ownerId) return Response.json({ error: "请先登录" }, { status: 401 });
    const url = new URL(request.url);
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !== url.origin
    )
      return Response.json({ error: "请求来源不被允许" }, { status: 403 });
    try {
      if (request.method === "POST") {
        const input = inputSchema.parse(await request.json());
        const { roomId, runId, version } = input;
        const key: Parameters<NovelRunStore["read"]>[0] = [
          ownerId,
          roomId,
          runId,
        ];
        // A retry must find the accepted run even if the room has since changed.
        if (await runs.read(key)) return new Response(null, { status: 202 });
        const room = await store.get(ownerId, roomId);
        if (room.kind !== "novel")
          throw new WorldError(
            "wrong_world_kind",
            "请在小说存档中创作章节",
            409,
          );
        if (room.status === "ended")
          throw new WorldError("ended", "小说已结束", 409);
        if (room.version !== version)
          throw new WorldError(
            "stale_world",
            "世界设定已变更，请刷新后重试。",
            409,
          );
        if (await runs.create(key))
          schedule(() => generateNovel(mastra, room, input, runs, key));
        return new Response(null, { status: 202 });
      }
      const { roomId, runId } = keySchema.parse(
        Object.fromEntries(url.searchParams),
      );
      const key: Parameters<NovelRunStore["read"]>[0] = [
        ownerId,
        roomId,
        runId,
      ];
      if (request.method === "DELETE") {
        const room = await store.get(ownerId, roomId);
        if (room.kind !== "novel")
          throw new WorldError(
            "wrong_world_kind",
            "请在小说存档中创作章节",
            409,
          );
        await runs.cancel(key);
      }
      const run = await runs.read(key);
      return run
        ? Response.json(run, {
            headers: { "Cache-Control": "private, no-store" },
          })
        : Response.json(
            { error: "找不到这次生成，或结果已过期。" },
            { status: 404 },
          );
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return Response.json(
          { error: "小说请求格式无效或上下文过长" },
          { status: 400 },
        );
      if (error instanceof WorldError)
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      console.error("Novel run storage failed", error);
      return Response.json(
        { error: "小说任务暂时无法读取，请稍后重试。" },
        { status: 503 },
      );
    }
  };
}
