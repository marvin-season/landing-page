"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

type ChatSettingsState = {
  /** 是否禁用“上一条/下一条”消息翻页（滚轮/按钮） */
  disableMessagePagination: boolean;
  setDisableMessagePagination: (disabled: boolean) => void;
  toggleDisableMessagePagination: () => void;

  /** 控制移动端侧边栏抽屉 */
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

type ChatSettingsPersistedState = Pick<
  ChatSettingsState,
  "disableMessagePagination" | "isSidebarOpen"
>;

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
        isSidebarOpen: false,
        openSidebar: () => {
          set((state) => {
            state.isSidebarOpen = true;
          });
        },
        closeSidebar: () => {
          set((state) => {
            state.isSidebarOpen = false;
          });
        },
        setSidebarOpen: (open) => {
          set((state) => {
            state.isSidebarOpen = open;
          });
        },
      }),
      {
        name: "chat-settings",
        storage: createIdbPersistStorage<ChatSettingsPersistedState>({
          prefix: "pcai",
        }),
        partialize: (state) => ({
          disableMessagePagination: state.disableMessagePagination,
          isSidebarOpen: state.isSidebarOpen,
        }),
      },
    ),
  ),
);

