import type { UIMessageChunk } from "ai";
import { defer, Observable, type ObservableInput, scan } from "rxjs";
import { buildSubmitMessageBody, type TInputParams } from "./chat-request";
import { createObservableStream } from "./chat-stream";
import {
  initialChatStreamState,
  reduceChatStreamEvent,
} from "./chat-stream-state";

/** 将接口响应转换为统一事件；请求和读取过程应响应 signal。 */
export type ChatStreamAdapter<TInput> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<UIMessageChunk>;

/** 当前项目的 submit-message 请求和 AI SDK UI 消息流协议。 */
export const defaultChatStreamAdapter: ChatStreamAdapter<TInputParams> = (
  { url, text, threadId, messages },
  { signal },
) =>
  createObservableStream(
    url,
    buildSubmitMessageBody({ threadId, text, messages }),
    signal,
  );

export function createObservableState<TInput>(
  input: TInput,
  adapter: ChatStreamAdapter<TInput>,
) {
  return new Observable<UIMessageChunk>((subscriber) => {
    const controller = new AbortController();
    const subscription = defer(() =>
      adapter(input, { signal: controller.signal }),
    ).subscribe({
      next: (event) => subscriber.next(event),
      error: (error) => subscriber.error(error),
      complete: () => subscriber.complete(),
    });

    return () => {
      controller.abort();
      subscription.unsubscribe();
    };
  }).pipe(
    scan((state, event) => {
      if (event.type === "error") throw new Error(event.errorText);
      return reduceChatStreamEvent(state, event);
    }, initialChatStreamState),
  );
}
