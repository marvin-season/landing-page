import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const origin = process.env.BOOKKEEPING_PWA_TEST_ORIGIN ?? "https://example.com";
const shell =
  '<span hidden data-bookkeeping-offline-shell="true"></span><script src="/_next/static/app.js"></script>';
const assets = ["/_next/static/app.js", "/bbq-pwa/icon-192.png"];

// Exercise the real bundled Serwist worker with the standard Request/Response
// APIs and an in-memory CacheStorage. No browser UI or project database is used.
class MemoryCache {
  entries = new Map<string, Response>();
  async match(input: Request | string, options?: CacheQueryOptions) {
    const url = typeof input === "string" ? input : input.url;
    const entry = options?.ignoreSearch
      ? [...this.entries].find(
          ([key]) => key.split("?")[0] === url.split("?")[0],
        )?.[1]
      : this.entries.get(url);
    return entry?.clone();
  }
  async put(request: Request, response: Response) {
    this.entries.set(request.url, response.clone());
  }
  async keys() {
    return [...this.entries.keys()].map((url) => new Request(url));
  }
  async delete(input: Request | string) {
    return this.entries.delete(typeof input === "string" ? input : input.url);
  }
}

class WorkerEvent {
  pending: Promise<unknown>[] = [];
  response?: Promise<Response>;
  constructor(public type: string) {}
  waitUntil(promise: Promise<unknown>) {
    this.pending.push(promise);
  }
  respondWith(response: Promise<Response>) {
    this.response = response;
  }
  async done() {
    // Strategy handlers can append lifetime promises while fetching/caching.
    let completed = 0;
    while (completed < this.pending.length) {
      const batch = this.pending.slice(completed);
      completed = this.pending.length;
      const results = await Promise.allSettled(batch);
      const error = results.find((result) => result.status === "rejected");
      if (error?.status === "rejected") throw error.reason;
    }
  }
}

class FetchWorkerEvent extends WorkerEvent {}

async function harness(
  locale = "zh",
  stores = new Map<string, MemoryCache>(),
  revision = "build-1",
  live = false,
) {
  const compiled = await build({
    entryPoints: ["src/lib/bookkeeping-pwa/worker.ts"],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    define: {
      "process.env.NODE_ENV": '"production"',
      BOOKKEEPING_BUILD_ID: JSON.stringify(revision),
      "self.__SW_MANIFEST": JSON.stringify(
        assets.map((url) => ({ url, revision: "asset-1" })),
      ),
    },
  });
  const listeners = new Map<string, ((event: WorkerEvent) => void)[]>();
  const state = {
    online: true,
    shell,
    requests: [] as string[],
    skipped: false,
  };
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name)!;
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async match(request: Request, options?: MultiCacheQueryOptions) {
      if (options?.cacheName)
        return (await this.open(options.cacheName)).match(request, options);
      for (const cache of stores.values()) {
        const hit = await cache.match(request, options);
        if (hit) return hit;
      }
    },
  };
  const globals = {
    URL,
    Request,
    Response,
    Headers,
    console,
    setTimeout,
    clearTimeout,
    caches,
    Cache: MemoryCache,
    FetchEvent: FetchWorkerEvent,
    ExtendableEvent: WorkerEvent,
    location: new URL(`${origin}/bbq-pwa/sw.js?lang=${locale}`),
    registration: { scope: `${origin}/${locale}/bookkeeping` },
    clients: { claim: async () => {} },
    skipWaiting: async () => {
      state.skipped = true;
    },
    addEventListener(type: string, callback: (event: WorkerEvent) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), callback]);
    },
    async fetch(input: Request | string) {
      const url = typeof input === "string" ? input : input.url;
      state.requests.push(url);
      if (!state.online) throw new TypeError("Network offline");
      if (live) return fetch(input);
      const path = new URL(url).pathname;
      return new Response(
        path.endsWith("/offline") ? state.shell : `asset:${path}`,
        {
          headers: {
            "content-type": path.endsWith("/offline")
              ? "text/html"
              : "application/octet-stream",
          },
        },
      );
    },
  };
  const source = live
    ? await readFile("public/bbq-pwa/sw.js", "utf8")
    : compiled.outputFiles[0].text;
  runInNewContext(source, { ...globals, self: globals });
  async function dispatch(event: WorkerEvent) {
    for (const listener of listeners.get(event.type) ?? []) listener(event);
    const response = await event.response;
    await event.done();
    return response;
  }
  return {
    state,
    stores,
    install: () => dispatch(new WorkerEvent("install")),
    activate: () => dispatch(new WorkerEvent("activate")),
    async fetch(path: string, navigation = false, headers?: HeadersInit) {
      const request = new Request(new URL(path, origin), { headers });
      if (navigation)
        Object.defineProperty(request, "mode", { value: "navigate" });
      return dispatch(
        Object.assign(new FetchWorkerEvent("fetch"), { request }),
      );
    },
    async prepare() {
      let result: { ready: boolean } | undefined;
      await dispatch(
        Object.assign(new WorkerEvent("message"), {
          data: { type: "BOOKKEEPING_PREPARE" },
          ports: [
            {
              postMessage: (value: { ready: boolean }) => {
                result = value;
              },
            },
          ],
        }),
      ).catch(() => {
        // A failed repair rejects Serwist's additional event-lifetime promise;
        // the message reply must still report false to the page, as in a browser.
      });
      return result?.ready;
    },
  };
}

test("offline cold navigations and unseen record IDs use the complete cached shell", async () => {
  const worker = await harness();
  await worker.install();
  await worker.activate();
  worker.state.online = false;
  for (const path of [
    "/zh/bookkeeping",
    "/zh/bookkeeping?day=2026-10-15",
    "/zh/bookkeeping/menu",
    "/zh/bookkeeping/announcements",
    "/zh/bookkeeping/settings",
    "/zh/bookkeeping/orders/new",
    "/zh/bookkeeping/orders/created-offline",
  ]) {
    assert.equal(await (await worker.fetch(path, true))?.text(), shell);
  }
  assert.equal(
    await (await worker.fetch(assets[0]))?.text(),
    `asset:${assets[0]}`,
  );
  assert.equal(await worker.prepare(), true);
  assert.equal(worker.state.skipped, false);
});

test("auth, APIs, other languages, unknown routes and RSC never receive cached HTML", async () => {
  const worker = await harness();
  await worker.install();
  worker.state.online = false;
  for (const path of [
    "/api/auth/session",
    "/api/bookkeeping/announcements",
    "/api/admin/bookkeeping/announcements",
    "/zh/admin/bookkeeping",
    "/zh/admin",
    "/en/bookkeeping",
    "/zh/bookkeeping-other",
    "/zh/bookkeeping/unknown",
  ]) {
    assert.equal(await worker.fetch(path, true), undefined, path);
  }
  assert.equal(
    await worker.fetch("/zh/bookkeeping?_rsc=abc", false, { RSC: "1" }),
    undefined,
  );
  await assert.rejects(
    worker.fetch("/zh/bookkeeping/offline", false, { RSC: "1" }),
    /Network offline/,
  );
});

test("retired built-in illustrations are not served or cached", async () => {
  const worker = await harness();
  await worker.install();
  worker.state.online = false;
  assert.equal(await worker.fetch("/bbq/companions/hello.gif"), undefined);
});

test("readiness detects eviction and retries missing files after connectivity returns", async () => {
  const worker = await harness();
  await worker.install();
  worker.stores.get("bookkeeping-zh-precache")!.entries.clear();
  worker.state.online = false;
  assert.equal(await worker.prepare(), false);
  worker.state.online = true;
  assert.equal(await worker.prepare(), true);
  worker.state.online = false;
  assert.equal(
    await (
      await worker.fetch("/zh/bookkeeping/orders/another-local-id", true)
    )?.text(),
    shell,
  );
});

test("an update keeps the active shell until activation and leaves unrelated caches alone", async () => {
  const first = await harness();
  await first.install();
  const unrelated = new MemoryCache();
  first.stores.set("another-app", unrelated);
  const second = await harness("zh", first.stores, "build-2");
  second.state.shell = shell.replace("</span>", "version two</span>");
  await second.install();
  assert.equal(
    await (await first.fetch("/zh/bookkeeping", true))?.text(),
    shell,
  );
  assert.equal(second.state.skipped, false);
  await second.activate();
  assert.equal(
    await (await second.fetch("/zh/bookkeeping", true))?.text(),
    second.state.shell,
  );
  assert.equal(second.stores.get("another-app"), unrelated);
});

test("error documents and mismatched deployments fail offline installation", async () => {
  for (const badShell of [
    "<html>Sign in</html>",
    shell.replace("app.js", "unknown-build.js"),
  ]) {
    const worker = await harness();
    worker.state.shell = badShell;
    await assert.rejects(worker.install(), /shell does not match/);
  }
});

test(
  "production worker installs the served shell and serves unseen routes offline",
  {
    skip: !process.env.BOOKKEEPING_PWA_TEST_ORIGIN,
  },
  async () => {
    for (const locale of ["zh", "en", "ja"]) {
      const worker = await harness(locale, new Map(), "unused", true);
      await worker.install();
      await worker.activate();
      const assetsFetched = worker.state.requests.length;
      assert.ok(assetsFetched > 10);
      worker.state.online = false;
      assert.equal(await worker.prepare(), true);
      for (const path of [
        "",
        "/menu",
        "/settings",
        "/orders/new",
        "/orders/offline-generated-id",
      ]) {
        const response = await worker.fetch(
          `/${locale}/bookkeeping${path}`,
          true,
        );
        assert.ok(
          (await response?.text())?.includes(
            'data-bookkeeping-offline-shell="true"',
          ),
        );
      }
      assert.equal(worker.state.requests.length, assetsFetched);
    }
  },
);
