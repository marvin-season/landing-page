"use client";

import { useCallback, useState } from "react";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { FundEstimate } from "./_components/fund-estimate";
import { FundHoldingsList } from "./_components/fund-holdings-list";
import { FundInput } from "./_components/fund-input";
import { fetchFundData } from "./_utils/fund-api";
import type { FundData } from "./_utils/fund-types";

export default function FundPage() {
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFundData(code);
      setFundData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setFundData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 h-screen overflow-scroll">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-6 lg:min-w-0">
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold">Estimate Fund Change</h1>
            <p className="text-muted-foreground">
              Enter the fund code to view the estimated change in value for the
              day
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <FundInput onSearch={handleSearch} isLoading={isLoading} />
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <FundEstimate data={fundData} isLoading={isLoading} error={error} />
          </MotionDiv>
        </div>

        <aside className="w-full shrink-0 lg:w-64">
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <FundHoldingsList
              onSelectFund={handleSearch}
              selectedCode={fundData?.code ?? null}
            />
          </MotionDiv>
        </aside>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 text-center text-sm text-muted-foreground">
        仅供学习使用
      </footer>
    </div>
  );
}
