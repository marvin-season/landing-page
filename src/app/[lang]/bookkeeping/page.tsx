import { Suspense } from "react";
import { OrdersHome } from "./_components/orders-home";

export default function BbqOrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersHome />
    </Suspense>
  );
}
