"use client";

import { useLingui } from "@lingui/react/macro";
import { usePathname } from "next/navigation";
import { Fragment, type PropsWithChildren, useEffect, useState } from "react";
import { readBookkeepingRoute } from "@/lib/bookkeeping-pwa/routes";
import { BackupReminder } from "./backup-reminder";
import { BbqSettings } from "./bbq-settings";
import { MenuEditor } from "./menu-editor";
import { OrderEditor } from "./order-editor";
import { OrdersHome } from "./orders-home";

/** A single client shell lets new local record URLs work without a server round trip. */
export function BbqApp({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { t } = useLingui();
  const [mounted, setMounted] = useState(false);
  const route = readBookkeepingRoute(pathname);
  const title =
    route?.page === "editor"
      ? route.orderId
        ? t`编辑记录 · 记露`
        : t`新增记录 · 记露`
      : route?.page === "menu"
        ? t`菜单管理 · 记露`
        : route?.page === "settings"
          ? t`设置 · 记露`
          : t`记露 · 支出与热量统计`;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Preserve server HTML on initial hydration, including when SW serves the shell
  // at a different URL. Existing server pages still provide metadata and SSR.
  if (!mounted || !route) return children;

  return (
    <Fragment key={pathname}>
      {route.page === "editor" ? (
        <OrderEditor orderId={route.orderId} />
      ) : route.page === "menu" ? (
        <MenuEditor />
      ) : route.page === "settings" ? (
        <BbqSettings />
      ) : (
        <>
          <BackupReminder />
          <OrdersHome />
        </>
      )}
    </Fragment>
  );
}
