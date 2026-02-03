"use client";

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
import type { SinaStockData } from "../_utils/fund-types";

interface StockEstimateProps {
  data: SinaStockData | null;
  isLoading?: boolean;
  error?: string | null;
}

export function StockEstimate({
  data,
  isLoading = false,
  error: errorMsg = null,
}: StockEstimateProps) {
  const addHolding = useFundHoldingsStore((s) => s.addHolding);
  const removeHolding = useFundHoldingsStore((s) => s.removeHolding);
  const hasHolding = useFundHoldingsStore((s) => s.hasHolding);

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
          <Skeleton className="mt-2 h-4 w-24" />
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
          <div className="py-8 text-center text-muted-foreground">
            {errorMsg ? (
              <p className="text-destructive">{errorMsg}</p>
            ) : (
              <p>请输入股票代码查看实时行情</p>
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
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-xl">{data.name}</CardTitle>
            <CardDescription>代码: {data.code}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                "px-3 py-1 text-sm",
                isPositive && "bg-green-500 hover:bg-green-600",
                isNegative && "bg-red-500 hover:bg-red-600",
              )}
            >
              <TrendIcon className="mr-1 size-3" />
              {isPositive ? "+" : ""}
              {data.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">现价</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isPositive && "text-green-600 dark:text-green-400",
                isNegative && "text-red-600 dark:text-red-400",
                isNeutral && "text-muted-foreground",
              )}
            >
              {data.price.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">涨跌额</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isPositive && "text-green-600 dark:text-green-400",
                isNegative && "text-red-600 dark:text-red-400",
                isNeutral && "text-muted-foreground",
              )}
            >
              {isPositive ? "+" : ""}
              {data.changeAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">今开</span>
            <span className="font-medium">{data.open.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">昨收</span>
            <span className="font-medium">{data.prevClose.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">最高</span>
            <span className="font-medium">{data.high.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">最低</span>
            <span className="font-medium">{data.low.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">成交量</span>
            <span className="font-medium">
              {(data.volume / 1_0000).toFixed(2)}万
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">更新时间</span>
            <span className="font-medium">{data.lastUpdateTime}</span>
          </div>
        </div>

        <div className="pt-2">
          <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            数据来源：新浪财经
            <a
              href="https://www.juhe.cn/news/index/id/7854"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-primary underline"
            >
              接口说明
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
