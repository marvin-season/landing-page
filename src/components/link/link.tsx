"use client";

import { track } from "@vercel/analytics/react";
import NextLink, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useLanguage } from "@/hooks/use-language";
import { withLocalePrefix } from "@/lib/i18n/locales";

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export type AppLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children?: ReactNode;
    eventName?: string;
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

export function Link({
  children,
  eventName,
  eventProperties,
  href,
  onClick,
  ...props
}: AppLinkProps) {
  const { currentLanguage } = useLanguage();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (eventName) track(eventName, eventProperties);
    onClick?.(event);
  }

  return (
    <NextLink
      {...props}
      href={localizeHref(href, currentLanguage)}
      onClick={handleClick}
    >
      {children}
    </NextLink>
  );
}
