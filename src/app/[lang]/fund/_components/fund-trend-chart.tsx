"use client";

import type { IChartApi } from "lightweight-charts";
import {
  type LineData,
  LineSeries,
  createChart,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FundTrendPoint } from "../_utils/fund-types";

interface FundTrendChartProps {
  data: FundTrendPoint[];
  fundName: string;
  previousNetValue: number;
  isLoading?: boolean;
  height?: number;
}

function toChartTime(day: string): Time {
  if (day.includes(" ")) {
    return day.replace(" ", "T") as Time;
  }
  return day as Time;
}

export function FundTrendChart({
  data,
  fundName,
  previousNetValue,
  isLoading = false,
  height = 280,
}: FundTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length || previousNetValue <= 0) return;

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
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
    });

    const lastValue = data[data.length - 1]?.value ?? previousNetValue;
    const isUp = lastValue >= previousNetValue;

    const lineData: LineData[] = data.map((item) => ({
      time: toChartTime(item.time),
      value: item.value,
    }));

    const lineSeries = chart.addSeries(LineSeries, {
      color: isUp ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)",
      lineWidth: 2,
    });

    lineSeries.setData(lineData);
    chart.timeScale().fitContent();

    chartRef.current = chart;

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
    };
  }, [data, previousNetValue, height]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">估算走势</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data.length || previousNetValue <= 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          估算走势
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            基于持仓股实时行情
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} style={{ width: "100%", height }} />
      </CardContent>
    </Card>
  );
}
