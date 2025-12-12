"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type ChatSettingsState = {
  /** 是否禁用“上一条/下一条”消息翻页（滚轮/按钮） */
  disableMessagePagination: boolean;
  setDisableMessagePagination: (disabled: boolean) => void;
  toggleDisableMessagePagination: () => void;
};

export const useChatSettingsStore = create<ChatSettingsState>()(
  immer(
    persist(
      (set) => ({
        disableMessagePagination: false,
        setDisableMessagePagination: (disabled) => {
          set((state) => {
            state.disableMessagePagination = disabled;
          });
        },
        toggleDisableMessagePagination: () => {
          set((state) => {
            state.disableMessagePagination = !state.disableMessagePagination;
          });
        },
      }),
      {
        name: "chat-settings",
        storage: createJSONStorage(() => localStorage),
      },
    ),
  ),
);

