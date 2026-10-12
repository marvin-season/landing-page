"use client";

import { ChartLine, ChevronDown } from "lucide-react";
import { businessDayLabel } from "@/lib/bbq/business-day";
import { cls } from "./bbq-layout";
import { BusinessDayCalendar } from "./business-day-calendar";

export type HomeView = "orders" | "statistics";

const homeViewTabCls = cls`
  inline-flex items-center justify-center rounded-md font-medium transition-colors
  min-h-10 gap-1.5 px-2 text-xs [&>svg]:size-3.5 flex-1 focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50
  min-w-0 basis-0 duration-150 active:bg-primary/10 touch-manipulation
  motion-reduce:transition-none
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
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <div
        className="flex rounded-lg bg-muted p-0.5 w-full"
        role="group"
        aria-label="首页视图"
      >
        <BusinessDayCalendar day={day}>
          <button
            type="button"
            disabled={!day}
            aria-pressed={homeView === "orders"}
            aria-label={`${day ? businessDayLabel(day) : "当前时段"}，${homeView === "orders" ? "打开日历" : "查看记录"}`}
            className={`${homeViewTabCls} ${
              homeView === "orders"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={(event) => {
              if (homeView !== "orders") {
                // 从统计返回时先切换视图；再次点击当前时段才打开日历。
                event.preventDefault();
                onViewChange("orders");
              }
            }}
          >
            <span className="shrink-0">当前时段</span>
            {day ? (
              <span
                className="truncate text-[11px] font-normal tabular-nums text-muted-foreground"
                title={businessDayLabel(day)}
              >
                {day.slice(5, 10)}
                {day.endsWith("#off") ? " 休息" : ""}
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
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onViewChange("statistics")}
        >
          <ChartLine className="size-4" aria-hidden="true" />
          统计趋势
        </button>
      </div>
      {homeView === "statistics" ? (
        <p className="text-xs text-muted-foreground">
          汇总本机保存的全部历史记录
        </p>
      ) : null}
    </div>
  );
}
