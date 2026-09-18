"use client";

import { cn } from "@landing-page/utils";
import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { themeNames, useTheme } from "@/hooks/use-theme";

type ThemeSwitcherProps = {
  className?: string;
};

export const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const { theme, themes, setTheme } = useTheme();
  const selectId = useId();

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger
        id={selectId}
        aria-label="Theme"
        className={cn("flex items-center justify-between gap-2", className)}
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
  );
};
