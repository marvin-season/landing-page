"use client";

import { useCallback, useRef, useState } from "react";
import {
  type ChatStreamState,
  flushChatStreamState,
  fromChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

/**
 * 在 React 中订阅流式对话状态：发请求、归约事件、流结束时做一次 flush。
 * UI 只消费 state，与 fromChatStream / 事件分支解耦。
 */
export function useChatStreamState(url: string) {
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const send = useCallback(
    (body: Record<string, unknown>) => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      setError(null);
      setState(initialChatStreamState);
      setLoading(true);

      const sub = fromChatStreamState(url, body).subscribe({
        next: setState,
        error: (err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        },
        complete: () => {
          setState((s) => flushChatStreamState(s));
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
