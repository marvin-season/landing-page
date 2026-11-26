"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ThinkingHistoryEntry } from "./thinking-history";

type ThinkingHistoryApi = {
  entries: ThinkingHistoryEntry[];
  clear: () => void;
};

const ThinkingHistoryContext = createContext<{
  api: ThinkingHistoryApi | null;
  setApi: (api: ThinkingHistoryApi | null) => void;
} | null>(null);

export function NovelThinkingHistoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [api, setApi] = useState<ThinkingHistoryApi | null>(null);
  const value = useMemo(() => ({ api, setApi }), [api]);
  return (
    <ThinkingHistoryContext.Provider value={value}>
      {children}
    </ThinkingHistoryContext.Provider>
  );
}

/** NovelPanel / useNovel 把当前作品的构思历史上报给顶栏等入口。 */
export function usePublishThinkingHistory(
  entries: ThinkingHistoryEntry[],
  clear: () => void,
) {
  const context = useContext(ThinkingHistoryContext);
  useEffect(() => {
    if (!context) return;
    context.setApi({ entries, clear });
    return () => context.setApi(null);
  }, [clear, context, entries]);
}

export function useThinkingHistory() {
  return useContext(ThinkingHistoryContext)?.api ?? null;
}
