"use client";

import { track } from "@vercel/analytics/react";
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

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

export function TrackedLink({
  children,
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track(eventName, eventProperties);
    onClick?.(event);
  }

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
