export interface FundData {
  code: string;
  name: string;
  netValue: number;
  previousNetValue: number;
  changePercent: number;
  changeAmount: number;
  lastUpdateTime: string;
}

/** 6位数字 = 基金代码 */
export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

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
