import { type NextRequest, NextResponse } from "next/server";
import { fetchFundHoldingsFromEastmoney } from "@/app/api/fund/_lib/holdings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "基金代码应为6位数字" }, { status: 400 });
  }

  try {
    const holdings = await fetchFundHoldingsFromEastmoney(code);

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
