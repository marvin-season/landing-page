"use client";

import { Trans, useLingui } from "@lingui/react/macro";

import { ChevronDown } from "lucide-react";
import { businessDayLabel } from "./bbq-i18n";
import { cls } from "./bbq-layout";
import { BusinessDayCalendar } from "./business-day-calendar";

export type HomeView = "orders" | "statistics";

const homeViewTabCls = cls`
  inline-flex items-center justify-center rounded-none font-medium transition-colors
  min-h-11 gap-1.5 px-1 text-sm [&>svg]:size-3.5 focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50
  min-w-0 duration-150 active:bg-primary/10 touch-manipulation
  motion-reduce:transition-none border-b-2
`;

export function OrdersHomeTabs({
  day,
  homeView,
  onViewChange,
}: {
  day: string;
  homeView: HomeView;
  onViewChange: (view: HomeView) => void;
}) {
  const { i18n, t } = useLingui();
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <div
        className="flex w-full gap-6 border-b"
        role="group"
        aria-label={t`账本视图`}
      >
        <BusinessDayCalendar day={day}>
          <button
            type="button"
            disabled={!day}
            aria-pressed={homeView === "orders"}
            aria-label={`${day ? businessDayLabel(i18n, day) : t`当前时段`}，${homeView === "orders" ? t`打开日历` : t`查看记录`}`}
            className={`${homeViewTabCls} ${
              homeView === "orders"
                ? "text-foreground border-primary"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
            onClick={(event) => {
              if (homeView !== "orders") {
                // 从统计返回时先切换视图；再次点击当前时段才打开日历。
                event.preventDefault();
                onViewChange("orders");
              }
            }}
          >
            <span className="shrink-0">
              <Trans>明细</Trans>
            </span>
            {day ? (
              <span
                className="truncate text-[11px] font-normal tabular-nums text-muted-foreground"
                title={businessDayLabel(i18n, day)}
              >
                {day.slice(5, 10)}
                {day.endsWith("#off") ? t` 休息` : ""}
              </span>
            ) : null}
            <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        </BusinessDayCalendar>
        <button
          type="button"
          aria-pressed={homeView === "statistics"}
          className={`${homeViewTabCls} ${
            homeView === "statistics"
              ? "text-foreground border-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
          onClick={() => onViewChange("statistics")}
        >
          <Trans>统计</Trans>
        </button>
      </div>
      {homeView === "statistics" ? (
        <p className="text-xs text-muted-foreground">
          <Trans>全部历史记录 · 仅保存在这台设备</Trans>
        </p>
      ) : null}
    </div>
  );
}
