"use client";

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useChatStreamStore } from "./chat-stream-store";

/**
 * 流式对话 Hook（基于 Zustand store）
 * @param url 接口地址
 */
export function useChatStreamState(url: string) {
  const { state, loading, error, send: sendFromStore } = useChatStreamStore(
    useShallow((s) => ({
      state: s.state,
      loading: s.loading,
      error: s.error,
      send: s.send,
    })),
  );

  const send = useCallback(
    (body: Record<string, unknown>) => {
      sendFromStore(url, body);
    },
    [url, sendFromStore],
  );

  return { state, send, loading, error };
}
