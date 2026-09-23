"use client";

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";

export const TRANSLATION_LANGUAGES = [
  "en",
  "ja",
  "ko",
  "zh-Hans",
  "ru",
  "fr",
  "ar",
  "ug",
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export const TRANSLATION_LANGUAGE_OPTIONS: Array<{
  value: TranslationLanguage;
  label: string;
}> = [
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "ru", label: "Русский" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "ug", label: "ئۇيغۇرچە" },
];

export const TRANSLATION_INSTRUCTIONS: Record<
  TranslationLanguage,
  MessageDescriptor
> = {
  en: msg`Translate this passage into American English.`,
  ja: msg`Translate this passage into Japanese.`,
  ko: msg`Translate this passage into Korean.`,
  "zh-Hans": msg`Translate this passage into Simplified Chinese.`,
  ru: msg`Translate this passage into Russian.`,
  fr: msg`Translate this passage into French.`,
  ar: msg`Translate this passage into Arabic.`,
  ug: msg`Translate this passage into Uyghur.`,
};

const STORAGE_KEY = "knowledge:translate-language";
const TRANSLATION_LANGUAGE_SET = new Set<string>(TRANSLATION_LANGUAGES);

let storedLanguageCache: TranslationLanguage | null | undefined;

export function isTranslationLanguage(
  value: string,
): value is TranslationLanguage {
  return TRANSLATION_LANGUAGE_SET.has(value);
}

const UI_TO_TRANSLATION_LANGUAGE: Partial<Record<string, TranslationLanguage>> =
  {
    en: "en",
    ja: "ja",
    ko: "ko",
    zh: "zh-Hans",
    ru: "ru",
    fr: "fr",
    ar: "ar",
    ug: "ug",
  };

export function defaultTranslationLanguage(
  uiLocale: string,
): TranslationLanguage {
  return UI_TO_TRANSLATION_LANGUAGE[uiLocale] ?? "zh-Hans";
}

export function readStoredTranslationLanguage(): TranslationLanguage | null {
  if (storedLanguageCache !== undefined) return storedLanguageCache;
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    storedLanguageCache = value && isTranslationLanguage(value) ? value : null;
  } catch {
    storedLanguageCache = null;
  }
  return storedLanguageCache ?? null;
}

export function writeStoredTranslationLanguage(language: TranslationLanguage) {
  storedLanguageCache = language;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function useTranslationLanguage() {
  const { i18n } = useLingui();
  const [language, setLanguageState] = useState<TranslationLanguage>(
    () =>
      readStoredTranslationLanguage() ??
      defaultTranslationLanguage(i18n.locale),
  );

  const setLanguage = useCallback((next: TranslationLanguage) => {
    setLanguageState(next);
    writeStoredTranslationLanguage(next);
  }, []);

  return { language, setLanguage };
}
