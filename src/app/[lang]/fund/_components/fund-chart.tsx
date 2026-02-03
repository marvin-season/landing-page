"use client";

import {
  ColorType,
  createChart,
  type IChartApi,
  type LineData,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FundChartPoint } from "@/store/fund-holdings-store";
import { useFundHoldingsStore } from "@/store/fund-holdings-store";
import { fetchFundData } from "../_utils/fund-api";

const POLL_INTERVAL_MS = 5000;
const CHART_HEIGHT = 240;

/** 稳定空数组，避免 ?? [] 导致 effect 依赖每轮都变 */
const EMPTY_CHART_DATA: FundChartPoint[] = [];

function toLineData(points: FundChartPoint[]): LineData[] {
  return points.map((p) => ({
    time: p.time as UTCTimestamp,
    value: p.changePercent,
  }));
}

export function FundChart(props: { code: string }) {
  const { code } = props;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);

  const chartData =
    useFundHoldingsStore((s) => s.chartDataByCode[code]) ?? EMPTY_CHART_DATA;
  const pushChartPoint = useFundHoldingsStore((s) => s.pushChartPoint);

  const [chartReady, setChartReady] = useState(false);

  // 初始化图表（仅客户端、有 code 时）
  useEffect(() => {
    if (!code || !chartContainerRef.current || typeof window === "undefined")
      return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--foreground))",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.4)" },
        horzLines: { color: "hsl(var(--border) / 0.4)" },
      },
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "hsl(var(--border))",
        timeVisible: true,
        secondsVisible: false,
      },
      height: CHART_HEIGHT,
    });
    chartRef.current = chart;
    const lineSeries = chart.addSeries(LineSeries, {
      color: "hsl(var(--chart-1))",
      lineWidth: 2,
      lastPriceAnimation: 1,
    });
    seriesRef.current = lineSeries;
    setChartReady(true);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setChartReady(false);
    };
  }, [code]);

  // 数据更新时同步到图表
  useEffect(() => {
    if (!chartReady || !seriesRef.current) return;
    seriesRef.current.setData(toLineData(chartData));
  }, [chartReady, chartData]);

  // 每 5s 拉取一次涨幅并 push 到 store
  const fetchAndPush = useCallback(() => {
    if (!code) return;
    fetchFundData(code).then((data) => {
      if (data != null) pushChartPoint(code, data.changePercent);
    });
  }, [code, pushChartPoint]);

  useEffect(() => {
    if (!code) return;
    fetchAndPush();
    const id = setInterval(fetchAndPush, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [code, fetchAndPush]);

  if (!code) return null;

  return (
    <div className="w-full rounded-lg border bg-card p-3">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        实时估算涨幅走势
      </p>
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: CHART_HEIGHT }}
      />
      {!chartReady && (
        <div
          className="flex items-center justify-center text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          加载图表…
        </div>
      )}
    </div>
  );
}
