import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { OrderEditor } from "../../_components/order-editor";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  return {
    title: { absolute: i18n._(msg`编辑记录 · Loopy 记账`) },
    description: i18n._(
      msg`查看和修改消费记录、数量、完成状态与留存照片，核对金额及热量。`,
    ),
  };
}

export default async function BbqEditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <OrderEditor orderId={id} />
    </Suspense>
  );
}
