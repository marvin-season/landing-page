import { fetchApi } from "@/lib/request";
import type { FundData, FundStockHolding, FundTrendPoint } from "./fund-types";

export async function fetchFundData(code: string): Promise<FundData | null> {
  return fetchApi<FundData>(`/api/fund/${code}`);
}

export async function fetchFundHoldings(
  code: string,
): Promise<FundStockHolding[]> {
  return fetchApi<{ holdings?: FundStockHolding[] }>(
    `/api/fund/${code}/holdings`,
  ).then((data) => data.holdings ?? []);
}

export async function fetchFundTrend(code: string): Promise<FundTrendPoint[]> {
  return fetchApi<{
    code: string;
    name: string;
    previousNetValue: number;
    data: FundTrendPoint[];
    message?: string;
  }>(`/api/fund/${code}/trend`).then((data) => data.data ?? []);
}
