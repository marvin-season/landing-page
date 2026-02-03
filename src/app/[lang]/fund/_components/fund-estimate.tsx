"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  BookmarkCheck,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFundHoldingsStore } from "@/store/fund-holdings-store";
import {
  fetchFundHoldings,
  type FundStockHolding,
} from "../_utils/fund-api";
import type { FundData } from "../_utils/fund-types";

interface FundEstimateProps {
  data: FundData | null;
  isLoading?: boolean;
  error?: string | null;
}

export function FundEstimate({
  data,
  isLoading = false,
  error: errorMsg = null,
}: FundEstimateProps) {
  const addHolding = useFundHoldingsStore((s) => s.addHolding);
  const removeHolding = useFundHoldingsStore((s) => s.removeHolding);
  const hasHolding = useFundHoldingsStore((s) => s.hasHolding);

  const { data: holdingsData } = useQuery({
    queryKey: ["fundHoldings", data?.code],
    queryFn: () => fetchFundHoldings(data!.code),
    enabled: !!data?.code,
  });
  const holdings = holdingsData ?? [];

  const handleToggleHolding = () => {
    if (!data) return;
    if (hasHolding(data.code)) {
      removeHolding(data.code);
    } else {
      addHolding(data.code, data.name);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            {errorMsg ? (
              <p className="text-destructive">{errorMsg}</p>
            ) : (
              <p>请输入基金代码查看当日估算净值</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = data.changePercent > 0;
  const isNegative = data.changePercent < 0;
  const isNeutral = data.changePercent === 0;
  const isInHoldings = hasHolding(data.code);
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-xl">{data.name}</CardTitle>
            <CardDescription>代码: {data.code}</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={isInHoldings ? "default" : "outline"}
              size="sm"
              onClick={handleToggleHolding}
              className="gap-1"
            >
              {isInHoldings ? (
                <>
                  <BookmarkCheck className="size-3.5" />
                  已收藏
                </>
              ) : (
                <>
                  <Bookmark className="size-3.5" />
                  加入自选
                </>
              )}
            </Button>
            <Badge
              variant={
                isPositive
                  ? "default"
                  : isNegative
                    ? "destructive"
                    : "secondary"
              }
              className={cn(
                "text-sm px-3 py-1",
                isPositive && "bg-green-500 hover:bg-green-600",
                isNegative && "bg-red-500 hover:bg-red-600",
              )}
            >
              <TrendIcon className="size-3 mr-1" />
              {isPositive ? "+" : ""}
              {data.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">估算净值</p>
            <p className="text-2xl font-bold">{data.netValue.toFixed(4)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">估算涨跌</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isPositive && "text-green-600 dark:text-green-400",
                isNegative && "text-red-600 dark:text-red-400",
                isNeutral && "text-muted-foreground",
              )}
            >
              {isPositive ? "+" : ""}
              {data.changeAmount.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">昨日净值</span>
            <span className="font-medium">
              {data.previousNetValue.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">更新时间</span>
            <span className="font-medium">{data.lastUpdateTime}</span>
          </div>
        </div>

        {holdings.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">重仓股</h4>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">代码</th>
                    <th className="px-3 py-2 text-left font-medium">名称</th>
                    <th className="px-3 py-2 text-right font-medium">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((s) => (
                    <tr key={s.stockCode} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.rank}
                      </td>
                      <td className="px-3 py-2 font-mono">{s.stockCode}</td>
                      <td className="px-3 py-2 truncate max-w-[140px]">
                        {s.stockName}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {s.holdRatio.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-2">
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            数据来源：东方财富 / 天天基金，基于重仓股实时行情估算，仅供参考
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
