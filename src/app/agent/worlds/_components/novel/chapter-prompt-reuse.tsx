"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

type ReuseChapterPrompt = (text: string) => boolean;

const ChapterPromptReuseContext = createContext<{
  current: ReuseChapterPrompt;
} | null>(null);

export function ChapterPromptReuseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const registry = useRef<ReuseChapterPrompt>(() => false);
  return (
    <ChapterPromptReuseContext.Provider value={registry}>
      {children}
    </ChapterPromptReuseContext.Provider>
  );
}

export function useRegisterChapterPromptReuse(reuse: ReuseChapterPrompt) {
  const registry = useContext(ChapterPromptReuseContext);
  const latest = useRef(reuse);
  latest.current = reuse;
  useEffect(() => {
    if (!registry) return;
    const installed: ReuseChapterPrompt = (text) => latest.current(text);
    registry.current = installed;
    return () => {
      if (registry.current === installed) registry.current = () => false;
    };
  }, [registry]);
}

export function useReuseChapterPrompt() {
  const registry = useContext(ChapterPromptReuseContext);
  return (text: string) => registry?.current(text) ?? false;
}
