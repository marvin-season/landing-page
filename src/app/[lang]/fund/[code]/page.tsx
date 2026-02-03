"use client";

import { use } from "react";
import { validateFundCode } from "@/app/[lang]/fund/_utils/fund-types";
import FundDetail from "@/app/[lang]/fund/[code]/_components/FundDetail";

export default function FundPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  if (!validateFundCode(code)) {
    return (
      <div className="text-muted-foreground">请输入正确的 6 位基金代码</div>
    );
  }

  return <FundDetail code={code} />;
}
