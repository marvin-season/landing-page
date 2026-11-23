"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
export type NovelPromptReuseKind =
  | "chapter"
  | "rewrite"
  | "selection"
  | "stitch"
  | "merge"
  | "insert";

type ReusePrompt = (text: string) => boolean;
type ReuseHandlers = Partial<Record<NovelPromptReuseKind, ReusePrompt>>;

const NovelPromptReuseContext = createContext<{
  current: ReuseHandlers;
} | null>(null);

export function ChapterPromptReuseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const registry = useRef<ReuseHandlers>({});
  return (
    <NovelPromptReuseContext.Provider value={registry}>
      {children}
    </NovelPromptReuseContext.Provider>
  );
}

export function useRegisterPromptReuse(handlers: ReuseHandlers) {
  const registry = useContext(NovelPromptReuseContext);
  const latest = useRef(handlers);
  latest.current = handlers;
  const kinds = Object.keys(handlers).sort().join(",");
  useEffect(() => {
    if (!registry) return;
    const installed: ReuseHandlers = {};
    for (const kind of kinds
      .split(",")
      .filter(Boolean) as NovelPromptReuseKind[]) {
      const run: ReusePrompt = (text) => latest.current[kind]?.(text) ?? false;
      installed[kind] = run;
      registry.current[kind] = run;
    }
    return () => {
      for (const kind of Object.keys(installed) as NovelPromptReuseKind[]) {
        if (registry.current[kind] === installed[kind])
          delete registry.current[kind];
      }
    };
  }, [kinds, registry]);
}

export function useRegisterChapterPromptReuse(reuse: ReusePrompt) {
  useRegisterPromptReuse({ chapter: reuse });
}

export function useReuseChapterPrompt() {
  const reuse = useReusePrompt();
  return (text: string) => reuse("chapter", text);
}

export function useReusePrompt() {
  const registry = useContext(NovelPromptReuseContext);
  return (kind: NovelPromptReuseKind, text: string) =>
    registry?.current[kind]?.(text) ?? false;
}
