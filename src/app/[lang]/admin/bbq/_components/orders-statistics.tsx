"use client";

import { ChartLine, ReceiptText } from "lucide-react";
import { useState } from "react";
import { businessDayLabel } from "@/lib/bbq/business-day";
import { formatYuan } from "@/lib/bbq/money";
import type { BusinessDayStatistics } from "@/lib/bbq/statistics";
import { cls } from "./bbq-layout";

type ChartMode = "revenue" | "orders";

const chartModeCls = cls`
  inline-flex min-h-8 items-center justify-center rounded-md px-3 text-xs
  font-medium transition-colors
`;

const chartWidthPerPoint = 76;
const chartHeight = 260;
const chartPadding = { top: 20, right: 24, bottom: 48, left: 64 };

export function OrdersStatistics({
  statistics,
}: {
  statistics: BusinessDayStatistics[];
}) {
  const [chartMode, setChartMode] = useState<ChartMode>("revenue");

  if (statistics.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border bg-card px-6 text-center shadow-sm">
        <ReceiptText
          className="size-8 text-muted-foreground/60"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-foreground">暂无经营数据</p>
        <p className="mt-1 text-sm text-muted-foreground">
          创建订单后，这里会按档期汇总订单与已结金额
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
  const averagePerPeriod = Math.round(settledTotal / statistics.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
        <StatisticMetric label="累计档期" value={`${statistics.length} 档`} />
        <StatisticMetric label="全部订单" value={`${totalOrders} 张`} />
        <StatisticMetric label="已完成订单" value={`${settledOrders} 张`} />
        <StatisticMetric
          label="累计已结金额"
          value={formatYuan(settledTotal)}
        />
      </dl>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <ChartLine className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-medium text-foreground">档期趋势</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              按开单时间排列全部已有档期，平均每档已结金额
              {formatYuan(averagePerPeriod)}
            </p>
          </div>
          <div
            className="flex w-fit rounded-lg bg-muted p-0.5"
            role="tablist"
            aria-label="趋势指标"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "revenue"}
              className={`${chartModeCls} ${
                chartMode === "revenue"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setChartMode("revenue")}
            >
              已结金额
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "orders"}
              className={`${chartModeCls} ${
                chartMode === "orders"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setChartMode("orders")}
            >
              订单数
            </button>
          </div>
        </div>
        <TrendChart statistics={statistics} mode={chartMode} />
        <div className="min-h-0 overflow-auto border-t">
          <table className="w-full min-w-140 text-left text-sm">
            <thead className="sticky top-0 bg-muted/95 text-xs text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-4 py-2 font-medium">档期</th>
                <th className="px-4 py-2 text-right font-medium">订单</th>
                <th className="px-4 py-2 text-right font-medium">已完成</th>
                <th className="px-4 py-2 text-right font-medium">已结金额</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {statistics.toReversed().map((item) => (
                <tr key={item.businessDayKey}>
                  <td className="px-4 py-2.5 text-foreground">
                    {businessDayLabel(item.businessDayKey)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                    {item.orderCount} 张
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {item.settledOrderCount} 张
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                    {formatYuan(item.settledTotalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const width = Math.max(
    640,
    chartPadding.left +
      chartPadding.right +
      Math.max(1, statistics.length - 1) * chartWidthPerPoint,
  );
  const plotWidth = width - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const values = statistics.map((item) =>
    mode === "revenue" ? item.settledTotalCents : item.orderCount,
  );
  const maximum = Math.max(...values, 1);
  const points = statistics.map((item, index) => {
    const x =
      chartPadding.left +
      (statistics.length === 1
        ? plotWidth / 2
        : (index / (statistics.length - 1)) * plotWidth);
    const value = values[index] ?? 0;
    const y = chartPadding.top + plotHeight - (value / maximum) * plotHeight;
    return { item, value, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="shrink-0 overflow-x-auto px-2 py-3">
      <svg
        width={width}
        height={chartHeight}
        viewBox={`0 0 ${width} ${chartHeight}`}
        role="img"
        aria-label={
          mode === "revenue" ? "各档期已结金额趋势" : "各档期订单数趋势"
        }
      >
        {ticks.map((tick) => {
          const y = chartPadding.top + plotHeight - tick * plotHeight;
          const value = maximum * tick;
          return (
            <g key={tick}>
              <line
                x1={chartPadding.left}
                x2={width - chartPadding.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray={tick === 0 ? undefined : "4 4"}
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
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-primary"
        />
        {points.map(({ item, value, x, y }) => (
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
                {businessDayLabel(item.businessDayKey)}：
                {mode === "revenue"
                  ? formatYuan(item.settledTotalCents)
                  : `${item.orderCount} 张订单`}
              </title>
            </circle>
            <text
              x={x}
              y={chartHeight - 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {compactDayLabel(item.businessDayKey)}
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
  );
}

function StatisticMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function compactDayLabel(key: string): string {
  const date = key.slice(5, 10);
  return key.endsWith("#off") ? `${date} 非营业` : date;
}

function formatChartValue(value: number, mode: ChartMode): string {
  if (mode === "orders") return `${Math.round(value)}`;
  if (value >= 100_000) return `¥${(value / 100_000).toFixed(1)}k`;
  return `¥${Math.round(value / 100)}`;
}
