import type { FundData, FundTrendPoint } from "./fund-types";

export interface FundStockHolding {
  rank: number;
  stockCode: string;
  stockName: string;
  price?: number;
  changePercent?: number;
  holdShares?: number;
  holdValue?: number;
  holdRatio: number;
}

export async function fetchFundData(code: string): Promise<FundData | null> {
  const res = await fetch(`/api/fund/${code}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? "Failed to fetch fund data",
    );
  }

  return res.json() as Promise<FundData>;
}

export async function fetchFundHoldings(
  code: string,
): Promise<FundStockHolding[]> {
  const res = await fetch(`/api/fund/${code}/holdings`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? "Failed to fetch holdings",
    );
  }

  const data = (await res.json()) as { holdings?: FundStockHolding[] };
  return data.holdings ?? [];
}

export async function fetchFundTrend(
  code: string,
): Promise<{
  code: string;
  name: string;
  previousNetValue: number;
  data: FundTrendPoint[];
  message?: string;
}> {
  const res = await fetch(`/api/fund/${code}/trend`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? "获取走势数据失败",
    );
  }
  return res.json();
}
