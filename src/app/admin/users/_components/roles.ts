import type { UserRole } from "@/lib/auth-users/roles";

export function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  if (role === "guest") return "访客";
  return role;
}

export const creatableRoleOptions: {
  value: Exclude<UserRole, "super_admin">;
  label: string;
}[] = [
  { value: "admin", label: "管理员" },
  { value: "guest", label: "访客" },
];
