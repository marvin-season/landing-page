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
import type {
  NovelRunPhase,
  NovelRunStatus,
  NovelRunToolCall,
} from "./novel-run-contract";
import { type NovelRunStore, novelRunTimeoutMs } from "./novel-run-store";
import {
  createNovelWritingTools,
  skillPoolFromPrompt,
  writingToolScopeForTask,
} from "./novel-writing-tools";
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

type NovelRunKey = Parameters<NovelRunStore["read"]>[0];
const runtime = globalThis as typeof globalThis & {
  novelActiveRuns?: Map<string, AbortController>;
};
runtime.novelActiveRuns ??= new Map<string, AbortController>();
const activeNovelRuns = runtime.novelActiveRuns;

function novelRunKeyId(key: NovelRunKey) {
  return key.join("\0");
}

function abortNovelRun(key: NovelRunKey) {
  activeNovelRuns.get(novelRunKeyId(key))?.abort();
}

function snapshotTools(tools: NovelRunToolCall[]) {
  return tools.length ? tools : undefined;
}

async function generateNovel(
  mastra: Mastra,
  room: WorldRoom,
  { prompt, task }: z.infer<typeof inputSchema>,
  runs: NovelRunStore,
  key: NovelRunKey,
) {
  if ((await runs.read(key))?.status !== "running") return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), novelRunTimeoutMs);
  const { signal } = controller;
  activeNovelRuns.set(novelRunKeyId(key), controller);
  let stepText = "";
  let committedText = "";
  let text = "";
  let tools: NovelRunToolCall[] = [];
  let phase: NovelRunPhase = "preparing";
  let publishedText = "";
  let publishedMeta = "";
  let pending: Promise<void> | undefined;
  let result: NovelRunStatus = {
    status: "failed",
    text: "",
    incomplete: true,
    error: connectionEnded,
  };

  function visibleText() {
    return stepText.trim() ? stepText : committedText;
  }

  function currentPhase(): NovelRunPhase {
    if (visibleText().trim()) return "writing";
    if (tools.length) return "applying_skills";
    return "preparing";
  }

  function publish(force = false) {
    if (pending || signal.aborted) return;
    text = visibleText();
    phase = currentPhase();
    const metaKey = JSON.stringify({ tools, phase });
    if (!force && text === publishedText && metaKey === publishedMeta) return;
    const snapshotText = text;
    const snapshotPhase = phase;
    const toolsSnapshot = tools.map((item) => ({ ...item }));
    pending = (async () => {
      const active = await runs.write(key, {
        status: "running",
        text: snapshotText,
        incomplete: false,
        error: null,
        tools: snapshotTools(toolsSnapshot),
        phase: snapshotPhase,
      });
      if (active) {
        publishedText = snapshotText;
        publishedMeta = metaKey;
      } else controller.abort();
    })()
      .catch((error) => console.error("Novel progress write failed", error))
      .finally(() => {
        pending = undefined;
      });
  }

  function upsertTool(next: NovelRunToolCall) {
    const index = tools.findIndex((item) => item.id === next.id);
    if (index >= 0) tools[index] = { ...tools[index], ...next };
    else tools = [...tools, next];
    // 工具前的旁白不算正文：丢弃当前 step 已流出的说明文字。
    if (stepText.trim()) {
      stepText = "";
      text = visibleText();
    }
    publish(true);
  }

  const interval = setInterval(() => publish(), snapshotIntervalMs);
  try {
    const model =
      room.config.characters.find((character) => character.enabled)?.model ||
      room.config.characters[0].model;
    const requestContext = new RequestContext();
    requestContext.set("model", model);
    requestContext.set("sessionId", worldSessionId(room, "writer", model));
    const toolScope = writingToolScopeForTask(task);
    const writingTools =
      toolScope == null
        ? undefined
        : createNovelWritingTools(skillPoolFromPrompt(prompt), toolScope);
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
        ...(writingTools
          ? {
              toolsets: { writing: writingTools },
              toolChoice: "auto" as const,
              maxSteps: 4,
            }
          : {
              activeTools: [],
              toolChoice: "none" as const,
              maxSteps: 1,
            }),
        modelSettings: { maxOutputTokens: 8192, maxRetries: 0 },
      },
    });
    const reader = stream.getReader();
    const cancelReader = () => void reader.cancel().catch(() => {});
    signal.addEventListener("abort", cancelReader, { once: true });
    const readEvent = () =>
      new Promise<Awaited<ReturnType<typeof reader.read>>>(
        (resolve, reject) => {
          if (signal.aborted) {
            resolve({ done: true, value: undefined });
            return;
          }
          const onAbort = () => resolve({ done: true, value: undefined });
          signal.addEventListener("abort", onAbort, { once: true });
          reader.read().then(
            (result) => {
              signal.removeEventListener("abort", onAbort);
              resolve(result);
            },
            (error) => {
              signal.removeEventListener("abort", onAbort);
              reject(error);
            },
          );
        },
      );
    try {
      signal.throwIfAborted();
      let finish: { incomplete: boolean } | undefined;
      let sawStep = false;
      publish(true);
      while (!signal.aborted) {
        const { value: event, done } = await readEvent();
        if (done || !event) break;
        if (event.type === "start-step") {
          if (sawStep && stepText.trim()) committedText = stepText;
          stepText = "";
          sawStep = true;
          text = visibleText();
          publish(true);
        } else if (event.type === "finish-step") {
          if (stepText.trim()) committedText = stepText;
          text = visibleText();
          publish(true);
        } else if (event.type === "text-delta") {
          const first = !visibleText().trim();
          stepText += event.delta;
          text = visibleText();
          if (first) publish(true);
        } else if (event.type === "tool-input-start") {
          upsertTool({
            id: event.toolCallId,
            name: event.toolName,
            state: "calling",
          });
        } else if (event.type === "tool-input-available") {
          upsertTool({
            id: event.toolCallId,
            name: event.toolName,
            state: "calling",
            input: event.input,
          });
        } else if (event.type === "tool-input-error") {
          upsertTool({
            id: event.toolCallId,
            name: event.toolName,
            state: "error",
            input: event.input,
            errorText: event.errorText,
          });
        } else if (event.type === "tool-output-available") {
          upsertTool({
            id: event.toolCallId,
            name:
              tools.find((item) => item.id === event.toolCallId)?.name ||
              "tool",
            state: "done",
            output: event.output,
            errorText: null,
          });
        } else if (event.type === "tool-output-error") {
          upsertTool({
            id: event.toolCallId,
            name:
              tools.find((item) => item.id === event.toolCallId)?.name ||
              "tool",
            state: "error",
            errorText: event.errorText,
          });
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
      text = visibleText();
      if (
        finish &&
        !signal.aborted &&
        text.trim() &&
        result.error === connectionEnded
      )
        result = {
          status: "completed",
          text,
          ...finish,
          error: null,
          tools: snapshotTools(tools),
        };
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
    activeNovelRuns.delete(novelRunKeyId(key));
    await pending;
    await runs.write(key, {
      ...result,
      text,
      tools: snapshotTools(tools),
    });
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
        abortNovelRun(key);
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
