import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { novelDailyCharLimit } from "./limits";
import { createNovelQuotaStore, NovelQuotaError } from "./store";

test("novel quota reserves input and rejects over-limit prompts", async (t) => {
  const db = createClient({ url: ":memory:" });
  t.after(() => db.close());
  const quota = createNovelQuotaStore(() => db);
  const day = new Date("2026-03-27T12:00:00.000Z");

  const first = await quota.reserveInput("fp-guest-1", 4_000, day);
  assert.equal(first.used, 4_000);
  assert.equal(first.limit, novelDailyCharLimit);

  await assert.rejects(
    () => quota.reserveInput("fp-guest-1", 6_001, day),
    (error: unknown) =>
      error instanceof NovelQuotaError && error.status === 429,
  );

  const still = await quota.readUsage("fp-guest-1", "2026-03-27");
  assert.equal(still.used, 4_000);

  const afterOutput = await quota.addOutput("fp-guest-1", 1_500, day);
  assert.equal(afterOutput.used, 5_500);
});

test("novel quota resets on the next UTC day", async (t) => {
  const db = createClient({ url: ":memory:" });
  t.after(() => db.close());
  const quota = createNovelQuotaStore(() => db);

  await quota.reserveInput(
    "fp-guest-2",
    novelDailyCharLimit,
    new Date("2026-03-27T23:00:00.000Z"),
  );
  const nextDay = await quota.reserveInput(
    "fp-guest-2",
    100,
    new Date("2026-03-28T00:00:00.000Z"),
  );
  assert.equal(nextDay.day, "2026-03-28");
  assert.equal(nextDay.used, 100);
});
