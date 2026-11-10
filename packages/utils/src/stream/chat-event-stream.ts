import type { UIMessageChunk } from "ai";
import { defer, Observable, type ObservableInput } from "rxjs";
import { createJsonSseStream } from "./sse-json-stream";

/**
 * 将接口响应转换为 AI SDK UIMessageChunk，供统一状态层消费。
 * AI SDK SSE 使用默认 adapter；第三方格式（如 mock 的 { delta }）需自定义转换。
 * 负责请求、解码和响应 signal；状态累积由 reducer 处理。
 * 自定义 TEvent 仅用于独立使用事件流 / core 的场景。
 */
export type ChatStreamAdapter<TInput, TEvent = UIMessageChunk> = (
  input: TInput,
  context: { signal: AbortSignal },
) => ObservableInput<TEvent>;

/** 默认 AI SDK 请求；具体接口地址和请求体由应用层提供。 */
export type AiSdkChatRequest = { url: string; body: unknown };

/** 默认适配器：POST 应用层提供的请求体，直接读取 AI SDK SSE 事件。 */
export const aiSdkChatStreamAdapter: ChatStreamAdapter<AiSdkChatRequest> = (
  { url, body },
  { signal },
) => createJsonSseStream<UIMessageChunk>(url, body, signal);

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
