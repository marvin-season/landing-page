"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { withLocalePrefix } from "@/lib/i18n/locales";

export function useBbqNavigate() {
  const router = useRouter();
  const { currentLanguage } = useLanguage();
  return (href: string) => {
    router.push(withLocalePrefix(href, currentLanguage));
  };
}
