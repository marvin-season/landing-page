"use client";

import { useCallback, useRef, useState } from "react";
import type { TInputParams } from "@/lib/stream/chat-stream-state";
import {
  type ChatStreamState,
  createObservableState,
  flushChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

export function useChatStreamState(options: {
  onComplete?: () => void;
  onError?: (error: string) => void;
}) {
  const { onComplete } = options;
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const send = useCallback(
    (input: TInputParams) => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      setError(null);
      setState(initialChatStreamState);
      setLoading(true);
      const sub = createObservableState(input).subscribe({
        next: setState,
        error: (err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        },
        complete: () => {
          setState((s) => flushChatStreamState(s));
          setLoading(false);
          subscriptionRef.current = null;
          onComplete?.();
        },
      });
      subscriptionRef.current = sub;
    },
    [onComplete],
  );

  const stop = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setLoading(false);
  }, []);

  return { state, send, loading, error, stop };
}
