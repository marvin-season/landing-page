"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { type Theme, themeNames, useTheme } from "@/hooks/use-theme";

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  shinchan: Sparkles,
} as const;

const themeShortNames: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
  shinchan: "Shin",
};

export function ThemePicker() {
  const { theme, themes, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedTheme = mounted ? theme : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className="cursor-pointer bg-transparent p-0 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          {themeShortNames[resolvedTheme]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={mounted ? theme : undefined}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {themes.map((themeValue) => {
            const Icon = themeIcons[themeValue];
            return (
              <DropdownMenuRadioItem key={themeValue} value={themeValue}>
                <Icon className="size-4" aria-hidden />
                {themeNames[themeValue]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
