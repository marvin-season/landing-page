"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;

// 语言显示名称映射
const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

type LanguageSwitcherProps = {
  currentLang?: string;
  hideLabel?: boolean;
};

export const LanguageSwitcher = ({
  currentLang,
  hideLabel = false,
}: LanguageSwitcherProps = {}) => {
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathLocale = currentLang || pathSegments[0] || locales[0];

  function buildLanguagePath(locale: string) {
    return `/${locale}/${pathSegments.slice(1).join("/")}`;
  }

  const availableLocales = locales.filter((locale) => locale !== "pseudo");

  const handleValueChange = (locale: string) => {
    const newPath = buildLanguagePath(locale);
    router.push(newPath);
  };

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
      <Select value={pathLocale} onValueChange={handleValueChange}>
        <SelectTrigger
          id="language-select"
          className={cn("w-32 sm:w-40", hideLabel && "w-full")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLocales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {languageNames[locale] || locale}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
