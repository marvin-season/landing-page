import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderEditor } from "../../_components/order-editor";

export const metadata: Metadata = {
  title: { absolute: "编辑记录 · 天天记账" },
  description: "查看和修改消费记录、数量、完成状态与留存照片，核对金额及热量。",
};

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
