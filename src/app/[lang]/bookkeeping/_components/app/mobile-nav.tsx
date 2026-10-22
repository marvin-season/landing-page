"use client";
import { cn } from "@landing-page/utils";

import { useLingui } from "@lingui/react/macro";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isBusinessHours } from "@/lib/bbq/business-day";

import { LocalLink as Link } from "../shared/local-link";
import { bookkeepingNavigationItems } from "./navigation-config";

export function MobileNav() {
  const { t, i18n } = useLingui();
  const pathname = usePathname();
  const segment = pathname.split("/bookkeeping/")[1]?.split("/")[0] ?? null;
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
      className={cn(
        "relative z-30 bg-background shrink-0",
        segment === "orders" ? "mt-0" : "mt-2",
        "border-t lg:border-t-0 lg:border-r lg:mt-0",
      )}
    >
      <div className="mx-auto grid grid-cols-4 gap-1 py-1.5 px-2 lg:flex lg:flex-col lg:gap-4 lg:h-full">
        {bookkeepingNavigationItems.map(
          ({
            label,
            href,
            segment: itemSegment,
            icon: Icon,
            requiresBusinessHours,
          }) => {
            const active = segment === itemSegment;
            const disabled = requiresBusinessHours && !canCreate && !active;

            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-xs
                font-medium text-muted-foreground transition-colors hover:bg-muted/70 lg:flex-row lg:items-center lg:justify-start lg:px-4
                aria-disabled:opacity-40 touch-manipulation aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary`}
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
          },
        )}
      </div>
    </nav>
  );
}
