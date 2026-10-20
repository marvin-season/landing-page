import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import { formatYuan } from "@/lib/bbq/money";
import {
  type BusinessDayStatistics,
  getTrendRange,
} from "@/lib/bbq/statistics";
import {
  businessDayLabel,
  formatCalories,
  formatCompactNumber,
} from "../../_lib/bbq-i18n";

export type ChartMode = "revenue" | "orders" | "calories";

const chartWidthPerPoint = 76;
const chartHeight = 260;
const chartPadding = { top: 20, right: 48, bottom: 48, left: 64 };

export function TrendChart({
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
                  {formatChartValue(i18n, value, mode)}
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
                  {formatChartValue(i18n, value, mode)}
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

function compactDayLabel(i18n: I18n, key: string): string {
  const date = key.slice(5, 10);
  return key.endsWith("#off") ? i18n._(msg`${date} 休息`) : date;
}

function formatChartValue(i18n: I18n, value: number, mode: ChartMode): string {
  if (mode === "calories") return formatCompactNumber(i18n, value);
  if (mode === "orders") return `${Math.round(value)}`;
  if (Math.abs(value) >= 100_000)
    return `¥${formatCompactNumber(i18n, value / 100)}`;
  return `¥${Math.round(value / 100)}`;
}
