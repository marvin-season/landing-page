import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Loader2Icon } from "lucide-react";
import { FundChart } from "@/app/[lang]/fund/_components/fund-chart";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { fetchFundData } from "@/app/[lang]/fund/_utils/fund-api";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion/motion-div";

/** 周一至周五 9:00–11:30、13:00–15:00 为交易时间 */
function getIsInTradeTime(): boolean {
  const now = dayjs();
  const hour = now.hour();
  const minute = now.minute();
  const day = now.day(); // 0=周日 6=周六
  const isWeekday = day >= 1 && day <= 5;
  const morning = hour >= 9 && (hour < 11 || (hour === 11 && minute < 30));
  const afternoon = hour >= 13 && (hour < 15 || (hour === 15 && minute < 0));
  return isWeekday && (morning || afternoon);
}

export default function FundDetail({ code }: { code: string }) {
  const isInTradeTime = getIsInTradeTime();
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
      <FundChart code={code} />
    </MotionDiv>
  );
}
