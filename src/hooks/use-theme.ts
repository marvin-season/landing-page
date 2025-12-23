"use client";

import { useTheme as useNextTheme } from "next-themes";

export type Theme = "light" | "dark" | "system";

export const themeNames: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export const themes: Theme[] = ["system", "light", "dark"];

/**
 * 主题切换 Hook
 * 封装了主题切换的逻辑，包括当前主题、可用主题列表和切换方法
 */
export const useTheme = () => {
  const { setTheme, theme } = useNextTheme();

  const currentTheme = (theme as Theme) || "system";
  const availableThemes = themes;

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return {
    /** 当前主题 */
    theme: currentTheme,
    /** 可用主题列表 */
    themes: availableThemes,
    /** 切换主题的方法 */
    setTheme: changeTheme,
  };
};
