import { parseJsonEventStream } from "ai";
import { z } from "zod";
import type { RunInput, WorldEvent, WorldRoom } from "./model";

export type WorldClientEvent =
  | WorldEvent
  | {
      type: "request";
      clientRequestId: string;
      eventSeq: number;
      runId: string;
    };

/** Keep bounded server runs going only while this page's subscription is active. */
export async function* worldStoryStream(
  input: { roomId: string; command: RunInput },
  context: { signal: AbortSignal },
): AsyncGenerator<WorldClientEvent> {
  let command = input.command;
  let sequence = 0;
  while (!context.signal.aborted) {
    yield {
      type: "request",
      clientRequestId: command.clientRequestId,
      eventSeq: ++sequence,
      runId: "",
    };
    context.signal.throwIfAborted();
    let room: WorldRoom | undefined;
    let failed = false;
    let runId: string | undefined;
    let serverSequence = 0;
    for await (const event of worldStream({ ...input, command }, context)) {
      context.signal.throwIfAborted();
      if (event.eventSeq <= serverSequence) continue;
      serverSequence = event.eventSeq;
      runId ??= event.runId;
      if (event.type === "room") room = event.room;
      if (event.type === "error") failed = true;
      yield { ...event, eventSeq: ++sequence };
    }
    if (
      context.signal.aborted ||
      failed ||
      command.mode !== "auto" ||
      !room ||
      room.status !== "active" ||
      room.paused ||
      room.run?.id !== runId ||
      room.run?.status !== "completed" ||
      room.run.mode !== "auto" ||
      room.run.turns !== room.run.limit
    )
      return;
    command = {
      clientRequestId: crypto.randomUUID(),
      expectedVersion: room.version,
      mode: "auto",
      text: "",
      mentions: [],
      resume: false,
      continueRunId: room.run.id,
    };
  }
}

export async function worldRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/group-chat/${path}`, {
    method,
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || `请求失败 (${response.status})`);
  return data as T;
}
export async function* worldStream(
  input: { roomId: string; command: RunInput },
  { signal }: { signal: AbortSignal },
) {
  const response = await fetch(`/api/group-chat/rooms/${input.roomId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.command),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `请求失败 (${response.status})`);
  }
  if (response.headers.get("Content-Type")?.includes("application/json")) {
    const { room } = (await response.json()) as { room: WorldRoom };
    yield {
      type: "room",
      room,
      runId: room.run?.id ?? "saved",
      eventSeq: 1,
    } satisfies WorldEvent;
    yield {
      type: "done",
      runId: room.run?.id ?? "saved",
      eventSeq: 2,
    } satisfies WorldEvent;
    return;
  }
  if (!response.body) throw new Error("未收到响应内容");
  const reader = parseJsonEventStream({
    stream: response.body,
    schema: z.custom<WorldEvent>(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        "type" in value &&
        "eventSeq" in value &&
        "runId" in value,
    ),
  }).getReader();
  let finished = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.success) throw new Error("对话响应格式错误");
      if (value.value.type === "done") finished = true;
      yield value.value;
    }
    if (!finished && !signal.aborted)
      throw new Error("连接已断开，请刷新存档后继续");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export function downloadText(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
