import {
  type ChatStreamAdapter,
  createJsonSseStream,
} from "@landing-page/utils/stream";
import type { UIMessageChunk } from "ai";
import { concat, map, of } from "rxjs";

export type MockChatInput = { url: string; text: string };

/** 将第三方 { delta } 转为 AI SDK 文本事件，并补齐 text-start / text-end。 */
export const mockChatStreamAdapter: ChatStreamAdapter<MockChatInput> = (
  { url, text },
  { signal },
) => {
  const id = crypto.randomUUID();
  return concat(
    of<UIMessageChunk>({ type: "text-start", id }),
    createJsonSseStream<{ delta: string }>(url, { text }, signal).pipe(
      map(({ delta }): UIMessageChunk => ({ type: "text-delta", id, delta })),
    ),
    of<UIMessageChunk>({ type: "text-end", id }),
  );
};
