"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { themeNames, useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type ThemeSwitcherProps = {
  className?: string;
  hideLabel?: boolean;
};

export const ThemeSwitcher = ({
  className,
  hideLabel = false,
}: ThemeSwitcherProps) => {
  const { theme, themes, setTheme } = useTheme();

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      {!hideLabel && (
        <label
          htmlFor="theme-select"
          className="hidden sm:inline text-muted-foreground font-bold text-sm"
        >
          Theme
        </label>
      )}
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger
          id="theme-select"
          className={cn("w-32 sm:w-40", hideLabel && "w-full")}
        >
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
