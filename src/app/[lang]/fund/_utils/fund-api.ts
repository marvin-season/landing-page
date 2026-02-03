import type { FundData } from "./fund-types";

export async function fetchFundData(code: string): Promise<FundData | null> {
  const res = await fetch(`/api/fund/${code}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "获取基金数据失败");
  }

  return res.json() as Promise<FundData>;
}
