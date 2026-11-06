import type { UIMessageChunk } from "ai";
import { concat, map, of } from "rxjs";
import { createObservableStream } from "./chat-stream";
import type { ChatStreamAdapter } from "./chat-stream-adapter";

export type MockChatInput = { text: string };

/** 将 /api/knowledge/chatv2 的 { delta } SSE 转换为统一文本事件。 */
export const mockChatStreamAdapter: ChatStreamAdapter<MockChatInput> = (
  input,
  { signal },
) => {
  const id = crypto.randomUUID();
  return concat(
    of<UIMessageChunk>({ type: "text-start", id }),
    createObservableStream<{ delta: string }>(
      "/api/knowledge/chatv2",
      input,
      signal,
    ).pipe(
      map(({ delta }): UIMessageChunk => ({ type: "text-delta", id, delta })),
    ),
    of<UIMessageChunk>({ type: "text-end", id }),
  );
};
