import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createClient } from "@libsql/client";
import {
  listPublicUsers,
  loadAuthUsers,
  SUPER_ADMIN_USERNAME,
  setAuthDb,
  updateUserPassword,
  verifyCredentials,
} from "./store";

function useMemoryDb() {
  const client = createClient({ url: ":memory:" });
  setAuthDb(client);
  return client;
}

afterEach(() => {
  setAuthDb(undefined);
});

describe("auth user store", () => {
  it("seeds the super admin on first load", async () => {
    useMemoryDb();
    const users = await loadAuthUsers();
    assert.deepEqual(
      users.map((user) => user.username),
      [SUPER_ADMIN_USERNAME],
    );
    assert.equal(await verifyCredentials("marvin", "super_marvin"), true);
    assert.equal(users[0]?.passwordHash.startsWith("scrypt$"), true);
    assert.deepEqual(listPublicUsers(users)[0]?.username, "marvin");
    assert.equal("passwordHash" in (listPublicUsers(users)[0] ?? {}), false);
  });

  it("does not replace an existing user document with the seed", async () => {
    const client = useMemoryDb();
    await client.execute(`
      CREATE TABLE auth_users (
        username TEXT PRIMARY KEY NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await client.execute({
      sql: "INSERT INTO auth_users (username, password_hash, role, updated_at) VALUES (?, ?, ?, ?)",
      args: [
        "existing",
        "scrypt$keep",
        "super_admin",
        "2026-01-01T00:00:00.000Z",
      ],
    });

    const users = await loadAuthUsers();
    assert.deepEqual(
      users.map((user) => user.username),
      ["existing"],
    );
    assert.equal(await verifyCredentials("marvin", "super_marvin"), false);
  });

  it("rejects the wrong password and empty credentials", async () => {
    useMemoryDb();
    assert.equal(await verifyCredentials("marvin", "wrong"), false);
    assert.equal(await verifyCredentials("", ""), false);
    assert.equal(await verifyCredentials("missing", "super_marvin"), false);
  });

  it("updates a password and invalidates the old one", async () => {
    useMemoryDb();
    await loadAuthUsers();
    const updated = await updateUserPassword("marvin", "new-secret");
    assert.equal(updated.username, "marvin");
    assert.equal(await verifyCredentials("marvin", "super_marvin"), false);
    assert.equal(await verifyCredentials("marvin", "new-secret"), true);
  });

  it("rejects a missing user or empty password", async () => {
    useMemoryDb();
    await assert.rejects(() => updateUserPassword("nobody", "x"), /not found/i);
    await assert.rejects(() => updateUserPassword("marvin", ""), /empty/i);
  });
});
