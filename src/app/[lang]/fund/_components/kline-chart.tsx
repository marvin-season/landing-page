"use client";

import type { IChartApi, ISeriesApi } from "lightweight-charts";
import {
  type CandlestickData,
  CandlestickSeries,
  createChart,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KLineItem } from "../_utils/fund-types";

interface KLineChartProps {
  data: KLineItem[];
  code: string;
  isLoading?: boolean;
  height?: number;
}

function toChartTime(day: string): Time {
  if (day.includes(" ")) {
    return day.replace(" ", "T") as Time;
  }
  return day as Time;
}

export function KLineChart({
  data,
  code,
  isLoading = false,
  height = 320,
}: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "hsl(var(--muted-foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.3)" },
        horzLines: { color: "hsl(var(--border) / 0.3)" },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "hsl(var(--border))",
      },
      rightPriceScale: {
        borderColor: "hsl(var(--border))",
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(142 76% 36%)",
      downColor: "hsl(0 84% 60%)",
      borderUpColor: "hsl(142 76% 36%)",
      borderDownColor: "hsl(0 84% 60%)",
    });

    const chartData: CandlestickData[] = data.map((item) => ({
      time: toChartTime(item.time),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candlestickSeries.setData(chartData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, height]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">日K线</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          日K线
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {code}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} style={{ width: "100%", height }} />
      </CardContent>
    </Card>
  );
}
