"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Subscription } from "rxjs";
import {
  type ChatStreamAdapter,
  createObservableState,
} from "./chat-stream-observable";
import {
  type ChatStreamState,
  flushChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

type ChatStreamCallbacks = {
  onComplete?: (state: ChatStreamState) => void;
  onError?: (error: string) => void;
};

type ChatStreamHandle<TInput> = {
  state: ChatStreamState;
  send: (input: TInput) => void;
  loading: boolean;
  error: string | null;
  stop: () => void;
};

export function useChatStreamState<TInput>(
  options: ChatStreamCallbacks & { adapter: ChatStreamAdapter<TInput> },
): ChatStreamHandle<TInput> {
  const { adapter, onComplete, onError } = options;
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const latestRef = useRef(initialChatStreamState);

  const send = useCallback(
    (input: TInput) => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      setError(null);
      latestRef.current = initialChatStreamState;
      setState(initialChatStreamState);
      setLoading(true);
      // 创建本次请求的「订阅容器」：它本身不会发请求，也不会接收流事件。
      // 真正的订阅由下面的 subscribe() 创建，再通过 add() 交给容器管理。
      // stop、下一次 send 或组件卸载时，只需取消这个容器，就会连带取消内部订阅，
      // 进而执行 createObservableState 中的清理逻辑（abort 请求、释放适配器资源）。
      //
      // 必须先把容器写入 ref，再调用 subscribe()，不能直接写成：
      // subscriptionRef.current = observable.subscribe(...)
      // 因为 Observable 不保证异步执行：同步事件源或适配器同步抛错时，
      // complete/error 可能在 subscribe() 返回前就执行，并把 ref 清空。
      // 如果在 subscribe() 返回后才赋值，就会把已经结束的旧订阅重新写回 ref；
      // 若 onComplete/onError 又调用了 send，还会覆盖新请求的订阅，导致 stop 取消错对象。
      const subscription = new Subscription();
      subscriptionRef.current = subscription;
      // add() 在 subscribe() 返回后执行，但只操作本次请求的局部容器，不再改写 ref。
      // 已结束的子订阅不会被加入；如果容器已被取消，add() 会立即取消新加入的子订阅。
      subscription.add(
        createObservableState(input, adapter).subscribe({
          next: (nextState) => {
            latestRef.current = nextState;
            setState(nextState);
          },
          error: (err) => {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setLoading(false);
            subscriptionRef.current = null;
            onError?.(message);
          },
          complete: () => {
            const flushed = flushChatStreamState(latestRef.current);
            latestRef.current = flushed;
            setState(flushed);
            setLoading(false);
            subscriptionRef.current = null;
            onComplete?.(flushed);
          },
        }),
      );
    },
    [adapter, onComplete, onError],
  );

  const stop = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => stop, [stop]);

  return { state, send, loading, error, stop };
}
