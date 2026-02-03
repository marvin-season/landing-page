import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { FundChart } from "@/app/[lang]/fund/_components/fund-chart";
import type { FundChartPoint } from "@/store/fund-holdings-store";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { getIsInTradeTime } from "@/app/[lang]/fund/_utils";
import { fetchFundData } from "@/app/[lang]/fund/_utils/fund-api";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { useFundHoldingsStore } from "@/store/fund-holdings-store";

const EMPTY_CHART_DATA: FundChartPoint[] = [];

export default function FundDetail({ code }: { code: string }) {
  const isInTradeTime = getIsInTradeTime();
  const pushChartPoint = useFundHoldingsStore((s) => s.pushChartPoint);
  const chartData =
    useFundHoldingsStore((s) => s.chartDataByCode[code]) ?? EMPTY_CHART_DATA;
  const {
    data: fundData,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["fund", code],
    queryFn: () => fetchFundData(code),
    refetchOnWindowFocus: isInTradeTime,
    refetchInterval: 10000,
    enabled: isInTradeTime,
  });

  useEffect(() => {
    if (fundData) {
      pushChartPoint(code, fundData.changePercent);
    }
  }, [fundData, code, pushChartPoint]);

  if (!fundData && !isFetching && !error && isInTradeTime) {
    return (
      <div className="text-muted-foreground">请输入基金代码查看估算净值</div>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-end gap-2">
        {isInTradeTime ? "交易中" : "非交易时间"}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            refetch();
          }}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            "刷新"
          )}
        </Button>
      </div>
      <FundEstimate
        data={fundData ?? null}
        isLoading={isFetching}
        error={error?.message}
      />
      <FundChart data={chartData} code={code} />
    </MotionDiv>
  );
}
