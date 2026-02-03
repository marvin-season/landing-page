import type { FundData, KLineItem, SinaStockData } from "./fund-types";

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

/** 新浪股票实时行情 */
export async function fetchSinaRealtime(
  code: string,
): Promise<SinaStockData | null> {
  const res = await fetch(`/api/fund/${code}/sina`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "获取股票行情失败");
  }
  return res.json() as Promise<SinaStockData>;
}

/** 新浪K线数据 scale: 1=1分钟 240=日线 */
export async function fetchKline(
  code: string,
  scale = 240,
  datalen = 60,
): Promise<{ code: string; scale: number; data: KLineItem[] }> {
  const res = await fetch(
    `/api/fund/${code}/kline?scale=${scale}&datalen=${datalen}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "获取K线数据失败");
  }
  return res.json();
}
