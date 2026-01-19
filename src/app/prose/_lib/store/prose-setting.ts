"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

type ProseSettingKey = "readonly-mode" | "dark-mode";

type ProseSettingsState = {
  /**
   * 用数组做持久化，避免 Set 在不同 storage/序列化策略下的兼容性问题。
   * 业务侧请使用 isSettingEnabled/enableSetting/disableSetting，不要直接依赖该字段的具体结构。
   */
  enabledSettingKeys: ProseSettingKey[];
  enableSetting: (key: ProseSettingKey) => void;
  disableSetting: (key: ProseSettingKey) => void;
  isSettingEnabled: (key: ProseSettingKey) => boolean;
};

type ProseSettingsPersistedState = Pick<ProseSettingsState, "enabledSettingKeys">;

export const useProseSettingsStore = create<ProseSettingsState>()(
  persist(
    immer((set, get) => ({
      enabledSettingKeys: [],
      enableSetting: (key) => {
        set((state) => {
          if (state.enabledSettingKeys.includes(key)) return;
          state.enabledSettingKeys.push(key);
        });
      },
      disableSetting: (key) => {
        set((state) => {
          state.enabledSettingKeys = state.enabledSettingKeys.filter(
            (k) => k !== key,
          );
        });
      },
      isSettingEnabled: (key) => {
        return get().enabledSettingKeys.includes(key);
      },
    })),
    {
      name: "prose-settings",
      storage: createIdbPersistStorage<ProseSettingsPersistedState>({
        prefix: "prose-",
      }),
      partialize: (state) => ({
        enabledSettingKeys: state.enabledSettingKeys,
      }),
    },
  ),
);
