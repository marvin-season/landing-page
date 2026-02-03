import { NextRequest, NextResponse } from "next/server";

/**
 * 东方财富/天天基金 实时净值接口
 * 数据源: http://fundgz.1234567.com.cn/js/{基金代码}.js
 * 返回当日估计净值(gsz)与估计涨幅(gszzl)，基于重仓股实时行情估算
 */
const EASTMONEY_API = "http://fundgz.1234567.com.cn/js";

interface EastmoneyFundResponse {
  fundcode: string;
  name: string;
  jzrq: string; // 净值日期
  dwjz: string; // 单位净值(前一交易日)
  gsz: string; // 估计净值(当日)
  gszzl: string; // 估计涨幅(%)
  gztime: string; // 估计时间
}

function parseJsonp(content: string): EastmoneyFundResponse | null {
  const match = content.match(/^jsonpgz\((.*)\);?\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as EastmoneyFundResponse;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "基金代码应为6位数字" }, { status: 400 });
  }

  const url = `${EASTMONEY_API}/${code}.js?rt=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FundApp/1.0; +https://github.com)",
      },
      next: { revalidate: 60 }, // 缓存 60 秒
    });

    if (!res.ok) {
      return NextResponse.json({ error: "获取基金数据失败" }, { status: 502 });
    }

    const text = await res.text();
    const raw = parseJsonp(text);

    if (!raw || !raw.fundcode) {
      return NextResponse.json(
        { error: "未找到该基金或数据暂时不可用" },
        { status: 404 },
      );
    }

    const previousNetValue = Number.parseFloat(raw.dwjz);
    const netValue = Number.parseFloat(raw.gsz);
    const changePercent = Number.parseFloat(raw.gszzl);
    const changeAmount = netValue - previousNetValue;

    return NextResponse.json({
      code: raw.fundcode,
      name: raw.name,
      netValue,
      previousNetValue,
      changePercent,
      changeAmount,
      lastUpdateTime: raw.gztime,
    });
  } catch (err) {
    console.error("[fund API]", err);
    return NextResponse.json(
      { error: "服务暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}
