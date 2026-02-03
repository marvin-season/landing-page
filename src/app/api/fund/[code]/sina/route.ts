import { type NextRequest, NextResponse } from "next/server";

/**
 * 新浪股票实时行情接口
 * 参考: https://www.juhe.cn/news/index/id/7854
 * API: http://hq.sinajs.cn/list=[股票代码]
 * 2022年后需添加 referer: https://finance.sina.com.cn/
 */
const SINA_HQ_URL = "http://hq.sinajs.cn/list";

function normalizeStockCode(code: string): string {
  const trimmed = code.trim().toLowerCase();
  if (/^(sh|sz)\d{6}$/.test(trimmed)) return trimmed;
  if (/^\d{6}$/.test(trimmed)) {
    return trimmed.startsWith("6") ? `sh${trimmed}` : `sz${trimmed}`;
  }
  return trimmed;
}

function parseSinaRealtime(text: string): Record<string, unknown> | null {
  const match = text.match(/var hq_str_[^=]+="([^"]*)"/);
  if (!match) return null;
  const parts = match[1].split(",");
  if (parts.length < 32) return null;
  const name = parts[0];
  const open = Number.parseFloat(parts[1]);
  const prevClose = Number.parseFloat(parts[2]);
  const price = Number.parseFloat(parts[3]);
  const high = Number.parseFloat(parts[4]);
  const low = Number.parseFloat(parts[5]);
  const volume = Number.parseFloat(parts[8]);
  const amount = Number.parseFloat(parts[9]);
  const date = parts[30];
  const time = parts[31];
  const changePercent =
    prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
  const changeAmount = price - prevClose;
  return {
    name,
    open,
    prevClose,
    price,
    high,
    low,
    volume,
    amount,
    changePercent,
    changeAmount,
    date,
    time,
    lastUpdateTime: `${date} ${time}`,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const stockCode = normalizeStockCode(code);

  if (!/^(sh|sz)\d{6}$/.test(stockCode)) {
    return NextResponse.json(
      { error: "股票代码格式应为 sh600519 或 sz000001" },
      { status: 400 },
    );
  }

  const url = `${SINA_HQ_URL}=${stockCode}&_=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Referer: "https://finance.sina.com.cn/",
        "User-Agent":
          "Mozilla/5.0 (compatible; FundApp/1.0; +https://github.com)",
      },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "获取股票数据失败" }, { status: 502 });
    }

    const text = await res.text();
    const data = parseSinaRealtime(text);

    if (!data || !data.name) {
      return NextResponse.json(
        { error: "未找到该股票或数据暂时不可用" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...data,
      code: stockCode,
    });
  } catch (err) {
    console.error("[sina API]", err);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
