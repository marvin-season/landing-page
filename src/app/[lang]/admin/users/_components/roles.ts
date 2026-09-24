import type { UserRole } from "@/lib/auth-users/roles";

export const ROLE_ORDER = ["super_admin", "admin", "guest"] as const;

export function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  if (role === "guest") return "访客";
  return role;
}

export function roleTone(role: string) {
  if (role === "super_admin") return "bg-primary/12 text-primary";
  if (role === "admin") return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
}

export function userInitial(username: string) {
  const char = username.trim().charAt(0);
  return char ? char.toUpperCase() : "?";
}

export const creatableRoleOptions: {
  value: Exclude<UserRole, "super_admin">;
  label: string;
}[] = [
  { value: "admin", label: "管理员" },
  { value: "guest", label: "访客" },
];
