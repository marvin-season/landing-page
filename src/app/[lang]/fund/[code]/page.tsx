"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { KLineChart } from "@/app/[lang]/fund/_components/kline-chart";
import { StockEstimate } from "@/app/[lang]/fund/_components/stock-estimate";
import { TrendChart } from "@/app/[lang]/fund/_components/trend-chart";
import {
  fetchFundData,
  fetchKline,
  fetchSinaRealtime,
} from "@/app/[lang]/fund/_utils/fund-api";
import { isStockCode } from "@/app/[lang]/fund/_utils/fund-types";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shadcn-io/tabs";

export default function FundPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const isStock = isStockCode(code);

  const fundQuery = useQuery({
    queryKey: ["fund", code],
    queryFn: () => fetchFundData(code),
    enabled: !isStock,
    refetchInterval: !isStock ? 10000 : false,
  });

  const stockQuery = useQuery({
    queryKey: ["stock", code],
    queryFn: () => fetchSinaRealtime(code),
    enabled: isStock,
    refetchInterval: isStock ? 15000 : false,
  });

  const klineQuery = useQuery({
    queryKey: ["kline", code, "daily"],
    queryFn: () => fetchKline(code, 240, 60),
    enabled: isStock,
  });

  const trendQuery = useQuery({
    queryKey: ["kline", code, "min1"],
    queryFn: () => fetchKline(code, 1, 241),
    enabled: isStock,
  });

  if (isStock) {
    const stockData = stockQuery.data;
    const klineData = klineQuery.data?.data ?? [];
    const trendData = trendQuery.data?.data ?? [];
    const basePrice = stockData?.prevClose ?? 0;

    return (
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => stockQuery.refetch()}
            disabled={stockQuery.isFetching}
          >
            刷新
          </Button>
        </div>
        <StockEstimate
          data={stockData ?? null}
          isLoading={stockQuery.isFetching}
          error={stockQuery.error?.message}
        />
        <Tabs defaultValue="trend" className="w-full">
          <TabsList>
            <TabsTrigger value="trend">分时走势</TabsTrigger>
            <TabsTrigger value="kline">日K线</TabsTrigger>
          </TabsList>
          <TabsContents>
            <TabsContent value="trend">
              <TrendChart
                data={trendData}
                code={code}
                basePrice={basePrice}
                isLoading={trendQuery.isFetching}
              />
            </TabsContent>
            <TabsContent value="kline">
              <KLineChart
                data={klineData}
                code={code}
                isLoading={klineQuery.isFetching}
              />
            </TabsContent>
          </TabsContents>
        </Tabs>
      </MotionDiv>
    );
  }

  const fundData = fundQuery.data;
  if (!fundData && !fundQuery.isFetching && !fundQuery.error) {
    return (
      <div className="text-muted-foreground">请输入基金代码查看估算净值</div>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Button
        size="sm"
        variant="outline"
        onClick={() => fundQuery.refetch()}
        disabled={fundQuery.isFetching}
      >
        刷新
      </Button>
      <div className="mt-4">
        <FundEstimate
          data={fundData ?? null}
          isLoading={fundQuery.isFetching}
          error={fundQuery.error?.message}
        />
      </div>
    </MotionDiv>
  );
}
