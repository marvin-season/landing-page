import {
  type ChatStreamAdapter,
  createObservableStream,
} from "@landing-page/utils/stream";
import type { UIMessageChunk } from "ai";
import { concat, map, of } from "rxjs";

export type MockChatInput = { url: string; text: string };

/** 将指定接口的 { delta } SSE 转换为统一文本事件。 */
export const mockChatStreamAdapter: ChatStreamAdapter<MockChatInput> = (
  { url, text },
  { signal },
) => {
  const id = crypto.randomUUID();
  return concat(
    of<UIMessageChunk>({ type: "text-start", id }),
    createObservableStream<{ delta: string }>(url, { text }, signal).pipe(
      map(({ delta }): UIMessageChunk => ({ type: "text-delta", id, delta })),
    ),
    of<UIMessageChunk>({ type: "text-end", id }),
  );
};
