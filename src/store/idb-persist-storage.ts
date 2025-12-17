"use client";

import { del, get, set } from "idb-keyval";
import type { PersistStorage, StorageValue } from "zustand/middleware";

type Options = {
  /** key 前缀，避免和其它业务冲突 */
  prefix?: string;
  /** 是否在首次读取时尝试从 localStorage 迁移 */
  migrateFromLocalStorage?: boolean;
};

function idbKey(prefix: string, name: string) {
  return `${prefix}:${name}`;
}

export function createIdbPersistStorage<S>(
  options: Options = {},
): PersistStorage<S> {
  const prefix = options.prefix ?? "zustand";
  const migrateFromLocalStorage = options.migrateFromLocalStorage ?? true;

  return {
    getItem: async (name) => {
      const key = idbKey(prefix, name);
      const fromIdb = (await get(key)) as StorageValue<S> | null | undefined;
      if (fromIdb) return fromIdb;

      // one-time migration from localStorage (old createJSONStorage strategy)
      if (
        migrateFromLocalStorage &&
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
      ) {
        const raw = window.localStorage.getItem(name);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as StorageValue<S>;
            await set(key, parsed);
            // optional: clean old localStorage to avoid double sources
            window.localStorage.removeItem(name);
            return parsed;
          } catch {
            // ignore invalid JSON
          }
        }
      }

      return null;
    },
    setItem: async (name, value) => {
      await set(idbKey(prefix, name), value);
    },
    removeItem: async (name) => {
      await del(idbKey(prefix, name));
    },
  };
}
