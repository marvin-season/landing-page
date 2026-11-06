import type { UIMessageChunk } from "ai";
import { defer, Observable, type ObservableInput, scan } from "rxjs";
import {
  initialChatStreamState,
  reduceChatStreamEvent,
} from "./chat-stream-state";

/** 将接口响应转换为统一事件；请求和读取过程应响应 signal。 */
export type ChatStreamAdapter<TInput> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<UIMessageChunk>;

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
