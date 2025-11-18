"use client";

import { useRouter } from "next/navigation";
import linguiConfig from "~/lingui.config";

const { locales, sourceLocale } = linguiConfig;

export const LanguageSwitcher = () => {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Language</span>
      <select
        value={sourceLocale}
        onChange={(event) => {
          router.replace(`/${event.target.value}`);
        }}
        className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Switch language"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {locale}
          </option>
        ))}
      </select>
    </label>
  );
};
