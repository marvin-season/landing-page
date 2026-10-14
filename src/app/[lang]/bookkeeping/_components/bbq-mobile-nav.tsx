"use client";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";

import { Bookmark, BookOpen, NotebookPen, Settings } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/components/link/link";
import { isBusinessHours } from "@/lib/bbq/business-day";
import { cls } from "./bbq-layout";
import {
  bbqHomePath,
  bbqMenuPath,
  bbqNewOrderPath,
  bbqSettingsPath,
} from "./bbq-paths";

const items = [
  { label: msg`账本`, href: bbqHomePath(), segment: null, icon: BookOpen },
  {
    label: msg`记一笔`,
    href: bbqNewOrderPath(),
    segment: "orders",
    icon: NotebookPen,
  },
  {
    label: msg`常用`,
    href: bbqMenuPath(),
    segment: "menu",
    icon: Bookmark,
  },
  {
    label: msg`设置`,
    href: bbqSettingsPath(),
    segment: "settings",
    icon: Settings,
  },
];

const mobileNavLinkCls = cls`
  flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs
  font-medium text-muted-foreground transition-colors hover:bg-muted/70
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
  focus-visible:ring-primary/50 aria-[current=page]:bg-primary/5
  aria-[current=page]:text-primary aria-disabled:opacity-40 touch-manipulation
`;

export function BbqMobileNav() {
  const { t, i18n } = useLingui();
  const segment = useSelectedLayoutSegment();
  const [canCreate, setCanCreate] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setCanCreate(isBusinessHours(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  return (
    <nav
      aria-label={t`Loopy 记账主导航`}
      className="relative z-30 bg-background shrink-0 mt-2 border-t"
    >
      <div className="mx-auto grid grid-cols-4 gap-1 py-1.5">
        {items.map(({ label, href, segment: itemSegment, icon: Icon }) => {
          const active = segment === itemSegment;
          const disabled = itemSegment === "orders" && !canCreate && !active;

          return (
            <Link
              key={href}
              href={href}
              className={mobileNavLinkCls}
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled || undefined}
              title={disabled ? t`当前为休息时段，06:00 后可记账` : undefined}
              onClick={(event) => {
                // 当前模块不重复跳转，避免点中记账导航时清空正在编辑的记录。
                if (active || disabled) event.preventDefault();
              }}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>
                {disabled && canCreate === false
                  ? t`记账·休息中`
                  : i18n._(label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
