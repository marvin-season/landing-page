const HOLDINGS_URL = "https://fundf10.eastmoney.com/FundArchivesDatas.aspx";

export interface RawHolding {
  rank: number;
  stockCode: string;
  stockName: string;
  holdRatio: number;
}

function parseHoldingsFromHtml(html: string): RawHolding[] {
  const holdings: RawHolding[] = [];
  const rowRegex =
    /<tr>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<td[^>]*>(\d{6})<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([\d.]+)%?<\/td>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const rank = Number.parseInt(match[1], 10);
    const stockCode = match[2];
    const stockName = match[3].trim();
    const holdRatio = Number.parseFloat(match[4]) || 0;

    if (holdRatio > 0 && holdRatio < 100) {
      const prefix = stockCode.startsWith("6") ? "sh" : "sz";
      holdings.push({
        rank,
        stockCode: `${prefix}${stockCode}`,
        stockName,
        holdRatio,
      });
    }
  }

  return holdings;
}

export async function fetchFundHoldingsFromEastmoney(
  code: string,
): Promise<RawHolding[]> {
  const url = `${HOLDINGS_URL}?code=${code}&topline=10&type=jjcc`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FundApp/1.0; +https://github.com)",
      Referer: "https://fund.eastmoney.com/",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error("获取持仓数据失败");
  }

  const html = await res.text();
  const holdings = parseHoldingsFromHtml(html);

  if (holdings.length > 0) {
    return holdings;
  }

  // 兜底解析：宽松匹配
  const fallback: RawHolding[] = [];
  const altRegex = /(\d{6})[\s\S]*?([\u4e00-\u9fa5\w]+)[\s\S]*?([\d.]+)%/g;
  let alt: RegExpExecArray | null;
  let idx = 0;
  while ((alt = altRegex.exec(html)) !== null && idx < 10) {
    const stockCode = alt[1];
    const stockName = alt[2].trim();
    const holdRatio = Number.parseFloat(alt[3]) || 0;
    if (holdRatio > 0 && holdRatio < 100) {
      const prefix = stockCode.startsWith("6") ? "sh" : "sz";
      fallback.push({
        rank: idx + 1,
        stockCode: `${prefix}${stockCode}`,
        stockName,
        holdRatio,
      });
      idx++;
    }
  }

  return fallback;
}
