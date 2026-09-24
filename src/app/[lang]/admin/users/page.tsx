"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { AdminShell } from "../_components/admin-shell";
import { CreateUserCard } from "./_components/create-user-card";
import { UserAccountCard } from "./_components/user-account-card";

export default function AdminUsersPage() {
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

  return (
    <AdminShell
      title="账号"
      description="查看登录账号。只有超级管理员可以创建账号或修改密码。"
      backHref="/admin"
    >
      {listQuery.error ? (
        <p role="alert" className="text-sm text-destructive">
          {listQuery.error.message}
        </p>
      ) : null}

      {listQuery.isPending ? (
        <p className="text-sm text-muted-foreground">加载中</p>
      ) : null}

      <div className="flex flex-col gap-4">
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
    </AdminShell>
  );
}
