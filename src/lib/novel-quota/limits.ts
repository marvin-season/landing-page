import type { UserRole } from "@/lib/auth-users/roles";

/** 非管理员按浏览器指纹统计的每日输入+输出字符上限。 */
export const novelDailyCharLimit = 10_000;

export function utcDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isNovelQuotaExempt(role: UserRole | null | undefined) {
  return role === "admin" || role === "super_admin";
}

export function novelQuotaExceededMessage(limit = novelDailyCharLimit) {
  return `今日创作额度已用完（每日 ${limit} 字，按输入与输出合计）。请明天再试。`;
}
