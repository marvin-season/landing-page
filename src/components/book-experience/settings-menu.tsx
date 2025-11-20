"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/hooks/use-mounted";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;

// 主题名称映射
const themeNames: Record<string, string> = {
  light: "Light",
  dark: "Dark",
  neutral: "Neutral",
};

const themes: string[] = ["light", "dark", "neutral"];

// 语言显示名称映射
const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

type SettingsMenuProps = {
  currentLang?: string;
};

export const SettingsMenu = ({ currentLang }: SettingsMenuProps) => {
  const mounted = useMounted();
  const { setTheme, theme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const pathSegments = pathname.split("/").filter(Boolean);
  const pathLocale = currentLang || pathSegments[0] || locales[0];
  const availableLocales = locales.filter((locale) => locale !== "pseudo");

  function buildLanguagePath(locale: string) {
    return `/${locale}/${pathSegments.slice(1).join("/")}`;
  }

  const handleLanguageChange = (locale: string) => {
    const newPath = buildLanguagePath(locale);
    router.push(newPath);
  };

  if (!mounted) return null;

  return (
    <div className="fixed z-10 top-3 right-3 sm:top-4 sm:right-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-background/60 backdrop-blur-md border-border/60 shadow-md hover:bg-background/80"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 sm:w-56 bg-background/95 backdrop-blur-md border-border/60"
        >
          <DropdownMenuLabel className="text-xs sm:text-sm">
            Theme
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme || undefined}
            onValueChange={setTheme}
          >
            {themes.map((themeValue) => (
              <DropdownMenuRadioItem
                key={themeValue}
                value={themeValue}
                className="text-xs sm:text-sm"
              >
                {themeNames[themeValue] || themeValue}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs sm:text-sm">
            Language
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={pathLocale}
            onValueChange={handleLanguageChange}
          >
            {availableLocales.map((locale) => (
              <DropdownMenuRadioItem
                key={locale}
                value={locale}
                className="text-xs sm:text-sm"
              >
                {languageNames[locale] || locale}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

