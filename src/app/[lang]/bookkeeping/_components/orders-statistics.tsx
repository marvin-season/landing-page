"use client";

import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/link/link";
import { formatYuan } from "@/lib/bbq/money";
import {
  type BusinessDayStatistics,
  getTrendRange,
} from "@/lib/bbq/statistics";
import { BbqCompanion } from "./bbq-companion";
import { businessDayLabel, formatCalories } from "./bbq-i18n";
import {
  cls,
  detailsChevronCls,
  detailsMotionCls,
  detailsSummaryCls,
} from "./bbq-layout";
import { bbqHomePath } from "./bbq-paths";

type ChartMode = "revenue" | "orders" | "calories";

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

const chartWidthPerPoint = 76;
const chartHeight = 260;
const chartPadding = { top: 20, right: 48, bottom: 48, left: 64 };

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
        <BbqCompanion mood="ponder" className="block size-28 shrink-0" />
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
          value={formatYuan(settledTotal)}
        />
        <StatisticMetric
          label={t`累计已完成热量`}
          value={formatCalories(i18n, settledCalories)}
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
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t`每时段平均已完成金额 ${formatYuan(averagePerPeriod)}`}
              </p>
            </div>
            <BbqCompanion
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
        <details
          className={`px-3 pb-3 text-xs text-muted-foreground ${detailsMotionCls}`}
        >
          <summary className={detailsSummaryCls}>
            <span className="min-w-0 flex-1">
              <Trans>金额和热量怎么算？</Trans>
            </span>
            <ChevronDown className={detailsChevronCls} aria-hidden="true" />
          </summary>
          <div className="min-h-0 overflow-clip">
            <p className="pt-2 leading-relaxed px-2.5">
              <Trans>
                金额与热量仅统计已完成记录；热量按每单位 ×
                数量汇总，正数为摄入、负数为消耗，合计为净热量；未填写的项目不计入，含缺失项时标记“部分”。
              </Trans>
            </p>
          </div>
        </details>
        <details
          className={`border-t ${detailsMotionCls}`}
          aria-label={t`时段明细`}
          onToggle={(event) => {
            if (event.currentTarget.open) setPeriodsRequested(true);
          }}
        >
          <summary className={detailsSummaryCls}>
            <h3 className="text-sm font-medium text-foreground flex-1">
              <Trans>时段明细</Trans>
            </h3>
            <span className="text-xs text-muted-foreground">
              <Trans>最近时段在前</Trans>
            </span>
            <ChevronDown className={detailsChevronCls} aria-hidden="true" />
          </summary>
          <div className="min-h-0 overflow-clip">
            {periodsRequested ? (
              <ul className="divide-y px-3">
                {statistics.toReversed().map((item) => (
                  <li key={item.businessDayKey} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <Link
                        href={bbqHomePath(item.businessDayKey)}
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
                        <dd className="mt-0.5 break-all text-sm font-semibold tabular-nums text-foreground">
                          {formatYuan(item.settledTotalCents)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      <Trans>
                        已完成热量 {formatCalories(i18n, item.settledCalories)}
                      </Trans>
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  );
}

function TrendChart({
  statistics,
  mode,
}: {
  statistics: BusinessDayStatistics[];
  mode: ChartMode;
}) {
  const { i18n, t } = useLingui();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const noCalorieData =
    mode === "calories" &&
    statistics.every((item) => item.settledCalories.recordedLineCount === 0);

  useEffect(() => {
    if (noCalorieData) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewportWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [noCalorieData]);

  if (noCalorieData) {
    return (
      <div className="flex min-h-48 shrink-0 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        <Trans>
          暂无热量数据。在常用项目中填写热量，再完成一笔新记录即可查看。
        </Trans>
      </div>
    );
  }

  // Fit short series to the viewport; keep longer series scrollable at readable spacing.
  const width = Math.max(
    viewportWidth || 280,
    chartPadding.left +
      chartPadding.right +
      Math.max(1, statistics.length - 1) * chartWidthPerPoint,
  );
  const plotWidth = width - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const values = statistics.map((item) =>
    mode === "revenue"
      ? item.settledTotalCents
      : mode === "orders"
        ? item.orderCount
        : item.settledCalories.recordedLineCount > 0
          ? item.settledCalories.totalKcal
          : null,
  );
  const { minimum, span } = getTrendRange(values);
  const points = statistics.map((item, index) => {
    const x =
      chartPadding.left +
      (statistics.length === 1
        ? plotWidth / 2
        : (index / (statistics.length - 1)) * plotWidth);
    const value = values[index];
    if (value == null) return null;
    const y =
      chartPadding.top + plotHeight - ((value - minimum) / span) * plotHeight;
    return { item, value, x, y };
  });
  // Missing calorie data is a gap, not a zero-calorie day.
  const line = points
    .map((point, index) =>
      point
        ? `${index === 0 || points[index - 1] === null ? "M" : "L"}${point.x},${point.y}`
        : "",
    )
    .join(" ");
  const zeroTick = -minimum / span;
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1, zeroTick])].sort(
    (a, b) => a - b,
  );

  return (
    <div className="shrink-0 px-2 py-3 min-w-0">
      <div
        ref={viewportRef}
        className="w-full overflow-x-auto overscroll-x-contain"
      >
        <svg
          width={width}
          height={chartHeight}
          viewBox={`0 0 ${width} ${chartHeight}`}
          role="img"
          aria-label={
            mode === "revenue"
              ? t`各时段已完成金额趋势`
              : mode === "orders"
                ? t`各时段记录数趋势`
                : t`各时段已完成热量趋势（kcal）`
          }
          className="block max-w-none"
        >
          {ticks.map((tick) => {
            const y = chartPadding.top + plotHeight - tick * plotHeight;
            const value = tick === zeroTick ? 0 : minimum + span * tick;
            return (
              <g key={tick}>
                <line
                  x1={chartPadding.left}
                  x2={width - chartPadding.right}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeDasharray={tick === zeroTick ? undefined : "4 4"}
                />
                <text
                  x={chartPadding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatChartValue(value, mode)}
                </text>
              </g>
            );
          })}
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-primary"
          />
          {points
            .filter((point) => point !== null)
            .map(({ item, value, x, y }) => (
              <g key={item.businessDayKey}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="fill-card text-primary"
                >
                  <title>
                    {businessDayLabel(i18n, item.businessDayKey)}：
                    {mode === "revenue"
                      ? formatYuan(item.settledTotalCents)
                      : mode === "orders"
                        ? t`${item.orderCount} 条记录`
                        : formatCalories(i18n, item.settledCalories)}
                  </title>
                </circle>
                <text
                  x={x}
                  y={chartHeight - 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {compactDayLabel(i18n, item.businessDayKey)}
                </text>
                <text
                  x={x}
                  y={Math.max(chartPadding.top + 12, y - 10)}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {formatChartValue(value, mode)}
                </text>
              </g>
            ))}
        </svg>
      </div>
      {viewportWidth > 0 && width > viewportWidth ? (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          <Trans>左右滑动查看全部时段</Trans>
        </p>
      ) : null}
    </div>
  );
}

function StatisticMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground break-all tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function compactDayLabel(i18n: I18n, key: string): string {
  const date = key.slice(5, 10);
  return key.endsWith("#off") ? i18n._(msg`${date} 休息`) : date;
}

function formatChartValue(value: number, mode: ChartMode): string {
  if (mode === "calories") return `${Number(value.toFixed(2))}`;
  if (mode === "orders") return `${Math.round(value)}`;
  if (value >= 100_000) return `¥${(value / 100_000).toFixed(1)}k`;
  return `¥${Math.round(value / 100)}`;
}
