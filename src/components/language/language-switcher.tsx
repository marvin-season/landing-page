"use client";

import { usePathname } from "next/navigation";
import {
  type DropdownItem,
  HoverDropdown,
} from "@/components/ui/hover-dropdown";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;

// 语言显示名称映射
const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  pseudo: "Pseudo",
};

type LanguageSwitcherProps = {
  currentLang?: string;
};

export const LanguageSwitcher = async ({
  currentLang,
}: LanguageSwitcherProps = {}) => {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathLocale = currentLang || pathSegments[0] || locales[0];

  function buildLanguagePath(locale: string) {
    return `/${locale}/${pathSegments.slice(1).join("/")}`;
  }
  // 构建下拉菜单项
  const dropdownItems: DropdownItem[] = locales.map((locale) => ({
    id: locale,
    label: languageNames[locale] || locale,
    href: buildLanguagePath(locale),
  }));

  // 触发按钮
  const trigger = (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">Language</span>
      <span className="shrink-0 flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent">
        <span className="font-medium">
          {languageNames[pathLocale] || pathLocale}
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
      activeId={pathLocale}
      align="right"
      width="w-40"
    />
  );
};
