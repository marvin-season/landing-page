"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

type SettingSetKey = 'fixed-chat' | 'pagination-display';

type ChatSettingsState = {

  settingsSet: Set<SettingSetKey>;
  addSetting: (setting: SettingSetKey) => void;
  removeSetting: (setting: SettingSetKey) => void;
  hasSetting: (setting: SettingSetKey) => boolean;
};

type ChatSettingsPersistedState = Pick<
  ChatSettingsState,
  "settingsSet"
>;

export const useChatSettingsStore = create<ChatSettingsState>()(
    persist(
      (set, get) => ({
        settingsSet: new Set<SettingSetKey>(['pagination-display']),
        addSetting: (setting) => {
          set((state) => ({
            // 重新创建一个新的 Set 对象，确保 zustand 能够检测到变更
            settingsSet: new Set(state.settingsSet).add(setting),
          }));
        },
        removeSetting: (setting) => {
          set((state) => {
            const nextSet = new Set(state.settingsSet);
            nextSet.delete(setting);
            return { settingsSet: nextSet };
          });
        },
        hasSetting: (setting) => {
          return get().settingsSet.has(setting);
        },
      }),
      {
        name: "chat-settings",
        storage: createIdbPersistStorage<ChatSettingsPersistedState>({
          prefix: "pcai",
        }),
        partialize: (state) => ({
          settingsSet: state.settingsSet,
        }),
      },
    ),
);
