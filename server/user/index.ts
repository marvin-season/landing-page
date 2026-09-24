import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AuthStoreError,
  createUser,
  getUserRole,
  listPublicUsers,
  loadAuthUsers,
  updateUserPassword,
} from "@/lib/auth-users/store";
import { protectedProcedure, router } from "~/server/trpc";

function toTrpcError(error: unknown): TRPCError {
  if (error instanceof AuthStoreError) {
    if (error.message === "storage is not configured") {
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "存储未配置",
      });
    }
    if (error.message === "user not found") {
      return new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }
    if (error.message === "user already exists") {
      return new TRPCError({
        code: "CONFLICT",
        message: "账号已存在",
      });
    }
    if (error.message === "username is empty") {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "用户名不能为空",
      });
    }
    if (error.message === "password is empty") {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "密码不能为空",
      });
    }
    if (error.message === "role is not creatable") {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "只能创建管理员或访客",
      });
    }
  }

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
        if (error instanceof TRPCError) throw error;
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
        if (error instanceof TRPCError) throw error;
        throw toTrpcError(error);
      }
    }),
});
