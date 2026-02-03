import dayjs from "dayjs";

/** 周一至周五 9:00–11:30、13:00–15:00 为交易时间 */
export function getIsInTradeTime(time?: number): boolean {
  const now = time ? dayjs(time) : dayjs();
  const hour = now.hour();
  const minute = now.minute();
  const day = now.day(); // 0=周日 6=周六
  const isWeekday = day >= 1 && day <= 5;
  const morning = hour >= 9 && (hour < 11 || (hour === 11 && minute < 30));
  const afternoon = hour >= 13 && (hour < 15 || (hour === 15 && minute < 0));
  return isWeekday && (morning || afternoon);
}
