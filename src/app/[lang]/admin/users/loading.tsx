import { UsersPageHeader, UsersSkeleton } from "./_components/users-page-ui";

export default function AdminUsersLoading() {
  return (
    <>
      <UsersPageHeader />
      <UsersSkeleton />
    </>
  );
}
