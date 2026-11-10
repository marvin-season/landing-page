import { z } from "zod";
import { abortRun, createWorldEngine } from "./engine";
import {
  exportBackup,
  exportMarkdown,
  idSchema,
  runInputSchema,
  WorldError,
  type WorldEvent,
  type WorldRoom,
} from "./model";
import type { Complete } from "./provider";
import type { WorldStore } from "./store";

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function view(room: WorldRoom) {
  return { ...room, messages: room.messages.slice(-100), runs: [] };
}
async function body(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new WorldError("invalid_body", "请求必须为 JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new WorldError("invalid_body", "请求内容为空");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 6 * 1024 * 1024)
        throw new WorldError("too_large", "内容超过 6MB，请缩减备份", 413);
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function createWorldHandlers({
  store,
  complete,
  getUser,
  models,
}: {
  store: WorldStore;
  complete: Complete;
  getUser: () => Promise<string | null>;
  models: () => Promise<string[]>;
}) {
  const execute = createWorldEngine(store, complete);
  return async function handle(request: Request, path: string[]) {
    const requestId = crypto.randomUUID();
    try {
      const ownerId = await getUser();
      if (!ownerId) throw new WorldError("unauthorized", "请先登录", 401);
      if (
        request.method !== "GET" &&
        request.headers.get("origin") !== new URL(request.url).origin
      )
        throw new WorldError("forbidden", "请求来源不被允许", 403);
      const [area, id, action] = path;
      if (path.length > 3) throw new WorldError("not_found", "接口不存在", 404);
      if (area === "models" && request.method === "GET")
        return json({ models: await models() });
      if (area === "connection" && request.method === "POST") {
        const input = z
          .object({ model: z.string().min(1).max(160) })
          .parse(await body(request));
        const result = await complete({
          model: input.model,
          signal: request.signal,
          maxCharacters: 100,
          messages: [
            {
              role: "system",
              content: "Only reply OK. Do not use tools or access files.",
            },
            { role: "user", content: "Connection test." },
          ],
        });
        return json({ ok: true, usage: result.usage ?? null });
      }
      if (area === "presets") {
        if (id) idSchema.parse(id);
        if (request.method === "GET" && !id)
          return json({ presets: await store.presets(ownerId) });
        if (request.method === "POST" || request.method === "PATCH")
          return json({
            preset: await store.savePreset(ownerId, await body(request), id),
          });
        if (request.method === "DELETE" && id) {
          await store.removePreset(ownerId, id);
          return json({ ok: true });
        }
      }
      if (area !== "rooms")
        throw new WorldError("not_found", "接口不存在", 404);
      if (!id && request.method === "GET")
        return json({ rooms: await store.list(ownerId) });
      if (!id && request.method === "POST")
        return json(
          { room: view(await store.create(ownerId, await body(request))) },
          201,
        );
      if (id === "import" && request.method === "POST")
        return json(
          { room: view(await store.import(ownerId, await body(request))) },
          201,
        );
      idSchema.parse(id);
      if (request.method === "GET") {
        const room = await store.get(ownerId, id);
        if (action === "export") {
          if (new URL(request.url).searchParams.get("format") === "markdown")
            return new Response(exportMarkdown(room), {
              headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                "Cache-Control": "private, no-store",
                "Content-Disposition": 'attachment; filename="world-chat.md"',
              },
            });
          return json(exportBackup(room));
        }
        if (action === "messages") {
          const before = z.coerce
            .number()
            .int()
            .positive()
            .parse(new URL(request.url).searchParams.get("before"));
          const messages = room.messages
            .filter((m) => m.seq < before)
            .slice(-100);
          return json({ messages, hasMore: (messages[0]?.seq ?? 1) > 1 });
        }
        if (action) throw new WorldError("not_found", "接口不存在", 404);
        return json({ room: view(room), hasMore: room.messages.length > 100 });
      }
      if (request.method === "DELETE" && !action) {
        const room = await store.get(ownerId, id);
        await store.remove(ownerId, id);
        abortRun(room.run?.id);
        return json({ ok: true });
      }
      if (request.method === "PATCH" && !action) {
        const input = z
          .discriminatedUnion("action", [
            z.object({
              action: z.literal("configure"),
              config: z.unknown(),
              expectedVersion: z.number().int().positive(),
            }),
            z.object({
              action: z.literal("rename"),
              title: z.string().trim().min(1).max(60),
            }),
            z.object({ action: z.literal("end") }),
          ])
          .parse(await body(request));
        if (input.action === "configure")
          return json({
            room: view(
              await store.update(
                ownerId,
                id,
                input.config,
                input.expectedVersion,
              ),
            ),
          });
        if (input.action === "rename")
          return json({
            room: view(await store.rename(ownerId, id, input.title)),
          });
        const room = await store.end(ownerId, id);
        abortRun(room.run?.id);
        return json({ room: view(room) });
      }
      if (request.method === "POST" && action === "stop") {
        const input = z
          .object({ runId: idSchema.optional() })
          .parse(await body(request));
        const room = await store.stop(ownerId, id, input.runId);
        if (!input.runId || room.run?.id === input.runId)
          abortRun(room.run?.id);
        return json({ room: view(room) });
      }
      if (request.method === "POST" && action === "runs") {
        const input = runInputSchema.parse(await body(request));
        const { room, value } = await store.begin(ownerId, id, input);
        if (!value.started)
          return json({ room: view(room), duplicate: value.duplicate });
        const disconnect = new AbortController();
        const signal = AbortSignal.any([request.signal, disconnect.signal]);
        const encoder = new TextEncoder();
        let closed = false;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const emit = (event: WorldEvent) => {
              if (closed) return;
              const data =
                event.type === "room"
                  ? { ...event, room: view(event.room) }
                  : event;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );
            };
            const heartbeat = setInterval(() => {
              if (!closed)
                controller.enqueue(encoder.encode(": heartbeat\n\n"));
            }, 10000);
            void execute(ownerId, room, signal, emit, value.replacedRunId)
              .catch(() => {
                if (!closed)
                  emit({
                    type: "error",
                    code: "internal",
                    message: "运行中断，请刷新存档后继续",
                    runId: room.run!.id,
                    eventSeq: Number.MAX_SAFE_INTEGER,
                  });
              })
              .finally(() => {
                clearInterval(heartbeat);
                if (!closed) {
                  closed = true;
                  controller.close();
                }
              });
          },
          cancel() {
            closed = true;
            disconnect.abort();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "private, no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      }
      throw new WorldError("method_not_allowed", "不支持此操作", 405);
    } catch (error) {
      if (error instanceof z.ZodError)
        return json(
          {
            error: error.issues[0]?.message || "输入无效",
            code: "invalid_input",
            requestId,
          },
          400,
        );
      if (error instanceof SyntaxError)
        return json(
          { error: "JSON 格式无效", code: "invalid_input", requestId },
          400,
        );
      const failure =
        error instanceof WorldError
          ? error
          : new WorldError(
              "storage_unavailable",
              "存档读取或保存失败，请检查数据库配置",
              503,
            );
      return json(
        { error: failure.message, code: failure.code, requestId },
        failure.status,
      );
    }
  };
}
