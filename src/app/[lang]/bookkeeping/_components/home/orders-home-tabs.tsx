"use client";

import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown } from "lucide-react";
import { businessDayLabel } from "../../_lib/i18n";
import { BookkeepingTab } from "../shared/bookkeeping-tab";

import { BusinessDayCalendar } from "./business-day-calendar";

export type HomeView = "orders" | "statistics";

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
          <BookkeepingTab
            variant="view"
            type="button"
            disabled={!day}
            selected={homeView === "orders"}
            aria-label={`${day ? businessDayLabel(i18n, day) : t`当前时段`}，${homeView === "orders" ? t`打开日历` : t`查看记录`}`}
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
          </BookkeepingTab>
        </BusinessDayCalendar>
        <BookkeepingTab
          variant="view"
          type="button"
          selected={homeView === "statistics"}
          onClick={() => onViewChange("statistics")}
        >
          <Trans>统计</Trans>
        </BookkeepingTab>
      </div>
      {homeView === "statistics" ? (
        <p className="text-xs text-muted-foreground">
          <Trans>全部历史记录 · 仅保存在这台设备</Trans>
        </p>
      ) : null}
    </div>
  );
}
