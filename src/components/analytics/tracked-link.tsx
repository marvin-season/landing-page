"use client";

import { track } from "@vercel/analytics/react";
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useLanguage } from "@/hooks/use-language";
import { withLocalePrefix } from "@/lib/i18n/locales";

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode;
    eventName: string;
    eventProperties?: AnalyticsProperties;
  };

function localizeHref(
  href: LinkProps["href"],
  locale: string,
): LinkProps["href"] {
  if (typeof href === "string") return withLocalePrefix(href, locale);
  if (href.pathname) {
    return { ...href, pathname: withLocalePrefix(href.pathname, locale) };
  }
  return href;
}

export function TrackedLink({
  children,
  eventName,
  eventProperties,
  href,
  onClick,
  ...props
}: TrackedLinkProps) {
  const { currentLanguage } = useLanguage();
  const localizedHref = localizeHref(href, currentLanguage);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track(eventName, eventProperties);
    onClick?.(event);
  }

  return (
    <Link {...props} href={localizedHref} onClick={handleClick}>
      {children}
    </Link>
  );
}
