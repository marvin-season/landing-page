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
      // 先保存容器，兼容同步完成/抛错，以及完成回调中再次 send。
      const subscription = new Subscription();
      subscriptionRef.current = subscription;
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
