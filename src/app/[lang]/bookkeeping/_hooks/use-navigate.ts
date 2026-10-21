"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { canNavigateBookkeepingLocally } from "@/lib/bookkeeping-pwa/routes";
import { withLocalePrefix } from "@/lib/i18n/locales";
import { useOfflineNavigation } from "../_components/pwa/offline-navigation";

export function useNavigate() {
  const router = useRouter();
  const { currentLanguage } = useLanguage();
  const offlineNavigation = useOfflineNavigation();
  return (href: string) => {
    const localized = withLocalePrefix(href, currentLanguage);
    const to = new URL(localized, window.location.href);
    if (
      offlineNavigation &&
      canNavigateBookkeepingLocally(new URL(window.location.href), to)
    ) {
      window.history.pushState(null, "", to.href);
    } else {
      router.push(localized);
    }
  };
}
