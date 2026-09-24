import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  AuthStoreError,
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
    if (error.message === "password is empty") {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "密码不能为空",
      });
    }
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "读取用户失败",
  });
}

export const userRouter = router({
  list: protectedProcedure.query(async () => {
    try {
      return listPublicUsers(await loadAuthUsers());
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
        const role = await getUserRole(ctx.userId);
        if (role !== "super_admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "只有超级管理员可以修改密码",
          });
        }
        return await updateUserPassword(input.username, input.password);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTrpcError(error);
      }
    }),
});
