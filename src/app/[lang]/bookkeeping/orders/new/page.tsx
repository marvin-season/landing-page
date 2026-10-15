import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { OrderEditor } from "../../_components/order-editor";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return {
    ...getBookkeepingPageMetadata(
      lang,
      "/orders/new",
      i18n._(msg`新增记录 · 记露`),
      i18n._(msg`记录日常消费与订单，选择项目、调整数量，汇总金额与饮食热量。`),
    ),
    // Local account tools and records are not search landing pages.
    robots: { index: false, follow: true },
  };
}

export default function BbqNewOrderPage() {
  return <OrderEditor />;
}
