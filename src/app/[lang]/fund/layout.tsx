"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FundHoldingsList } from "@/app/[lang]/fund/_components/fund-holdings-list";
import { MotionDiv } from "@/components/ui/motion/motion-div";
import { FundInput } from "./_components/fund-input";

export default function FundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto max-w-6xl px-6 py-10 h-screen overflow-scroll">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start w-full">
          <div className="flex-1 space-y-6 lg:min-w-0">
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-3xl font-bold">基金估算</h1>
              <p className="text-muted-foreground">
                输入基金代码，根据持仓股实时行情估算当日净值走势
              </p>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <FundInput />
            </MotionDiv>

            {children}
          </div>

          <aside className="w-full shrink-0 lg:w-80">
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <FundHoldingsList />
            </MotionDiv>
          </aside>
        </div>
        <footer className="fixed bottom-0 left-0 right-0 text-center text-sm text-muted-foreground">
          仅供学习使用
        </footer>
      </div>
    </QueryClientProvider>
  );
}
