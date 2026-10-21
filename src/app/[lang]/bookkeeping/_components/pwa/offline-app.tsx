"use client";

import { useLingui } from "@lingui/react/macro";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { readBookkeepingRoute } from "@/lib/bookkeeping-pwa/routes";
import { Announcements } from "../announcements/announcements";
import { OrdersHome } from "../home/orders-home";
import { MenuEditor } from "../menu/menu-editor";
import { OrderEditor } from "../order/order-editor";
import { Settings } from "../settings/settings";
import { Tools } from "../tools/tools";

/** Only the cached offline document resolves local pages without a server. */
export function OfflineApp() {
  const pathname = usePathname();
  const { t } = useLingui();
  const [mounted, setMounted] = useState(false);
  const route = readBookkeepingRoute(pathname);
  const title =
    route?.page === "editor"
      ? route.orderId
        ? t`编辑记录 · 记露`
        : t`新增记录 · 记露`
      : route?.page === "announcements"
        ? t`公告 · 记露`
        : route?.page === "menu"
          ? t`菜单管理 · 记露`
          : route?.page === "settings"
            ? t`设置 · 记露`
            : route?.page === "tools"
              ? "工具 · 记露"
              : t`记露 · 支出与热量统计`;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.title = title;
  }, [title]);

  // The cached document has no record-specific content. Wait for hydration
  // before resolving the actual URL at which the worker served this fallback.
  if (!mounted || !route) return null;

  return (
    <Fragment key={pathname}>
      {route.page === "editor" ? (
        <OrderEditor orderId={route.orderId} />
      ) : route.page === "announcements" ? (
        <Announcements />
      ) : route.page === "menu" ? (
        <MenuEditor />
      ) : route.page === "settings" ? (
        <Settings />
      ) : route.page === "tools" ? (
        <Tools />
      ) : (
        <OrdersHome />
      )}
    </Fragment>
  );
}
