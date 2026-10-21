import { Suspense } from "react";
import { OrdersHome } from "./_components/home/orders-home";

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersHome />
    </Suspense>
  );
}
