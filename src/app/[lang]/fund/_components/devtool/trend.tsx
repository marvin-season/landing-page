"use client";

import dayjs from "dayjs";
import type { FundChartPoint } from "@/app/[lang]/fund/_components/fund-chart";
import { useFundHoldingsStore } from "@/store/fund-holdings-store";

/** 周一至周五 9:00–11:30、13:00–15:00 为交易时间；取当日或上一交易日 9:00 */
function getTradeDayAtNine(): dayjs.Dayjs {
  const d = dayjs();
  const day = d.day(); // 0=周日 6=周六
  const date = day >= 1 && day <= 5 ? d : day === 0 ? d.day(-2) : d.day(5); // 周日→上周五，周六→本周五
  return date.hour(9).minute(0).second(0).millisecond(0);
}

/** 模拟走势：交易时段内 9:00 起每 2 分钟一个点，共 20 点（约 9:00–9:38），先跌后涨 */
const MOCK_DATA: FundChartPoint[] = (() => {
  const base = -0.1;
  const start = getTradeDayAtNine();
  const points: FundChartPoint[] = [];
  let p = base;
  const steps = [
    0.05, 0.08, -0.03, 0.12, 0.02, -0.05, 0.06, 0.01, -0.02, 0.04, 0.07, -0.01,
    0.03, 0.09, 0.02, -0.04, 0.05, 0.11, 0.01, -0.03,
  ];
  for (let i = 0; i < steps.length; i++) {
    p += steps[i]!;
    const t = start.add(i * 2, "minute");
    points.push({
      time: t.unix(),
      changePercent: Number(p.toFixed(2)),
    });
  }
  return points;
})();

export function Trend() {
  return (
    <button
      onClick={() => {
        useFundHoldingsStore.setState({
          chartDataByCode: {
            "022365": MOCK_DATA,
          },
        });
      }}
    >
      mock trend
    </button>
  );
}
