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
  // setApi 稳定；不要把整个 {api,setApi} 放进订阅方的 effect 依赖。
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
  const setApi = useContext(ThinkingHistoryContext)?.setApi;
  useEffect(() => {
    if (!setApi) return;
    setApi({ entries, clear });
    return () => setApi(null);
  }, [clear, entries, setApi]);
}

export function useThinkingHistory() {
  return useContext(ThinkingHistoryContext)?.api ?? null;
}
