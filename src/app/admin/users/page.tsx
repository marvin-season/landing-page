"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { useTRPC } from "@/lib/trpc";
import { UserPasswordCard } from "./_components/user-password-card";

export default function AdminUsersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listQuery = useQuery(trpc.user.list.queryOptions());
  const updateMutation = useMutation(
    trpc.user.updatePassword.mutationOptions(),
  );

  return (
    <AdminShell title="账号" description="修改登录密码。不会立刻退出已有会话。">
      {listQuery.error ? (
        <p role="alert" className="text-sm text-destructive">
          {listQuery.error.message}
        </p>
      ) : null}

      {listQuery.isPending ? (
        <p className="text-sm text-muted-foreground">加载中</p>
      ) : null}

      <div className="flex flex-col gap-4">
        {listQuery.data?.map((user) => (
          <UserPasswordCard
            key={user.username}
            username={user.username}
            role={user.role}
            updatedAt={user.updatedAt}
            pending={
              updateMutation.isPending &&
              updateMutation.variables?.username === user.username
            }
            onSubmit={async (password) => {
              await updateMutation.mutateAsync({
                username: user.username,
                password,
              });
              await queryClient.invalidateQueries(trpc.user.list.queryFilter());
            }}
          />
        ))}
      </div>
    </AdminShell>
  );
}
