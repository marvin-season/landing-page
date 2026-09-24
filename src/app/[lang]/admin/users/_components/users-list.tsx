"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { CreateUserCard } from "./create-user-card";
import { UserAccountCard } from "./user-account-card";
import { UsersSkeleton } from "./users-page-ui";

export function UsersList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.user.list.queryOptions());
  const createMutation = useMutation(trpc.user.create.mutationOptions());
  const updateMutation = useMutation(
    trpc.user.updatePassword.mutationOptions(),
  );
  const users = listQuery.data?.users;
  const canManage = listQuery.data?.canManage === true;

  async function refreshUsers() {
    await queryClient.invalidateQueries(trpc.user.list.queryFilter());
  }

  if (listQuery.isPending) {
    return <UsersSkeleton />;
  }

  return (
    <>
      {listQuery.error ? (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {listQuery.error.message}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-4">
        {canManage ? (
          <CreateUserCard
            pending={createMutation.isPending}
            onSubmit={async (input) => {
              await createMutation.mutateAsync(input);
              await refreshUsers();
            }}
          />
        ) : null}

        {users?.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无账号</p>
        ) : null}

        {users?.map((user) => (
          <UserAccountCard
            key={user.username}
            username={user.username}
            role={user.role}
            updatedAt={user.updatedAt}
            canManage={canManage}
            pending={
              updateMutation.isPending &&
              updateMutation.variables?.username === user.username
            }
            onSubmit={async (password) => {
              await updateMutation.mutateAsync({
                username: user.username,
                password,
              });
              await refreshUsers();
            }}
          />
        ))}
      </div>
    </>
  );
}
