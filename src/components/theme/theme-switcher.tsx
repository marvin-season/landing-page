"use client";

import { useTheme } from "next-themes";
import {
  type DropdownItem,
  HoverDropdown,
} from "@/components/ui/hover-dropdown";
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

  // 构建下拉菜单项
  const dropdownItems: DropdownItem[] = themes.map((themeValue) => ({
    id: themeValue,
    label: themeNames[themeValue] || themeValue,
    onClick: () => setTheme(themeValue),
  }));

  // 触发按钮
  const trigger = (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground">Theme</span>
      <span className="shrink-0 flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent">
        <span className="font-medium">
          {theme ? themeNames[theme] || theme : "System"}
        </span>
        <svg
          className="h-4 w-4 transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </span>
    </div>
  );

  return (
    <HoverDropdown
      trigger={trigger}
      items={dropdownItems}
      activeId={theme || undefined}
      align="right"
      width="w-40"
    />
  );
};
