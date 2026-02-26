"use client";

import { useMemo } from "react";
import { useFundStore, getPositionMarketValue } from "@/store/useFundStore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

function formatMoney(v: number) {
  return "¥" + v.toFixed(2);
}

export function OverviewCards() {
  const positions = useFundStore((s) => s.positions);
  const realtimeData = useFundStore((s) => s.realtimeData);

  const { totalMarketValue, totalCost, todayPnL, totalPnL } = useMemo(() => {
    let market = 0;
    let cost = 0;
    let today = 0;

    for (const pos of positions) {
      const data = realtimeData[pos.fundCode];
      const gsz = data?.gsz;
      const gszzl = data?.gszzl ? parseFloat(data.gszzl) : 0;
      const price = gsz != null && gsz !== "" ? parseFloat(gsz) : undefined;

      const value = getPositionMarketValue(pos, price);
      market += value;
      cost += pos.totalCost;
      if (price != null && !Number.isNaN(gszzl)) {
        today += (pos.totalShares * price * gszzl) / 100;
      }
    }

    return {
      totalMarketValue: market,
      totalCost: cost,
      todayPnL: today,
      totalPnL: market - cost,
    };
  }, [positions, realtimeData]);

  const trendClass = (v: number) =>
    v > 0 ? "text-red-600" : v < 0 ? "text-green-600" : "text-muted-foreground";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            总市值
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalMarketValue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <TrendingUp className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            当日盈亏
          </span>
        </CardHeader>
        <CardContent>
          <p className={cn("text-2xl font-bold", trendClass(todayPnL))}>
            {todayPnL >= 0 ? "+" : ""}
            {formatMoney(todayPnL)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <TrendingDown className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            累计盈亏
          </span>
        </CardHeader>
        <CardContent>
          <p className={cn("text-2xl font-bold", trendClass(totalPnL))}>
            {totalPnL >= 0 ? "+" : ""}
            {formatMoney(totalPnL)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
