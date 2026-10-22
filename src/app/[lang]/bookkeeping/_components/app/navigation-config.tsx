"use client";

import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  BookOpen,
  type LucideIcon,
  NotebookPen,
  Settings as SettingsIcon,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  type BookkeepingRoute,
  bookkeepingPath,
} from "@/lib/bookkeeping-pwa/routes";
import { Announcements } from "../announcements/announcements";
import { OrdersHome } from "../home/orders-home";
import { MenuEditor } from "../menu/menu-editor";
import { OrderEditor } from "../order/order-editor";
import { Settings } from "../settings/settings";
import { Tools } from "../tools/tools";

type NavigationItem = {
  label: MessageDescriptor;
  icon: LucideIcon;
  requiresBusinessHours?: boolean;
};

type PageConfig = {
  title: (i18n: I18n, route: BookkeepingRoute | null) => string;
  render: (route: BookkeepingRoute | null) => ReactNode;
  navigation?: NavigationItem;
};

// Entries with navigation appear in the nav in this order; others remain routable.
export const bookkeepingPages: Record<BookkeepingRoute["page"], PageConfig> = {
  "": {
    title: (i18n) => i18n._(msg`记露 · 支出与热量统计`),
    render: () => <OrdersHome />,
    navigation: {
      label: msg`账本`,
      icon: BookOpen,
    },
  },
  "orders/new": {
    title: (i18n) => i18n._(msg`新增记录 · 记露`),
    render: () => <OrderEditor />,
    navigation: {
      label: msg`记一笔`,
      icon: NotebookPen,
      requiresBusinessHours: true,
    },
  },
  tools: {
    title: () => "工具 · 记露",
    render: () => <Tools />,
    navigation: {
      label: msg`工具`,
      icon: Wrench,
    },
  },
  settings: {
    title: (i18n) => i18n._(msg`设置 · 记露`),
    render: () => <Settings />,
    navigation: {
      label: msg`设置`,
      icon: SettingsIcon,
    },
  },
  announcements: {
    title: (i18n) => i18n._(msg`公告 · 记露`),
    render: () => <Announcements />,
  },
  menu: {
    title: (i18n) => i18n._(msg`菜单管理 · 记露`),
    render: () => <MenuEditor />,
  },
  "orders/[id]": {
    title: (i18n) => i18n._(msg`编辑记录 · 记露`),
    render: (route) => <OrderEditor orderId={route?.orderId} />,
  },
};

export const bookkeepingNavigationItems = Object.entries(
  bookkeepingPages,
).flatMap(([path, { navigation }]) =>
  navigation
    ? [
        {
          ...navigation,
          href: bookkeepingPath(path),
          segment: path.split("/")[0] || null,
        },
      ]
    : [],
);
