import { locales } from "@/lib/i18n/locales";
import { UsersList } from "./_components/users-list";
import { UsersPageHeader } from "./_components/users-page-ui";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default function AdminUsersPage() {
  return (
    <>
      <UsersPageHeader />
      <UsersList />
    </>
  );
}
