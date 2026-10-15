"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { useLanguage } from "@/hooks/use-language";
import {
  type AppLocale,
  languageNames,
  languageShortNames,
} from "@/lib/i18n/locales";

type LanguageSwitcherProps = {
  currentLang?: string;
  display?: "short" | "label";
};

function isAppLocale(value: string): value is AppLocale {
  return value in languageShortNames;
}

export const LanguageSwitcher = ({
  currentLang,
  display = "short",
}: LanguageSwitcherProps) => {
  const { currentLanguage, availableLanguages, setLanguage } =
    useLanguage(currentLang);
  const selectedLabel = isAppLocale(currentLanguage)
    ? (display === "label" ? languageNames : languageShortNames)[
        currentLanguage
      ]
    : currentLanguage.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Language"
          className="cursor-pointer bg-transparent p-0 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          {selectedLabel}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={currentLanguage}
          onValueChange={setLanguage}
        >
          {availableLanguages.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              <span className="w-6 text-xs text-muted-foreground">
                {languageShortNames[locale]}
              </span>
              {languageNames[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
