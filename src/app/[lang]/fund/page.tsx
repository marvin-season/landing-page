"use client";

export default function FundPage() {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p className="text-sm">
        在上方输入基金代码（6位）或股票代码（如 sh600519、sz000001）进行查询
      </p>
      <p className="mt-2 text-xs">
        基金数据来自东方财富，股票/ETF 数据来自新浪财经
      </p>
    </div>
  );
}
