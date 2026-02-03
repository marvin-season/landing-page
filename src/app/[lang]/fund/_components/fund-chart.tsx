"use client";

import {
  BaselineSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type IChartApi,
  type LineData,
  LineStyle,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

/** 走势图单点：时间戳(秒)、估算涨幅(%)。与 store 中的 FundChartPoint 结构一致，本组件仅依赖入参。 */
export interface FundChartPoint {
  time: number;
  changePercent: number;
}

const CHART_HEIGHT = 280;

/** 中国股市惯例：红涨绿跌 */
const RISE_COLOR = "rgba(239, 83, 80, 1)";
const RISE_FILL_1 = "rgba(239, 83, 80, 0.35)";
const RISE_FILL_2 = "rgba(239, 83, 80, 0.05)";
const FALL_COLOR = "rgba(38, 166, 154, 1)";
const FALL_FILL_1 = "rgba(38, 166, 154, 0.35)";
const FALL_FILL_2 = "rgba(38, 166, 154, 0.05)";

function toLineData(points: FundChartPoint[]): LineData[] {
  return points
    .map((p) => ({
      time: p.time as UTCTimestamp,
      value: p.changePercent,
    }))
    .sort((a, b) => a.time - b.time);
}

export interface FundChartProps {
  /** 走势数据，完全由父组件传入 */
  data: FundChartPoint[];
  /** 基金代码，用于标题等展示 */
  code?: string;
  /** 图表标题 */
  title?: string;
}

export function FundChart({
  data,
  code,
  title = "实时估算涨幅走势",
}: FundChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const zeroLineRef = useRef<ReturnType<
    ReturnType<IChartApi["addSeries"]>["createPriceLine"]
  > | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const lineData = toLineData(data);
  const lastPercent =
    data.length > 0 ? data[data.length - 1]!.changePercent : null;

  useEffect(() => {
    if (!chartContainerRef.current || typeof window === "undefined") return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--foreground) / 0.9)",
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.35)" },
        horzLines: { color: "hsl(var(--border) / 0.35)" },
      },
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
        scaleMargins: { top: 0.12, bottom: 0.16 },
      },
      timeScale: {
        borderColor: "hsl(var(--border))",
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          labelVisible: true,
        },
        horzLine: {
          labelVisible: true,
        },
      },
      height: CHART_HEIGHT,
    });
    chartRef.current = chart;

    const baselineSeries = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      topLineColor: RISE_COLOR,
      topFillColor1: RISE_FILL_1,
      topFillColor2: RISE_FILL_2,
      bottomLineColor: FALL_COLOR,
      bottomFillColor1: FALL_FILL_1,
      bottomFillColor2: FALL_FILL_2,
      lineWidth: 2,
      lastPriceAnimation: 1,
      priceFormat: {
        type: "percent",
        precision: 2,
        minMove: 0.01,
      },
    });
    seriesRef.current = baselineSeries;

    const zeroLine = baselineSeries.createPriceLine({
      price: 0,
      color: "hsl(var(--border))",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "0%",
    });
    zeroLineRef.current = zeroLine;

    setChartReady(true);
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      zeroLineRef.current = null;
      setChartReady(false);
    };
  }, []);

  useEffect(() => {
    if (!chartReady || !seriesRef.current) return;
    seriesRef.current.setData(lineData);
  }, [chartReady, lineData]);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/80 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {code && (
          <span className="text-xs text-muted-foreground font-mono">
            {code}
          </span>
        )}
        {lastPercent != null && (
          <span
            className="text-sm font-semibold tabular-nums"
            style={{
              color: lastPercent >= 0 ? RISE_COLOR : FALL_COLOR,
            }}
          >
            {lastPercent >= 0 ? "+" : ""}
            {lastPercent.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="relative px-2 pb-2 pt-1">
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ height: CHART_HEIGHT }}
        />
        {!chartReady && (
          <div
            className="absolute inset-2 flex items-center justify-center rounded bg-muted/30 text-sm text-muted-foreground"
            style={{ top: 36 }}
          >
            加载图表…
          </div>
        )}
      </div>
    </div>
  );
}
