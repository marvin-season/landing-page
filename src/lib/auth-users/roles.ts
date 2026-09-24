export const USER_ROLES = ["super_admin", "admin", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CREATABLE_ROLES = ["admin", "guest"] as const;
export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return value === "super_admin" || value === "admin" || value === "guest";
}

export function isCreatableRole(value: unknown): value is CreatableRole {
  return value === "admin" || value === "guest";
}
