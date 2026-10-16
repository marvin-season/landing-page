import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { type Client, createClient } from "@libsql/client";
import { getBuiltinAnnouncements } from "./builtin";
import { createAnnouncementHandlers } from "./http";
import { listInputSchema } from "./model";
import { createAnnouncementStore } from "./store";

const clients: Client[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});
function setup() {
  const db = createClient({ url: ":memory:" });
  clients.push(db);
  return { db, store: createAnnouncementStore(() => db) };
}
const input = {
  title: "公告",
  body: "内容",
  publishedAt: "2026-10-15T00:00:00.000Z",
  published: true,
};
const futureNow = "2090-01-01T00:00:00.000Z";
const listInput = { cursor: null, q: "", locale: "zh", now: futureNow };

test("merges built-ins with the database in pages of ten, including tied dates", async () => {
  const { store } = setup();
  for (let i = 0; i < 25; i++)
    await store.save(
      {
        ...input,
        title: `公告 ${i}`,
        publishedAt:
          i < 12 ? "2026-10-17T00:00:00.000Z" : "2026-10-16T00:00:00.000Z",
      },
      "admin",
    );
  let page = await store.list(listInput);
  const sizes = [page.items.length];
  const all = [...page.items];
  while (page.nextCursor) {
    page = await store.list({
      ...listInput,
      cursor: listInputSchema.parse({ cursor: page.nextCursor }).cursor,
    });
    sizes.push(page.items.length);
    all.push(...page.items);
  }
  assert.deepEqual(sizes, [10, 10, 6]);
  assert.equal(new Set(all.map((item) => item.id)).size, 26);
  assert.equal(all.filter((item) => item.source === "builtin").length, 1);
  for (let i = 1; i < all.length; i++) {
    const before = all[i - 1],
      after = all[i];
    assert.ok(
      before.publishedAt > after.publishedAt ||
        (before.publishedAt === after.publishedAt && before.id > after.id),
    );
  }
});

test("drafts and scheduled announcements are private, including forged future cursors", async () => {
  const { db, store } = setup();
  const draft = await store.save({ ...input, published: false }, "admin");
  const scheduled = await store.save(
    { ...input, publishedAt: "2099-01-01T00:00:00.000Z" },
    "admin",
  );
  const publicPage = await store.list(listInput);
  assert.ok(
    !publicPage.items.some(
      (item) => item.id === draft.id || item.id === scheduled.id,
    ),
  );
  const forged = await store.list({
    ...listInput,
    cursor: {
      asOf: "2100-01-01T00:00:00.000Z",
      publishedAt: "2100-01-01T00:00:00.000Z",
      id: "z",
    },
  });
  assert.ok(!forged.items.some((item) => item.id === scheduled.id));
  assert.equal(
    (await store.list({ ...listInput, admin: true })).items.length,
    2,
  );
  await store.save({ ...input, published: true }, "admin", draft.id);
  assert.ok(
    (await store.list(listInput)).items.some((item) => item.id === draft.id),
  );
  await store.save({ ...input, published: false }, "admin", draft.id);
  assert.ok(
    !(await store.list(listInput)).items.some((item) => item.id === draft.id),
  );
  assert.equal(
    (
      await db.execute({
        sql: "SELECT updated_by FROM bookkeeping_announcements WHERE id = ?",
        args: [draft.id],
      })
    ).rows[0].updated_by,
    "admin",
  );
});

test("snapshot excludes records created after the first page, including backdated inserts", async () => {
  const { db, store } = setup();
  for (let i = 0; i < 12; i++) await store.save(input, "admin");
  const first = await store.list(listInput);
  assert.ok(first.nextCursor);
  const late = await store.save(
    { ...input, publishedAt: "2026-01-01T00:00:00.000Z" },
    "admin",
  );
  await db.execute({
    sql: "UPDATE bookkeeping_announcements SET created_at = ? WHERE id = ?",
    args: ["2090-01-02T00:00:00.000Z", late.id],
  });
  const next = await store.list({
    ...listInput,
    cursor: listInputSchema.parse({ cursor: first.nextCursor }).cursor,
  });
  assert.ok(!next.items.some((item) => item.id === late.id));
});

test("search includes both sources and treats SQL wildcards as literal text", async () => {
  const { store } = setup();
  await store.save({ ...input, title: "100%_完成" }, "admin");
  await store.save({ ...input, title: "10000完成" }, "admin");
  assert.equal((await store.list({ ...listInput, q: "%_" })).items.length, 1);
  assert.equal(
    (await store.list({ ...listInput, q: "设备" })).items[0].source,
    "builtin",
  );
  assert.equal(
    (await store.list({ ...listInput, q: "' OR 1=1 --" })).items.length,
    0,
  );
  assert.equal(
    getBuiltinAnnouncements("ja")[0].title,
    "記帳データは端末に保存されます",
  );
});

test("validates writes, keeps built-ins immutable, and reports deleted records", async () => {
  const { store } = setup();
  await assert.rejects(store.save({ ...input, title: " " }, "admin"));
  await assert.rejects(
    store.save({ ...input, publishedAt: "not a date" }, "admin"),
  );
  await assert.rejects(store.save(input, "admin", "builtin:local-data-backup"));
  await assert.rejects(store.remove("builtin:local-data-backup"));
  const saved = await store.save(input, "admin");
  await store.remove(saved.id);
  await assert.rejects(store.save(input, "admin", saved.id));
});

function request(
  method = "GET",
  body?: unknown,
  origin = "https://example.com",
) {
  return new Request(
    "https://example.com/api/admin/bookkeeping/announcements",
    {
      method,
      headers: { origin, "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    },
  );
}

for (const role of [null, "guest", "admin", "super_admin"]) {
  test(`admin API authorizes every operation for role ${role}`, async () => {
    const { store } = setup();
    const routes = createAnnouncementHandlers({
      store,
      getActor: async () => (role ? { id: "person", role } : null),
    });
    const allowed = role === "admin" || role === "super_admin";
    const expected = role === null ? 401 : 403;
    assert.equal(
      (await routes.admin(request())).status,
      allowed ? 200 : expected,
    );
    const created = await routes.admin(request("POST", input));
    assert.equal(created.status, allowed ? 201 : expected);
    const id = allowed
      ? (await created.json()).id
      : `db:${crypto.randomUUID()}`;
    assert.equal(
      (await routes.admin(request("PATCH", { ...input, id }))).status,
      allowed ? 200 : expected,
    );
    assert.equal(
      (await routes.admin(request("DELETE", { id }))).status,
      allowed ? 200 : expected,
    );
  });
}

test("rejects cross-origin writes and malformed payloads/cursors without exposing internals", async () => {
  const { store } = setup();
  const routes = createAnnouncementHandlers({
    store,
    getActor: async () => ({ id: "admin", role: "admin" }),
  });
  assert.equal(
    (await routes.admin(request("POST", input, "https://evil.example"))).status,
    403,
  );
  assert.equal(
    (await routes.admin(request("POST", { ...input, body: "" }))).status,
    400,
  );
  assert.equal(
    (
      await routes.admin(
        request("PATCH", { ...input, id: "builtin:local-data-backup" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await routes.publicList(
        new Request(
          "https://example.com/api/bookkeeping/announcements?cursor=garbage",
        ),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await routes.publicList(
        new Request(
          "https://example.com/api/bookkeeping/announcements?cursor=%7B%7D",
        ),
      )
    ).status,
    400,
  );
  const unavailable = createAnnouncementHandlers({
    store: createAnnouncementStore(() => {
      throw new Error("secret connection string");
    }),
    getActor: async () => null,
  });
  const response = await unavailable.publicList(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { error: "unavailable" });
});

test("public reads do not require auth and cannot mutate data", async () => {
  const { store } = setup();
  const routes = createAnnouncementHandlers({
    store,
    getActor: async () => {
      throw new Error("must not authenticate public reads");
    },
  });
  assert.equal((await routes.publicList(request())).status, 200);
  assert.equal((await routes.publicList(request("POST", input))).status, 405);
});
