import { Suspense } from "react";
import { AccountingHome } from "./_components/accounting-home";

export default function BbqOrdersPage() {
  return (
    <Suspense fallback={null}>
      <AccountingHome />
    </Suspense>
  );
}
