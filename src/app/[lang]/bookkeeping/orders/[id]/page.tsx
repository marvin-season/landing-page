import { msg } from "@lingui/core/macro";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getBookkeepingPageMetadata } from "@/lib/bookkeeping-seo";
import { getI18nInstance } from "@/lib/i18n/appRouterI18n";
import { OrderEditor } from "../../_components/order-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const i18n = getI18nInstance(lang);
  return {
    ...getBookkeepingPageMetadata(
      lang,
      `/orders/${encodeURIComponent(id)}`,
      i18n._(msg`编辑记录 · Loopy 记账`),
      i18n._(
        msg`查看和修改消费记录、数量、完成状态与留存照片，核对金额及热量。`,
      ),
    ),
    // Local account tools and records are not search landing pages.
    robots: { index: false, follow: true },
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
