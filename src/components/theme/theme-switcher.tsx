"use client";

import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  className?: string;
};

const themeNames: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  neutral: "Neutral",
};

const themes: string[] = ["light", "dark", "neutral"];

export const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const mounted = useMounted();
  const { setTheme, theme } = useTheme();

  if (!mounted) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label className="hidden sm:inline text-muted-foreground font-bold text-sm">
        Theme
      </label>
      <Select value={theme || undefined} onValueChange={setTheme}>
        <SelectTrigger className="w-32 sm:w-40">
          <SelectValue placeholder="System" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((themeValue) => (
            <SelectItem key={themeValue} value={themeValue}>
              {themeNames[themeValue] || themeValue}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
