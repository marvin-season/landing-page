"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

export interface FundHoldingItem {
  code: string;
  name: string;
  addedAt: number;
}

interface FundHoldingsStore {
  holdings: FundHoldingItem[];
  addHolding: (code: string, name: string) => void;
  removeHolding: (code: string) => void;
  hasHolding: (code: string) => boolean;
}

type PersistedState = Pick<FundHoldingsStore, "holdings">;

export const useFundHoldingsStore = create<FundHoldingsStore>()(
  immer(
    persist(
      (set, get) => ({
        holdings: [],
        addHolding: (code, name) => {
          const normalized = code.trim();
          if (!normalized || get().holdings.some((h) => h.code === normalized))
            return;
          set((state) => {
            state.holdings.push({
              code: normalized,
              name: name.trim() || normalized,
              addedAt: Date.now(),
            });
          });
        },
        removeHolding: (code) => {
          set((state) => {
            state.holdings = state.holdings.filter((h) => h.code !== code);
          });
        },
        hasHolding: (code) => {
          return get().holdings.some((h) => h.code === code.trim());
        },
      }),
      {
        name: "fund-holdings",
        storage: createIdbPersistStorage<PersistedState>({ prefix: "fund" }),
        partialize: (state) => ({ holdings: state.holdings }),
      },
    ),
  ),
);

export function useFundHoldings() {
  return useFundHoldingsStore(useShallow((s) => s.holdings));
}
