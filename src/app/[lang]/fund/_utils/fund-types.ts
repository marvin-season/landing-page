export interface FundData {
  code: string;
  name: string;
  netValue: number;
  previousNetValue: number;
  changePercent: number;
  changeAmount: number;
  lastUpdateTime: string;
}

export interface FundTrendPoint {
  time: string;
  value: number;
  percent: number;
}

/** 6位数字 = 基金代码 */
export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
