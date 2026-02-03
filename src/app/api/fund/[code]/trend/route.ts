import { type NextRequest, NextResponse } from "next/server";
import { fetchFundHoldingsFromEastmoney } from "@/app/api/fund/_lib/holdings";


const SINA_KLINE_URL =
  "http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData";

interface SinaKLineItem {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

async function fetchStockKline(
  stockCode: string,
  scale: number,
  datalen: number,
): Promise<SinaKLineItem[]> {
  const url = `${SINA_KLINE_URL}?symbol=${stockCode}&scale=${scale}&ma=no&datalen=${datalen}`;
  const res = await fetch(url, {
    headers: {
      Referer: "https://finance.sina.com.cn/",
      "User-Agent": "Mozilla/5.0 (compatible; FundApp/1.0)",
    },
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as SinaKLineItem[];
  return Array.isArray(raw) ? raw : [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "基金代码应为6位数字" }, { status: 400 });
  }

  try {
    const [fundRes, rawHoldings] = await Promise.all([
      fetch(`http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FundApp/1.0)" },
      }),
      fetchFundHoldingsFromEastmoney(code),
    ]);

    const fundText = await fundRes.text();
    const fundMatch = fundText.match(/jsonpgz\((.*)\);?\s*$/);
    if (!fundMatch) {
      return NextResponse.json(
        { error: "未找到该基金或数据暂时不可用" },
        { status: 404 },
      );
    }
    const fundRaw = JSON.parse(fundMatch[1]) as {
      dwjz: string;
      gsz: string;
      name: string;
    };
    const prevNetValue = Number.parseFloat(fundRaw.dwjz) || 0;

    const holdings = rawHoldings.map((item) => ({
      code: item.stockCode,
      ratio: item.holdRatio / 100,
    }));

    if (holdings.length === 0) {
      return NextResponse.json({
        code,
        name: fundRaw.name,
        previousNetValue: prevNetValue,
        data: [],
        message: "暂无持仓数据，无法计算走势",
      });
    }

    const totalWeight = holdings.reduce((s, h) => s + h.ratio, 0);
    const normalized = holdings.map((h) => ({
      ...h,
      ratio: h.ratio / totalWeight,
    }));

    const stockKlines = await Promise.all(
      normalized.map((h) => fetchStockKline(h.code, 1, 241)),
    );

    const timeToPrice = new Map<string, Map<string, number>>();

    for (let i = 0; i < normalized.length; i++) {
      const klines = stockKlines[i];
      if (klines.length === 0) continue;
      for (const k of klines) {
        const t = k.day;
        const price = Number.parseFloat(k.close) || 0;
        if (!timeToPrice.has(t)) timeToPrice.set(t, new Map());
        timeToPrice.get(t)!.set(normalized[i].code, price);
      }
    }

    const times = [...new Set(stockKlines.flat().map((k) => k.day))].sort();
    const sinaList = normalized.map((h) => h.code).join(",");
    const sinaRes = await fetch(`http://hq.sinajs.cn/list=${sinaList}`, {
      headers: {
        Referer: "https://finance.sina.com.cn/",
        "User-Agent": "Mozilla/5.0 (compatible; FundApp/1.0)",
      },
    });
    const sinaText = await sinaRes.text();
    const basePrevCloses = new Map<string, number>();
    const re = /var hq_str_([^=]+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(sinaText)) !== null) {
      const parts = match[2].split(",");
      if (parts.length >= 3) {
        const prevClose = Number.parseFloat(parts[2]) || 0;
        if (prevClose > 0) basePrevCloses.set(match[1], prevClose);
      }
    }
    normalized.forEach((h, i) => {
      if (!basePrevCloses.has(h.code) && stockKlines[i]?.length) {
        const first = stockKlines[i][0];
        const base = Number.parseFloat(first?.open ?? first?.close ?? "0") || 0;
        if (base > 0) basePrevCloses.set(h.code, base);
      }
    });
    const data: Array<{ time: string; value: number; percent: number }> = [];

    for (const t of times) {
      let weightedPercent = 0;
      for (const h of normalized) {
        const prevClose = basePrevCloses.get(h.code) ?? 0;
        const price = timeToPrice.get(t)?.get(h.code) ?? prevClose;
        if (prevClose > 0) {
          weightedPercent += h.ratio * ((price - prevClose) / prevClose) * 100;
        }
      }
      const value = prevNetValue * (1 + weightedPercent / 100);
      data.push({
        time: t,
        value: Math.round(value * 10000) / 10000,
        percent: Math.round(weightedPercent * 100) / 100,
      });
    }

    return NextResponse.json({
      code,
      name: fundRaw.name,
      previousNetValue: prevNetValue,
      data,
    });
  } catch (err) {
    console.error("[fund trend API]", err);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
