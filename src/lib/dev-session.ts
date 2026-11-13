import type { Session } from "next-auth";

export const DEV_USER_ID = "dev";

export function isLocalDevelopment() {
  return process.env.NODE_ENV === "development";
}

export function devSession(): Session {
  return {
    user: {
      id: DEV_USER_ID,
      name: DEV_USER_ID,
      email: `${DEV_USER_ID}@local.dev`,
    },
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}
