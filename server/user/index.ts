import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AuthStoreError,
  type AuthStoreErrorCode,
  createUser,
  getUserRole,
  listPublicUsers,
  loadAuthUsers,
  updateUserPassword,
} from "@/lib/auth-users/store";
import { protectedProcedure, router } from "~/server/trpc";

const AUTH_STORE_TRPC: Record<
  AuthStoreErrorCode,
  ConstructorParameters<typeof TRPCError>[0]
> = {
  storage_not_configured: {
    code: "PRECONDITION_FAILED",
    message: "存储未配置",
  },
  user_not_found: { code: "NOT_FOUND", message: "用户不存在" },
  user_already_exists: { code: "CONFLICT", message: "账号已存在" },
  username_empty: { code: "BAD_REQUEST", message: "用户名不能为空" },
  password_empty: { code: "BAD_REQUEST", message: "密码不能为空" },
  role_not_creatable: { code: "BAD_REQUEST", message: "只能创建管理员或访客" },
  invalid_role: { code: "INTERNAL_SERVER_ERROR", message: "读取用户失败" },
};

function toTrpcError(error: unknown) {
  if (error instanceof TRPCError) return error;
  if (error instanceof AuthStoreError)
    return new TRPCError(AUTH_STORE_TRPC[error.code]);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "读取用户失败",
  });
}

async function requireSuperAdmin(userId: string, message: string) {
  const role = await getUserRole(userId);
  if (role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }
}

export const userRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [users, role] = await Promise.all([
        loadAuthUsers().then(listPublicUsers),
        getUserRole(ctx.userId),
      ]);
      return {
        users,
        canManage: role === "super_admin",
      };
    } catch (error) {
      throw toTrpcError(error);
    }
  }),
  create: protectedProcedure
    .input(
      z.object({
        username: z.string().trim().min(1),
        password: z.string().min(1),
        role: z.enum(["admin", "guest"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await requireSuperAdmin(ctx.userId, "只有超级管理员可以创建账号");
        return await createUser(input.username, input.password, input.role);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
  updatePassword: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await requireSuperAdmin(ctx.userId, "只有超级管理员可以修改密码");
        return await updateUserPassword(input.username, input.password);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),
});
