import { fetchApi } from "@/lib/request";
import type { FundData, FundStockHolding } from "./fund-types";

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
