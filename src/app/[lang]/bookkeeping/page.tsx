import { Suspense } from "react";
import { BackupReminder } from "./_components/backup-reminder";
import { OrdersHome } from "./_components/orders-home";

export default function BbqOrdersPage() {
  return (
    <Suspense fallback={null}>
      <BackupReminder />
      <OrdersHome />
    </Suspense>
  );
}
