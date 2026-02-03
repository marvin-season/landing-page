export interface FundData {
  code: string;
  name: string;
  netValue: number;
  previousNetValue: number;
  changePercent: number;
  changeAmount: number;
  lastUpdateTime: string;
}

export interface SinaStockData {
  code: string;
  name: string;
  price: number;
  open: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  changePercent: number;
  changeAmount: number;
  lastUpdateTime: string;
}

export interface KLineItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 6位数字 = 基金代码 */
export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** sh/sz + 6位数字 = 股票/ETF 代码 */
export function isStockCode(code: string): boolean {
  return /^(sh|sz)\d{6}$/i.test(code.trim());
}

/** 支持基金(6位)或股票(sh/sz+6位) */
export function validateFundOrStockCode(code: string): boolean {
  const t = code.trim();
  return /^\d{6}$/.test(t) || /^(sh|sz)\d{6}$/i.test(t);
}
