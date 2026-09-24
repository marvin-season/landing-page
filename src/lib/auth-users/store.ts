import { type Client, createClient } from "@libsql/client";
import { hashPassword, verifyPassword } from "./password";

export class AuthStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthStoreError";
  }
}

export type UserRole = "super_admin";

export type AuthUser = {
  username: string;
  passwordHash: string;
  role: UserRole;
  updatedAt: string;
};

export type PublicAuthUser = {
  username: string;
  role: UserRole;
  updatedAt: string;
};

export const SUPER_ADMIN_USERNAME = "marvin";
const SUPER_ADMIN_PASSWORD = "super_marvin";

let db: Client | undefined;

export function setAuthDb(client: Client | undefined) {
  db = client;
}

export function getAuthDb() {
  if (db) return db;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new AuthStoreError("storage is not configured");
  }

  db = createClient({
    url,
    authToken: process.env.TURSO_DATABASE_AUTH_TOKEN,
  });
  return db;
}

function rowToUser(row: {
  username: unknown;
  password_hash: unknown;
  role: unknown;
  updated_at: unknown;
}): AuthUser {
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    role: "super_admin",
    updatedAt: String(row.updated_at),
  };
}

export function listPublicUsers(users: AuthUser[]): PublicAuthUser[] {
  return users.map(({ username, role, updatedAt }) => ({
    username,
    role,
    updatedAt,
  }));
}

async function ensureReady() {
  const client = getAuthDb();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS auth_users (
      username TEXT PRIMARY KEY NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const existing = await client.execute(
    "SELECT username FROM auth_users LIMIT 1",
  );
  if (existing.rows.length > 0) return client;

  await client.execute({
    sql: `
      INSERT OR IGNORE INTO auth_users (username, password_hash, role, updated_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [
      SUPER_ADMIN_USERNAME,
      await hashPassword(SUPER_ADMIN_PASSWORD),
      "super_admin",
      new Date().toISOString(),
    ],
  });

  return client;
}

export async function loadAuthUsers() {
  const client = await ensureReady();
  const result = await client.execute(
    "SELECT username, password_hash, role, updated_at FROM auth_users ORDER BY username",
  );
  return result.rows.map((row) => rowToUser(row));
}

export async function getUserRole(username: string): Promise<UserRole | null> {
  const client = await ensureReady();
  const result = await client.execute({
    sql: "SELECT role FROM auth_users WHERE username = ?",
    args: [username],
  });
  return result.rows[0]?.role === "super_admin" ? "super_admin" : null;
}

export async function verifyCredentials(username: string, password: string) {
  if (!username || !password) return false;

  try {
    const client = await ensureReady();
    const result = await client.execute({
      sql: "SELECT password_hash FROM auth_users WHERE username = ?",
      args: [username],
    });
    const hash = result.rows[0]?.password_hash;
    if (typeof hash !== "string") return false;
    return verifyPassword(password, hash);
  } catch {
    return false;
  }
}

export async function updateUserPassword(username: string, password: string) {
  if (!password) throw new AuthStoreError("password is empty");

  const client = await ensureReady();
  const existing = await client.execute({
    sql: "SELECT username, role FROM auth_users WHERE username = ?",
    args: [username],
  });
  const row = existing.rows[0];
  if (!row) throw new AuthStoreError("user not found");

  const updatedAt = new Date().toISOString();
  await client.execute({
    sql: "UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE username = ?",
    args: [await hashPassword(password), updatedAt, username],
  });

  return {
    username,
    role: "super_admin",
    updatedAt,
  } satisfies PublicAuthUser;
}
