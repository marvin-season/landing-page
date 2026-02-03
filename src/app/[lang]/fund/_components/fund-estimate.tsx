"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
              <p>
                Enter the fund code to view the estimated change in value for
                the day
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = data.changePercent > 0;
  const isNegative = data.changePercent < 0;
  const isNeutral = data.changePercent === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{data.name}</CardTitle>
            <CardDescription>基金代码：{data.code}</CardDescription>
          </div>
          <Badge
            variant={
              isPositive ? "default" : isNegative ? "destructive" : "secondary"
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">预估净值</p>
            <p className="text-2xl font-bold">{data.netValue.toFixed(4)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">预估涨跌</p>
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
            <span className="text-muted-foreground">前一交易日净值</span>
            <span className="font-medium">
              {data.previousNetValue.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">更新时间</span>
            <span className="font-medium">{data.lastUpdateTime}</span>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            数据来源：东方财富/天天基金，基于重仓股实时行情估算。仅供参考，实际涨跌以基金公司公布的净值为准。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
