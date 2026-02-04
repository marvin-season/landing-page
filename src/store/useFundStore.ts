"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createIdbPersistStorage } from "@/store/idb-persist-storage";

export type FundRealtimeItem = {
  code: string;
  name: string;
  gsz: string;
  gszzl: string;
  gztime: string;
};

export type Position = {
  fundCode: string;
  fundName: string;
  totalShares: number;
  totalCost: number;
  updatedAt: string;
};

export type TransactionType = "buy" | "sell";

export type Transaction = {
  id: string;
  type: TransactionType;
  fundCode: string;
  fundName: string;
  amount: number;
  price: number;
  shares: number;
  date: string;
  createdAt: string;
};

type FundState = {
  positions: Position[];
  history: Transaction[];
  realtimeData: Record<string, FundRealtimeItem>;
};

type FundActions = {
  addTransaction: (tx: {
    type: TransactionType;
    fundCode: string;
    fundName: string;
    amount: number;
    price: number;
    shares: number;
    date: string;
  }) => void;
  syncEstimations: (codes?: string[]) => Promise<{ ok: boolean; errors?: string[] }>;
  removePosition: (fundCode: string) => void;
  setRealtimeItem: (code: string, item: FundRealtimeItem | null) => void;
};

const PROXY_API = "/api/proxy";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getAvgCost(position: Position): number {
  if (position.totalShares <= 0) return 0;
  return position.totalCost / position.totalShares;
}

export function getPositionMarketValue(
  position: Position,
  currentPrice: number | undefined,
): number {
  if (currentPrice === undefined) return 0;
  return position.totalShares * currentPrice;
}

export function getPositionProfit(
  position: Position,
  currentPrice: number | undefined,
): number {
  if (currentPrice === undefined) return 0;
  return position.totalShares * currentPrice - position.totalCost;
}

export function getPositionProfitRate(
  position: Position,
  currentPrice: number | undefined,
): number {
  if (position.totalCost <= 0) return 0;
  return (getPositionProfit(position, currentPrice) / position.totalCost) * 100;
}

type PersistedState = Pick<FundState, "positions" | "history">;

export const useFundStore = create<FundState & FundActions>()(
  persist(
    immer((set, get) => ({
      positions: [],
      history: [],
      realtimeData: {},
      setRealtimeItem(code, item) {
        set((state) => {
          if (item) state.realtimeData[code] = item;
          else delete state.realtimeData[code];
        });
      },
      addTransaction(tx) {
        const id = generateId();
        const createdAt = new Date().toISOString();
        const record: Transaction = {
          id,
          type: tx.type,
          fundCode: tx.fundCode,
          fundName: tx.fundName,
          amount: tx.amount,
          price: tx.price,
          shares: tx.shares,
          date: tx.date,
          createdAt,
        };
        set((state) => {
          state.history.push(record);
          const pos = state.positions.find((p) => p.fundCode === tx.fundCode);
          const now = new Date().toISOString();
          if (tx.type === "buy") {
            if (!pos) {
              state.positions.push({
                fundCode: tx.fundCode,
                fundName: tx.fundName,
                totalShares: tx.shares,
                totalCost: tx.amount,
                updatedAt: now,
              });
            } else {
              pos.totalShares += tx.shares;
              pos.totalCost += tx.amount;
              pos.fundName = tx.fundName;
              pos.updatedAt = now;
            }
            return;
          }
          if (!pos) {
            throw new Error("未找到基金持仓，无法卖出");
          }
          if (pos.totalShares < tx.shares) {
            throw new Error("卖出份额超过当前持仓");
          }
          const avgCost = pos.totalCost / pos.totalShares;
          pos.totalShares -= tx.shares;
          pos.totalCost -= tx.shares * avgCost;
          pos.updatedAt = now;
          if (pos.totalShares <= 0) {
            state.positions = state.positions.filter(
              (p) => p.fundCode !== tx.fundCode,
            );
          }
        });
      },
      async syncEstimations(codes) {
        const positions = get().positions;
        const toFetch = codes ?? positions.map((p) => p.fundCode);
        const uniq = [...new Set(toFetch)];
        const errors: string[] = [];
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          await Promise.all(
            uniq.map(async (code) => {
              try {
                const res = await fetch(
                  `${PROXY_API}?code=${encodeURIComponent(code)}`,
                  { signal: controller.signal },
                );
                if (!res.ok) {
                  errors.push(`${code}: ${res.status}`);
                  return;
                }
                const data = (await res.json()) as FundRealtimeItem;
                if (data?.code) {
                  get().setRealtimeItem(code, data);
                } else {
                  errors.push(`${code}: 无效数据`);
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes("abort")) errors.push(`${code}: 请求超时`);
                else errors.push(`${code}: ${msg}`);
              }
            }),
          );
          return {
            ok: errors.length === 0,
            errors: errors.length ? errors : undefined,
          };
        } finally {
          clearTimeout(timeout);
        }
      },
      removePosition(fundCode) {
        set((state) => {
          state.positions = state.positions.filter((p) => p.fundCode !== fundCode);
          delete state.realtimeData[fundCode];
        });
      },
    })),
    {
      name: "fund-store",
      storage: createIdbPersistStorage<PersistedState>({
        prefix: "fund",
        migrateFromLocalStorage: false,
      }),
      partialize: (state) => ({
        positions: state.positions,
        history: state.history,
      }),
    },
  ),
);
