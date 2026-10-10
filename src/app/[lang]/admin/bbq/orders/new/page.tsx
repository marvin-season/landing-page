import { readAccountingMode } from "@/lib/bbq/accounting";
import { OrderEditor } from "../../_components/order-editor";

export default async function BbqNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; day?: string }>;
}) {
  const { mode, day } = await searchParams;
  const accountingMode = readAccountingMode(mode);
  return (
    <OrderEditor
      key={`${accountingMode}:${day ?? ""}`}
      mode={accountingMode}
      initialDay={day}
    />
  );
}
