import type { UIMessageChunk } from "ai";
import { defer, Observable, type ObservableInput, scan } from "rxjs";
import {
  initialChatStreamState,
  reduceChatStreamEvent,
} from "./chat-stream-state";

/** 将接口响应解码为事件；请求和读取过程应响应 signal。默认事件类型兼容现有状态层。 */
export type ChatStreamAdapter<TInput, TEvent = UIMessageChunk> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<TEvent>;

/** 原样输出适配器事件，不解释协议或累积状态；每次订阅都有独立的取消信号。 */
export function createObservableEvents<TInput, TEvent>(
  input: TInput,
  adapter: ChatStreamAdapter<TInput, TEvent>,
) {
  return new Observable<TEvent>((subscriber) => {
    const controller = new AbortController();
    // 先注册清理，再启动适配器，确保同步事件回调里取消也能立即 abort。
    subscriber.add(() => controller.abort());
    return defer(() => adapter(input, { signal: controller.signal })).subscribe(
      subscriber,
    );
  });
}

/** 非 React 场景可直接订阅累积状态；保留原有公开接口。 */
export function createObservableState<TInput>(
  input: TInput,
  adapter: ChatStreamAdapter<TInput>,
) {
  return createObservableEvents(input, adapter).pipe(
    scan(reduceChatStreamEvent, initialChatStreamState),
  );
}
