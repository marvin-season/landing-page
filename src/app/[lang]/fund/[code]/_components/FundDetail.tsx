import { useQuery } from "@tanstack/react-query";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { FundTrendChart } from "@/app/[lang]/fund/_components/fund-trend-chart";
import {
  fetchFundData,
  fetchFundTrend,
} from "@/app/[lang]/fund/_utils/fund-api";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion/motion-div";

export default function FundDetail({ code }: { code: string }) {
  const fundQuery = useQuery({
    queryKey: ["fund", code],
    queryFn: () => fetchFundData(code),
    refetchInterval: 10000,
  });

  const trendQuery = useQuery({
    queryKey: ["fundTrend", code],
    queryFn: () => fetchFundTrend(code),
  });

  const fundData = fundQuery.data;
  const trendData = trendQuery.data;

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
      className="space-y-6"
    >
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            fundQuery.refetch();
            trendQuery.refetch();
          }}
          disabled={fundQuery.isFetching || trendQuery.isFetching}
        >
          刷新
        </Button>
      </div>
      <FundEstimate
        data={fundData ?? null}
        isLoading={fundQuery.isFetching}
        error={fundQuery.error?.message}
      />
      <FundTrendChart
        data={trendData?.data ?? []}
        fundName={trendData?.name ?? fundData?.name ?? ""}
        previousNetValue={
          fundData?.previousNetValue ?? trendData?.previousNetValue ?? 0
        }
        isLoading={trendQuery.isFetching}
      />
    </MotionDiv>
  );
}
