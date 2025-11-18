"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  className?: string;
};

export const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const mounted = useMounted();
  const { setTheme, theme } = useTheme();

  if (!mounted) return null;

  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="text-muted-foreground">Theme</span>
      <select
        value={theme}
        onChange={(event) => {
          setTheme(event.target.value);
        }}
        className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Switch theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="neutral">Neutral</option>
      </select>
    </label>
  );
};
