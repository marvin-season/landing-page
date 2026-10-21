"use client";

import { type AppLinkProps, Link } from "@/components/link/link";
import { useLanguage } from "@/hooks/use-language";
import { canNavigateBookkeepingLocally } from "@/lib/bookkeeping-pwa/routes";
import { withLocalePrefix } from "@/lib/i18n/locales";
import { useOfflineNavigation } from "../pwa/offline-navigation";

export function LocalLink({
  href,
  onNavigate,
  prefetch,
  replace,
  ...props
}: AppLinkProps) {
  const { currentLanguage } = useLanguage();
  const offlineNavigation = useOfflineNavigation();

  if (!offlineNavigation) {
    return (
      <Link
        {...props}
        href={href}
        onNavigate={onNavigate}
        prefetch={prefetch}
        replace={replace}
      />
    );
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      replace={replace}
      onNavigate={(event) => {
        let prevented = false;
        onNavigate?.({
          preventDefault() {
            prevented = true;
            event.preventDefault();
          },
        });
        if (prevented || typeof href !== "string") return;
        const to = new URL(
          withLocalePrefix(href, currentLanguage),
          location.href,
        );
        if (!canNavigateBookkeepingLocally(new URL(location.href), to)) return;
        event.preventDefault();
        // Only the cached offline document needs local navigation.
        if (replace) window.history.replaceState(null, "", to.href);
        else window.history.pushState(null, "", to.href);
      }}
    />
  );
}
