import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { FundChart } from "@/app/[lang]/fund/_components/fund-chart";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { fetchFundData } from "@/app/[lang]/fund/_utils/fund-api";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion/motion-div";

export default function FundDetail({ code }: { code: string }) {
  const fundQuery = useQuery({
    queryKey: ["fund", code],
    queryFn: () => fetchFundData(code),
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

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
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            fundQuery.refetch();
          }}
          disabled={fundQuery.isFetching}
        >
          {fundQuery.isFetching ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            "刷新"
          )}
        </Button>
      </div>
      <FundEstimate
        data={fundData ?? null}
        isLoading={fundQuery.isFetching}
        error={fundQuery.error?.message}
      />
      <FundChart code={code} />
    </MotionDiv>
  );
}
