"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { bbqStore } from "@/lib/bbq/idb-store";
import type { GroupingSettings } from "@/lib/bbq/types";

export function useGroupingSettings() {
  const [settings, setSettings] = useState<GroupingSettings | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    // 设置保存、备份导入及其他标签页的修改都会更新当前界面。
    const subscription = liveQuery(() =>
      bbqStore.getGroupingSettings(),
    ).subscribe({
      next: (value) => {
        setSettings(value);
        setError(null);
      },
      error: setError,
    });
    return () => subscription.unsubscribe();
  }, []);
  return { settings, error };
}
