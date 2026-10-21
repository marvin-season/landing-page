"use client";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleDescription,
  CollapsibleTitle,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import type { I18n } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { formatYuan } from "@/lib/bbq/money";
import type { BusinessDayStatistics } from "@/lib/bbq/statistics";
import { formatCalories, formatCompactNumber } from "../../_lib/i18n";
import { homePath } from "../../_lib/paths";
import { cls } from "../../_styles/layout";
import { Companion } from "../companion/companion";
import { LocalLink as Link } from "../shared/local-link";
import { type ChartMode, TrendChart } from "./trend-chart";

// 配图跟随当前指标：小蜜蜂积累、思考回顾、运动热量。
const chartCompanionMoods = {
  revenue: "busy",
  orders: "ponder",
  calories: "exercise",
} as const;

const chartModeCls = cls`
  inline-flex items-center justify-center rounded-md px-3 text-xs font-medium
  transition-colors flex-1 focus-visible:outline-none focus-visible:ring-1
  focus-visible:ring-inset focus-visible:ring-primary/50 min-h-11
`;

export function OrdersStatistics({
  statistics,
  onSelectDay,
}: {
  statistics: BusinessDayStatistics[];
  onSelectDay: () => void;
}) {
  const { i18n, t } = useLingui();
  const [chartMode, setChartMode] = useState<ChartMode>("revenue");
  const [periodsRequested, setPeriodsRequested] = useState(false);

  if (statistics.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-xl bg-card px-6 text-center">
        <Companion mood="ponder" className="block size-28 shrink-0" />
        <p className="mt-3 text-sm font-medium text-foreground">
          <Trans>从第一笔开始</Trans>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans>记下日常，就能在这里回看金额和热量的变化。</Trans>
        </p>
      </div>
    );
  }

  const totalOrders = statistics.reduce(
    (total, item) => total + item.orderCount,
    0,
  );
  const settledOrders = statistics.reduce(
    (total, item) => total + item.settledOrderCount,
    0,
  );
  const settledTotal = statistics.reduce(
    (total, item) => total + item.settledTotalCents,
    0,
  );
  const settledCalories = statistics.reduce(
    (total, item) => ({
      totalKcal: total.totalKcal + item.settledCalories.totalKcal,
      recordedLineCount:
        total.recordedLineCount + item.settledCalories.recordedLineCount,
      missingLineCount:
        total.missingLineCount + item.settledCalories.missingLineCount,
    }),
    { totalKcal: 0, recordedLineCount: 0, missingLineCount: 0 },
  );
  const averagePerPeriod = Math.round(settledTotal / statistics.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 min-w-0 w-full pb-3">
      <dl className="grid shrink-0 gap-3 overflow-hidden rounded-xl bg-card grid-cols-2 p-4">
        <StatisticMetric
          label={t`累计已完成金额`}
          value={formatStatisticYuan(i18n, settledTotal)}
          fullValue={formatYuan(settledTotal)}
        />
        <StatisticMetric
          label={t`累计已完成热量`}
          value={formatCalories(i18n, settledCalories, { compact: true })}
          fullValue={formatCalories(i18n, settledCalories)}
        />
      </dl>
      <p className="text-xs text-muted-foreground px-1">
        <Trans>
          {statistics.length} 个时段 · {totalOrders} 笔记录 · 已完成{" "}
          {settledOrders} 笔
        </Trans>
      </p>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card min-w-0 flex-none">
        <div className="flex flex-col border-b py-3 shrink-0 gap-2 px-3">
          <div className="min-w-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-medium text-foreground">
                  <Trans>变化趋势</Trans>
                </h2>
              </div>
              <p
                className="mt-0.5 text-xs text-muted-foreground"
                title={formatYuan(averagePerPeriod)}
              >
                {t`每时段平均已完成金额 ${formatStatisticYuan(i18n, averagePerPeriod)}`}
              </p>
            </div>
            <Companion
              mood={chartCompanionMoods[chartMode]}
              className="block size-10 shrink-0"
            />
          </div>
          <div
            className="flex rounded-lg bg-muted p-0.5 shrink-0 w-full"
            role="group"
            aria-label={t`趋势指标`}
          >
            <button
              type="button"
              aria-pressed={chartMode === "revenue"}
              className={`${chartModeCls} ${
                chartMode === "revenue"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setChartMode("revenue")}
            >
              <Trans>已完成金额</Trans>
            </button>
            <button
              type="button"
              aria-pressed={chartMode === "orders"}
              className={`${chartModeCls} ${
                chartMode === "orders"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setChartMode("orders")}
            >
              <Trans>记录数</Trans>
            </button>
            <button
              type="button"
              aria-pressed={chartMode === "calories"}
              className={`${chartModeCls} ${chartMode === "calories" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setChartMode("calories")}
            >
              <Trans>热量（kcal）</Trans>
            </button>
          </div>
        </div>
        <TrendChart statistics={statistics} mode={chartMode} />
        <Collapsible className="px-3 pb-3 text-xs text-muted-foreground">
          <CollapsibleTrigger variant="default">
            <CollapsibleTitle>
              <Trans>金额和热量怎么算？</Trans>
            </CollapsibleTitle>
            <CollapsibleChevron />
          </CollapsibleTrigger>
          <CollapsibleContent variant="collapse">
            <p className="pt-2 leading-relaxed px-2.5">
              <Trans>
                金额与热量仅统计已完成记录；热量按每单位 ×
                数量汇总，正数为摄入、负数为消耗，合计为净热量；未填写的项目不计入，含缺失项时标记“部分”。
              </Trans>
            </p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible
          className="border-t"
          aria-label={t`时段明细`}
          onOpenChange={(open) => {
            if (open) setPeriodsRequested(true);
          }}
        >
          <CollapsibleTrigger variant="default">
            <CollapsibleTitle>
              <Trans>时段明细</Trans>
            </CollapsibleTitle>
            <CollapsibleDescription>
              <Trans>最近时段在前</Trans>
            </CollapsibleDescription>
            <CollapsibleChevron />
          </CollapsibleTrigger>
          <CollapsibleContent variant="collapse">
            {periodsRequested ? (
              <ul className="divide-y px-3">
                {statistics.toReversed().map((item) => (
                  <li key={item.businessDayKey} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <Link
                        href={homePath(item.businessDayKey)}
                        onNavigate={onSelectDay}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium tabular-nums text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        {item.businessDayKey.slice(0, 10)}
                        <span className="text-xs">
                          <Trans>查看记录 →</Trans>
                        </span>
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {item.businessDayKey.endsWith("#off")
                          ? t`休息时段`
                          : t`记账时段`}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-2 text-xs">
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">
                          <Trans>记录</Trans>
                        </dt>
                        <dd className="mt-0.5 tabular-nums text-foreground">
                          <Trans>{item.orderCount} 条</Trans>
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-muted-foreground">
                          <Trans>已完成</Trans>
                        </dt>
                        <dd className="mt-0.5 tabular-nums text-foreground">
                          <Trans>{item.settledOrderCount} 条</Trans>
                        </dd>
                      </div>
                      <div className="min-w-0 text-right">
                        <dt className="text-muted-foreground">
                          <Trans>已完成金额</Trans>
                        </dt>
                        <dd
                          className="mt-0.5 break-all text-sm font-semibold tabular-nums text-foreground"
                          title={formatYuan(item.settledTotalCents)}
                        >
                          {formatStatisticYuan(i18n, item.settledTotalCents)}
                        </dd>
                      </div>
                    </dl>
                    <p
                      className="mt-2 text-xs tabular-nums text-muted-foreground"
                      title={formatCalories(i18n, item.settledCalories)}
                    >
                      <Trans>
                        已完成热量{" "}
                        {formatCalories(i18n, item.settledCalories, {
                          compact: true,
                        })}
                      </Trans>
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
}

function StatisticMetric({
  label,
  value,
  fullValue,
}: {
  label: string;
  value: string;
  fullValue: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className="mt-1 text-xl font-semibold tabular-nums text-foreground break-all tracking-tight"
        title={fullValue}
        aria-label={fullValue}
      >
        {value}
      </dd>
    </div>
  );
}

function formatStatisticYuan(i18n: I18n, cents: number): string {
  if (Math.abs(cents) < 100_000) return formatYuan(cents);
  return `¥${formatCompactNumber(i18n, cents / 100)}`;
}
