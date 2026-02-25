"use client";

import { create } from "zustand";
import type { ChatStreamState } from "./chat-stream-state";
import {
  flushChatStreamState,
  fromChatStreamState,
  initialChatStreamState,
} from "./chat-stream-state";

/** 当前活跃订阅，用于 send 时取消上一次请求 */
let activeSubscription: { unsubscribe: () => void } | null = null;

export type ChatStreamStore = {
  state: ChatStreamState;
  loading: boolean;
  error: string | null;
  send: (url: string, body: Record<string, unknown>) => void;
};

export const useChatStreamStore = create<ChatStreamStore>((set, get) => ({
  state: initialChatStreamState,
  loading: false,
  error: null,

  send: (url: string, body: Record<string, unknown>) => {
    activeSubscription?.unsubscribe();
    activeSubscription = null;

    set({
      error: null,
      state: initialChatStreamState,
      loading: true,
    });

    const sub = fromChatStreamState(url, body).subscribe({
      next: (nextState) => set({ state: nextState }),
      error: (err) => {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        activeSubscription = null;
      },
      complete: () => {
        const current = get().state;
        set({
          state: flushChatStreamState(current),
          loading: false,
        });
        activeSubscription = null;
      },
    });
    activeSubscription = sub;
  },
}));
