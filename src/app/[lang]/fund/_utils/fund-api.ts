import type { FundData } from "./fund-types";

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
