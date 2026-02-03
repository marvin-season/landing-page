export interface FundData {
  code: string;
  name: string;
  netValue: number;
  previousNetValue: number;
  changePercent: number;
  changeAmount: number;
  lastUpdateTime: string;
}

export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
