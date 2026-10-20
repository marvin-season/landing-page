import { Suspense } from "react";
import { OrdersHome } from "./_components/home/orders-home";
import { BackupReminder } from "./_components/reminders/backup-reminder";
import { CompanionAlbumReminder } from "./_components/reminders/companion-album-reminder";

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <BackupReminder />
      <CompanionAlbumReminder />
      <OrdersHome />
    </Suspense>
  );
}
