"use client";

import type { IChartApi } from "lightweight-charts";
import {
  type AreaData,
  AreaSeries,
  createChart,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KLineItem } from "../_utils/fund-types";

interface TrendChartProps {
  data: KLineItem[];
  code: string;
  basePrice: number;
  isLoading?: boolean;
  height?: number;
}

function toChartTime(day: string): Time {
  if (day.includes(" ")) {
    return day.replace(" ", "T") as Time;
  }
  return day as Time;
}

export function TrendChart({
  data,
  code,
  basePrice,
  isLoading = false,
  height = 280,
}: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length || basePrice <= 0) return;

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

    const areaData: AreaData[] = data.map((item) => ({
      time: toChartTime(item.time),
      value: item.close,
    }));

    const lastClose = data[data.length - 1]?.close ?? basePrice;
    const isUp = lastClose >= basePrice;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: isUp ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)",
      topColor: isUp ? "hsl(142 76% 36% / 0.4)" : "hsl(0 84% 60% / 0.4)",
      bottomColor: isUp ? "hsl(142 76% 36% / 0)" : "hsl(0 84% 60% / 0)",
      lineWidth: 2,
    });

    areaSeries.setData(areaData);
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
  }, [data, basePrice, height]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">分时走势</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data.length || basePrice <= 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          分时走势
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
