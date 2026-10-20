"use client";

import { type AppLinkProps, Link } from "@/components/link/link";
import { useLanguage } from "@/hooks/use-language";
import { canNavigateBookkeepingLocally } from "@/lib/bookkeeping-pwa/routes";
import { withLocalePrefix } from "@/lib/i18n/locales";

export function BbqLink({ href, onNavigate, ...props }: AppLinkProps) {
  const { currentLanguage } = useLanguage();

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
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
        // Next's History API integration updates pathname/search and back/forward
        // without fetching an RSC response. Modified clicks keep native behavior.
        window.history.pushState(null, "", to.href);
      }}
    />
  );
}
