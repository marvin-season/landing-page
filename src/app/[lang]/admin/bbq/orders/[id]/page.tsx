import { Suspense } from "react";
import { readAccountingMode } from "@/lib/bbq/accounting";
import { OrderEditor } from "../../_components/order-editor";

export default async function BbqEditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);
  const accountingMode = readAccountingMode(mode);
  return (
    <Suspense fallback={null}>
      <OrderEditor
        key={`${accountingMode}:${id}`}
        orderId={id}
        mode={accountingMode}
      />
    </Suspense>
  );
}
