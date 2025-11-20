"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languageNames, useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  currentLang?: string;
  hideLabel?: boolean;
};

export const LanguageSwitcher = ({
  currentLang,
  hideLabel = false,
}: LanguageSwitcherProps = {}) => {
  const { currentLanguage, availableLanguages, setLanguage } =
    useLanguage(currentLang);

  return (
    <div className="flex items-center justify-between gap-2">
      {!hideLabel && (
        <label
          htmlFor="language-select"
          className="hidden sm:inline text-muted-foreground font-bold text-sm"
        >
          Language
        </label>
      )}
      <Select value={currentLanguage} onValueChange={setLanguage}>
        <SelectTrigger
          id="language-select"
          className={cn("w-32 sm:w-40", hideLabel && "w-full")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {languageNames[locale] || locale}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
