"use client";

import type { UIMessageChunk } from "ai";
import { useCallback, useRef, useState } from "react";
import {
  type AiSdkChatRequest,
  aiSdkChatStreamAdapter,
  type ChatStreamAdapter,
} from "./chat-event-stream";
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

/** 默认读取 AI SDK SSE 并累积聊天状态，send 接收 { url, body }。 */
export function useChatStreamState(
  options?: ChatStreamCallbacks & { adapter?: undefined },
): ChatStreamHandle<AiSdkChatRequest>;
/** 第三方格式通过 adapter 转为 UIMessageChunk，send 入参由 adapter 推导。 */
export function useChatStreamState<TInput>(
  options: ChatStreamCallbacks & { adapter: ChatStreamAdapter<TInput> },
): ChatStreamHandle<TInput>;
export function useChatStreamState<TInput = AiSdkChatRequest>(
  options: ChatStreamCallbacks & { adapter?: ChatStreamAdapter<TInput> } = {},
): ChatStreamHandle<TInput> {
  const { onComplete, onError } = options;
  // 公开重载保证：省略 adapter 时 send 只接受 AiSdkChatRequest。
  const adapter =
    options.adapter ?? (aiSdkChatStreamAdapter as ChatStreamAdapter<TInput>);
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
