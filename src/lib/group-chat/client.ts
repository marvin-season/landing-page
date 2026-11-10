import { parseJsonEventStream } from "ai";
import { z } from "zod";
import type { RunInput, WorldEvent, WorldRoom } from "./model";

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
