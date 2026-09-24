import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("accepts the original password and rejects another", async () => {
    const encoded = await hashPassword("correct-horse");
    assert.equal(await verifyPassword("correct-horse", encoded), true);
    assert.equal(await verifyPassword("wrong-password", encoded), false);
  });

  it("rejects an empty password", async () => {
    await assert.rejects(() => hashPassword(""), /empty/i);
    assert.equal(await verifyPassword("", "scrypt$16384$8$1$YQ$YQ"), false);
  });
});
