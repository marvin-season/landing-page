"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { FundEstimate } from "@/app/[lang]/fund/_components/fund-estimate";
import { fetchFundData } from "@/app/[lang]/fund/_utils/fund-api";
import { MotionDiv } from "@/components/ui/motion/motion-div";

export default function FundPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["fund", code],
    queryFn: () => fetchFundData(code),
  });
  if (!data) {
    return <div>Fund not found</div>;
  }
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <FundEstimate data={data} isLoading={isLoading} error={error?.message} />
    </MotionDiv>
  );
}
