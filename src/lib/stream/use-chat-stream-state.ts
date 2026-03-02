"use client";

import { useCallback, useRef, useState } from "react";
import { buildSubmitMessageBody } from "@/lib/chat/api";
import {
  type ChatStreamState,
  flushChatStreamState,
  fromChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

/**
 * 流式对话 Hook
 * @param url 接口地址
 */
export function useChatStreamState(url: string, options : { onComplete?: () => void, onError?: (error: string) => void }) {

  const { onComplete } = options;
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const send = useCallback(
    ({ text, threadId }: { text: string; threadId: string }) => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      setError(null);
      setState(initialChatStreamState);
      setLoading(true);
      const sub = fromChatStreamState(
        url,
        buildSubmitMessageBody({ threadId, text: text }),
      ).subscribe({
        next: setState,
        error: (err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        },
        complete: () => {
          setState(s => flushChatStreamState(s));
          setLoading(false);
          subscriptionRef.current = null;
          onComplete?.();
        },
      });
      subscriptionRef.current = sub;
    },
    [url, onComplete],
  );

  const stop = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    setLoading(false);
  }, []);

  return { state, send, loading, error, stop};
}
