"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

type ReusePrompt = (text: string) => boolean;

const NovelPromptReuseContext = createContext<{
  current: ReusePrompt[];
} | null>(null);

export function ChapterPromptReuseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const registry = useRef<ReusePrompt[]>([]);
  return (
    <NovelPromptReuseContext.Provider value={registry}>
      {children}
    </NovelPromptReuseContext.Provider>
  );
}

/** Registers the current writing input. Later registrations win while mounted. */
export function useRegisterPromptReuse(reuse: ReusePrompt | null) {
  const registry = useContext(NovelPromptReuseContext);
  const latest = useRef(reuse);
  latest.current = reuse;
  const active = reuse !== null;
  useEffect(() => {
    if (!registry || !active) return;
    const run: ReusePrompt = (text) => latest.current?.(text) ?? false;
    registry.current.push(run);
    return () => {
      const index = registry.current.lastIndexOf(run);
      if (index >= 0) registry.current.splice(index, 1);
    };
  }, [active, registry]);
}

export function useReusePrompt() {
  const registry = useContext(NovelPromptReuseContext);
  return (text: string) => {
    const handlers = registry?.current;
    if (!handlers?.length) return false;
    return handlers[handlers.length - 1](text);
  };
}
