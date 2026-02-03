import { NextRequest, NextResponse } from "next/server";

/**
 * 东方财富 基金持仓/重仓股
 * 数据源: fundf10.eastmoney.com FundArchivesDatas
 */
const HOLDINGS_URL =
  "https://fundf10.eastmoney.com/FundArchivesDatas.aspx";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "基金代码应为6位数字" }, { status: 400 });
  }

  const url = `${HOLDINGS_URL}?code=${code}&topline=10&type=jjcc`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FundApp/1.0; +https://github.com)",
        Referer: "https://fund.eastmoney.com/",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "获取持仓数据失败" },
        { status: 502 },
      );
    }

    const html = await res.text();

    const holdings: Array<{
      rank: number;
      stockCode: string;
      stockName: string;
      holdRatio: number;
    }> = [];

    const rowRegex =
      /<tr>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d{6})<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)%?<\/td>/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(html)) !== null) {
      const rank = Number.parseInt(m[1], 10);
      const stockCode = m[2];
      const stockName = m[3].trim();
      const holdRatio = Number.parseFloat(m[4]) || 0;
      const prefix = stockCode.startsWith("6") ? "sh" : "sz";
      holdings.push({
        rank,
        stockCode: `${prefix}${stockCode}`,
        stockName,
        holdRatio,
      });
    }

    if (holdings.length === 0) {
      const altRegex =
        /(\d{6})[\s\S]*?([\u4e00-\u9fa5\w]+)[\s\S]*?([\d.]+)%/g;
      let alt: RegExpExecArray | null;
      let idx = 0;
      while ((alt = altRegex.exec(html)) !== null && idx < 10) {
        const stockCode = alt[1];
        const stockName = alt[2].trim();
        const holdRatio = Number.parseFloat(alt[3]) || 0;
        if (holdRatio > 0 && holdRatio < 100) {
          const prefix = stockCode.startsWith("6") ? "sh" : "sz";
          holdings.push({
            rank: idx + 1,
            stockCode: `${prefix}${stockCode}`,
            stockName,
            holdRatio,
          });
          idx++;
        }
      }
    }

    return NextResponse.json({
      code,
      holdings,
    });
  } catch (err) {
    console.error("[holdings API]", err);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
