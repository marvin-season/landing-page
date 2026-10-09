import { Suspense } from "react";
import { OrderEditor } from "../../_components/order-editor";

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
