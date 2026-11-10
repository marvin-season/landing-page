"use client";

import type { UIMessageChunk } from "ai";
import { useCallback, useRef, useState } from "react";
import type { ChatStreamAdapter } from "./chat-event-stream";
import {
  type ChatStreamState,
  flushChatStreamText,
  initialChatStreamState,
  reduceChatStreamState,
} from "./chat-stream-state";
import { useChatStreamCore } from "./use-chat-stream-core";

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

/** 将 core 的事件归约为 React 状态，保持面向页面的现有调用方式。 */
export function useChatStreamState<TInput>(
  options: ChatStreamCallbacks & { adapter: ChatStreamAdapter<TInput> },
): ChatStreamHandle<TInput> {
  const { adapter, onComplete, onError } = options;
  const [state, setState] = useState<ChatStreamState>(initialChatStreamState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 同步事件可能在 React 提交更新前连续到达，ref 保证归约与完成回调拿到最新值。
  const latestRef = useRef(initialChatStreamState);

  const handleStart = useCallback(() => {
    setError(null);
    latestRef.current = initialChatStreamState;
    setState(initialChatStreamState);
    setLoading(true);
  }, []);

  const handleEvent = useCallback((event: UIMessageChunk) => {
    const nextState = reduceChatStreamState(latestRef.current, event);
    latestRef.current = nextState;
    setState(nextState);
  }, []);

  const handleError = useCallback(
    (message: string) => {
      setError(message);
      setLoading(false);
      onError?.(message);
    },
    [onError],
  );

  const handleComplete = useCallback(() => {
    const flushed = flushChatStreamText(latestRef.current);
    latestRef.current = flushed;
    setState(flushed);
    setLoading(false);
    onComplete?.(flushed);
  }, [onComplete]);

  const { send, stop: stopStream } = useChatStreamCore({
    adapter,
    onStart: handleStart,
    onEvent: handleEvent,
    onError: handleError,
    onComplete: handleComplete,
  });

  const stop = useCallback(() => {
    stopStream();
    setLoading(false);
  }, [stopStream]);

  return { state, send, loading, error, stop };
}
