import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { OrderEditor } from "../../_components/order-editor";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return {
    title: { absolute: i18n._(msg`新增记录 · Loopy 记账`) },
    description: i18n._(
      msg`记录日常消费与订单，选择项目、调整数量，汇总金额与饮食热量。`,
    ),
  };
}

export default function BbqNewOrderPage() {
  return <OrderEditor />;
}
