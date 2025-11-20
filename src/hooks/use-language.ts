"use client";

import { usePathname, useRouter } from "next/navigation";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;

// 语言显示名称映射
export const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

/**
 * 语言切换 Hook
 * 封装了语言切换的逻辑，包括当前语言、可用语言列表和切换方法
 */
export const useLanguage = (currentLang?: string) => {
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathLocale = currentLang || pathSegments[0] || locales[0];

  // 过滤掉 pseudo 语言（伪本地化语言，用于测试）
  const availableLocales = locales.filter((locale) => locale !== "pseudo");

  /**
   * 构建指定语言的新路径
   */
  const buildLanguagePath = (locale: string) => {
    return `/${locale}/${pathSegments.slice(1).join("/")}`;
  };

  /**
   * 切换语言
   */
  const changeLanguage = (locale: string) => {
    const newPath = buildLanguagePath(locale);
    router.push(newPath);
  };

  return {
    /** 当前语言 */
    currentLanguage: pathLocale,
    /** 可用语言列表 */
    availableLanguages: availableLocales,
    /** 切换语言的方法 */
    setLanguage: changeLanguage,
    /** 构建语言路径的方法 */
    buildLanguagePath,
  };
};

