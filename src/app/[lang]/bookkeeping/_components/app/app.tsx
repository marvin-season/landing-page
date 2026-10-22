"use client";

import { useLingui } from "@lingui/react/macro";
import { usePathname } from "next/navigation";
import { Fragment, type PropsWithChildren, useEffect, useState } from "react";
import { readBookkeepingRoute } from "@/lib/bookkeeping-pwa/routes";
import { bookkeepingPages } from "./navigation-config";

/** A single client shell lets new local record URLs work without a server round trip. */
export function App({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { i18n } = useLingui();
  const [mounted, setMounted] = useState(false);
  const route = readBookkeepingRoute(pathname);
  const page = bookkeepingPages[route?.page ?? ""];
  const title = page.title(i18n, route);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Preserve server HTML on initial hydration, including when SW serves the shell
  // at a different URL. Existing server pages still provide metadata and SSR.
  if (!mounted || !route) return children;

  return <Fragment key={pathname}>{page.render(route)}</Fragment>;
}
