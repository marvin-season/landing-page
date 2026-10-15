"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemePicker } from "@/components/theme/theme-picker";
import type { SettingsMenuProps } from "./type";

export const SettingsMenu = ({ currentLang }: SettingsMenuProps) => {
  const segment = useSelectedLayoutSegment();

  // 记账模块统一从设置页切换语言和主题。
  if (segment === "bookkeeping") return null;

  return (
    <div className="fixed top-3 right-3 z-100 flex items-center gap-2 sm:top-4 sm:right-4">
      <LanguageSwitcher currentLang={currentLang} />
      <ThemePicker />
    </div>
  );
};
