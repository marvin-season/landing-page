import { type NextRequest, NextResponse } from "next/server";

/**
 * 新浪股票K线数据接口
 * 参考: https://www.juhe.cn/news/index/id/7854
 * API: http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData
 * scale: 1=1分钟, 5=5分钟, 15=15分钟, 30=30分钟, 60=60分钟, 240=日线
 */
const SINA_KLINE_URL =
  "http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData";

function normalizeStockCode(code: string): string {
  const trimmed = code.trim().toLowerCase();
  if (/^(sh|sz)\d{6}$/.test(trimmed)) return trimmed;
  if (/^\d{6}$/.test(trimmed)) {
    return trimmed.startsWith("6") ? `sh${trimmed}` : `sz${trimmed}`;
  }
  return trimmed;
}

interface SinaKLineItem {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const stockCode = normalizeStockCode(code);
  const { searchParams } = new URL(req.url);
  const scale = searchParams.get("scale") ?? "240";
  const datalen = searchParams.get("datalen") ?? "60";

  if (!/^(sh|sz)\d{6}$/.test(stockCode)) {
    return NextResponse.json(
      { error: "股票代码格式应为 sh600519 或 sz000001" },
      { status: 400 },
    );
  }

  const validScales = ["1", "5", "15", "30", "60", "240"];
  if (!validScales.includes(scale)) {
    return NextResponse.json({ error: "无效的 scale 参数" }, { status: 400 });
  }

  const url = new URL(SINA_KLINE_URL);
  url.searchParams.set("symbol", stockCode);
  url.searchParams.set("scale", scale);
  url.searchParams.set("ma", "no");
  url.searchParams.set("datalen", datalen);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Referer: "https://finance.sina.com.cn/",
        "User-Agent":
          "Mozilla/5.0 (compatible; FundApp/1.0; +https://github.com)",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "获取K线数据失败" }, { status: 502 });
    }

    const raw = (await res.json()) as SinaKLineItem[];

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "未找到K线数据或数据暂时不可用" },
        { status: 404 },
      );
    }

    const data = raw.map((item) => ({
      time: item.day,
      open: Number.parseFloat(item.open),
      high: Number.parseFloat(item.high),
      low: Number.parseFloat(item.low),
      close: Number.parseFloat(item.close),
      volume: Number.parseFloat(item.volume),
    }));

    return NextResponse.json({
      code: stockCode,
      scale: Number(scale),
      data,
    });
  } catch (err) {
    console.error("[kline API]", err);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
