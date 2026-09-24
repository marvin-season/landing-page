"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  availableLocales,
  isLocale,
  sourceLocale,
  withLocalePrefix,
} from "@/lib/i18n/locales";

/**
 * 语言切换 Hook
 * 封装了语言切换的逻辑，包括当前语言、可用语言列表和切换方法
 */
export const useLanguage = (currentLang?: string) => {
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split("/").filter(Boolean);
  const hasPrefix = Boolean(pathSegments[0] && isLocale(pathSegments[0]));
  const rest = hasPrefix ? pathSegments.slice(1) : pathSegments;
  const pathLocale =
    currentLang || (hasPrefix ? pathSegments[0] : sourceLocale);

  /**
   * 构建指定语言的新路径。`en` 无前缀：`/`、`/docs`；其他：`/zh`、`/zh/docs`。
   */
  const buildLanguagePath = (locale: string) => {
    const tail = rest.join("/");
    return withLocalePrefix(tail ? `/${tail}` : "/", locale);
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
