"use client";

import { useCallback, useRef, useState } from "react";
import {
  type ChatStreamState,
  flushChatStreamState,
  fromChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

export type SendOptions = {
  onComplete?: (flushedState: ChatStreamState) => void;
};

/**
 * 流式对话 Hook
 * @param url 接口地址
 */
export function useChatStreamState(url: string) {
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const send = useCallback(
    (body: Record<string, unknown>, options?: SendOptions) => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      setError(null);
      setState(initialChatStreamState);
      setLoading(true);

      const onComplete = options?.onComplete;

      const sub = fromChatStreamState(url, body).subscribe({
        next: setState,
        error: (err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        },
        complete: () => {
          setState((s) => {
            const flushed = flushChatStreamState(s);
            onComplete?.(flushed);
            return flushed;
          });
          setLoading(false);
          subscriptionRef.current = null;
        },
      });
      subscriptionRef.current = sub;
    },
    [url],
  );

  return { state, send, loading, error };
}
