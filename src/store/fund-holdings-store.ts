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

/** 走势图单点：时间戳(秒)、估算涨幅(%) */
export interface FundChartPoint {
  time: number;
  changePercent: number;
}

interface FundHoldingsStore {
  holdings: FundHoldingItem[];
  /** 按基金代码存储的走势图数据，持久化 */
  chartDataByCode: Record<string, FundChartPoint[]>;
  addHolding: (code: string, name: string) => void;
  removeHolding: (code: string) => void;
  hasHolding: (code: string) => boolean;
  /** 追加当前涨幅到某基金的走势数据 */
  pushChartPoint: (code: string, changePercent: number) => void;
  /** 清空某基金或全部走势数据 */
  clearChartData: (code?: string) => void;
}

type PersistedState = Pick<
  FundHoldingsStore,
  "holdings" | "chartDataByCode"
>;

export const useFundHoldingsStore = create<FundHoldingsStore>()(
  immer(
    persist(
      (set, get) => ({
        holdings: [],
        chartDataByCode: {},
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
        pushChartPoint: (code, changePercent) => {
          const normalized = code.trim();
          if (!normalized) return;
          const nowSec = Math.floor(Date.now() / 1000);
          const maxPoints = 500;
          set((state) => {
            if (!state.chartDataByCode[normalized]) {
              state.chartDataByCode[normalized] = [];
            }
            const arr = state.chartDataByCode[normalized];
            const last = arr[arr.length - 1];
            if (last && last.time === nowSec) {
              last.changePercent = changePercent;
            } else {
              arr.push({ time: nowSec, changePercent });
              if (arr.length > maxPoints) arr.splice(0, arr.length - maxPoints);
            }
          });
        },
        clearChartData: (code) => {
          set((state) => {
            if (code === undefined) {
              state.chartDataByCode = {};
            } else {
              delete state.chartDataByCode[code.trim()];
            }
          });
        },
      }),
      {
        name: "fund-holdings",
        storage: createIdbPersistStorage<PersistedState>({ prefix: "fund" }),
        partialize: (state) => ({
          holdings: state.holdings,
          chartDataByCode: state.chartDataByCode,
        }),
      },
    ),
  ),
);

export function useFundHoldings() {
  return useFundHoldingsStore(useShallow((s) => s.holdings));
}
