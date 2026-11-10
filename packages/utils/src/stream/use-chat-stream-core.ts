"use client";

import { useCallback, useEffect, useRef } from "react";
import { Observable, Subscription, tap } from "rxjs";
import {
  type ChatStreamAdapter,
  createChatEventStream,
} from "./chat-event-stream";

export type ChatStreamCoreOptions<TInput, TEvent> = {
  adapter: ChatStreamAdapter<TInput, TEvent>;
  /** 每次 send 后、适配器启动前触发，供消费层重置自己的状态。 */
  onStart?: () => void;
  /** 按顺序输出适配器解码后的事件；不解释协议。回调抛错会终止流并进入 onError。 */
  onEvent: (event: TEvent) => void;
  /** 仅正常结束时触发；stop、再次 send 和卸载都不会触发。 */
  onComplete?: () => void;
  onError?: (error: string) => void;
};

/**
 * 只管理请求订阅并向外推送事件，不持有 state / loading / error。
 * 需要 React 状态时使用 useChatStreamState，也可直接把事件交给外部 store。
 */
export function useChatStreamCore<TInput, TEvent>({
  adapter,
  onStart,
  onEvent,
  onComplete,
  onError,
}: ChatStreamCoreOptions<TInput, TEvent>) {
  const subscriptionRef = useRef<Subscription | null>(null);

  const stop = useCallback(() => {
    const subscription = subscriptionRef.current;
    subscriptionRef.current = null;
    subscription?.unsubscribe();
  }, []);

  const send = useCallback(
    (input: TInput) => {
      stop();

      // 先登记本次请求的容器，避免同步完成/失败后再赋值覆盖回调里发起的新请求。
      const subscription = new Subscription();
      subscriptionRef.current = subscription;
      onStart?.();
      // onStart 也允许消费层取消本次请求或发起另一条请求。
      if (subscription.closed) return;
      const events = new Observable<TEvent>((subscriber) => {
        // subscriber 由 RxJS 创建。启动适配器前就交给容器管理，保证 onEvent
        // 中 stop / send 能立即取消同步事件源，不必等 subscribe() 返回。
        subscription.add(subscriber);
        return createChatEventStream(input, adapter).subscribe(subscriber);
      });
      subscription.add(
        events.pipe(tap(onEvent)).subscribe({
          error: (err: unknown) => {
            subscriptionRef.current = null;
            subscription.unsubscribe();
            onError?.(err instanceof Error ? err.message : String(err));
          },
          complete: () => {
            subscriptionRef.current = null;
            subscription.unsubscribe();
            onComplete?.();
          },
        }),
      );
    },
    [adapter, onStart, onEvent, onComplete, onError, stop],
  );

  // 清理只取消订阅，不向消费层发送完成通知或触发 React 状态更新。
  useEffect(() => stop, [stop]);

  return { send, stop };
}
