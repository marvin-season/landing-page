import { Suspense } from "react";
import { BackupReminder } from "./_components/backup-reminder";
import { CompanionAlbumReminder } from "./_components/companion-album-reminder";
import { OrdersHome } from "./_components/orders-home";

export default function BbqOrdersPage() {
  return (
    <Suspense fallback={null}>
      <BackupReminder />
      <CompanionAlbumReminder />
      <OrdersHome />
    </Suspense>
  );
}
