"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type Theme, useTheme } from "@/hooks/use-theme";

export function HomeHeroTheme({
  children,
  variants,
}: {
  children: ReactNode;
  variants: Partial<Record<Theme, ReactNode>>;
}) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the default server-rendered content visible in the initial HTML and
  // during hydration. Theme variants arrive as server-rendered ReactNode slots.
  return mounted ? (variants[theme] ?? children) : children;
}
