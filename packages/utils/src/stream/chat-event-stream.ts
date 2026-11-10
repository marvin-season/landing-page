import type { UIMessageChunk } from "ai";
import { defer, Observable, type ObservableInput } from "rxjs";

/** 将接口响应解码为事件；请求和读取过程应响应 signal。默认事件类型兼容现有状态层。 */
export type ChatStreamAdapter<TInput, TEvent = UIMessageChunk> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<TEvent>;

/** 订阅时调用适配器，原样输出事件；每次订阅独立持有 AbortSignal，取消时中断请求。 */
export function createChatEventStream<TInput, TEvent>(
  input: TInput,
  adapter: ChatStreamAdapter<TInput, TEvent>,
): Observable<TEvent> {
  return new Observable<TEvent>((subscriber) => {
    const controller = new AbortController();
    // 先注册清理，再启动适配器，确保同步事件回调里取消也能立即 abort。
    subscriber.add(() => controller.abort());
    return defer(() => adapter(input, { signal: controller.signal })).subscribe(
      subscriber,
    );
  });
}
