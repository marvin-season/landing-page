/// <reference lib="webworker" />

import {
  CacheFirst,
  type PrecacheEntry,
  Serwist,
  type SerwistPlugin,
} from "serwist";
import { bookkeepingLocales, readBookkeepingRoute } from "./routes";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};
declare const BOOKKEEPING_BUILD_ID: string;

const locale = new URL(self.location.href).searchParams.get("lang") ?? "zh";
if (!bookkeepingLocales.some((value) => value === locale)) {
  throw new Error("Unsupported bookkeeping offline locale");
}
const shell = `/${locale}/bookkeeping/offline`;
const entries = self.__SW_MANIFEST;
const assetUrls = new Set(
  entries.map((entry) => (typeof entry === "string" ? entry : entry.url)),
);
const cacheName = `bookkeeping-${locale}-precache`;
const validationPlugins: SerwistPlugin[] = [
  {
    async cachedResponseWillBeUsed({ request, cachedResponse }) {
      // RSC is a distinct representation even if Next omits its query marker.
      return request.headers.has("RSC") ? undefined : cachedResponse;
    },
    async cacheWillUpdate({ request, response }) {
      if (request.headers.has("RSC")) return null;
      if (new URL(request.url).pathname === shell) {
        const html = await response.clone().text();
        if (
          response.status !== 200 ||
          !response.headers.get("content-type")?.includes("text/html") ||
          !html.includes('data-bookkeeping-offline-shell="true"') ||
          [...html.matchAll(/\/_next\/static\/[^"\s<>\\]+/g)].some(
            ([url]) => !assetUrls.has(url),
          )
        ) {
          // Never announce readiness for a redirect/error or mixed deployment.
          throw new Error("Bookkeeping shell does not match this deployment");
        }
      }
      return response.status === 200 ? response : null;
    },
  },
];

const serwist = new Serwist({
  precacheEntries: [...entries, { url: shell, revision: BOOKKEEPING_BUILD_ID }],
  precacheOptions: {
    cacheName,
    // Icon revisions in metadata must still resolve to the content-hashed entry.
    ignoreURLParametersMatching: [/^v$/],
    plugins: validationPlugins,
  },
  // An update waits until all controlled windows close, protecting open drafts
  // and keeping the previous build's chunks available to its existing tabs.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
});

serwist.registerCapture(
  ({ request, url, sameOrigin }) =>
    sameOrigin &&
    request.mode === "navigate" &&
    readBookkeepingRoute(url.pathname)?.locale === locale,
  serwist.createHandlerBoundToUrl(new URL(shell, self.location.origin).href),
);

// Imported artwork lives in IndexedDB. Remove only the retired built-in GIF cache.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete(`bookkeeping-${locale}-animations`));
});

// Next can still request RSC on language changes or external entry. Never feed
// document HTML into the RSC decoder, or cache account/API/auth responses.
// A failed network RSC request falls back to a document navigation in Next.
serwist.addEventListeners();

// Serwist's ordinary precache network fallback only repairs entries with SRI.
// Use its CacheFirst strategy with the versioned key and the same validation
// for an explicit repair, and wait for cache writes before reporting readiness.
const repair = new CacheFirst({
  cacheName,
  plugins: [
    ...validationPlugins,
    {
      async cacheKeyWillBeUsed({ request }) {
        return serwist.getPrecacheKeyForUrl(request.url) ?? request.url;
      },
    },
  ],
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "BOOKKEEPING_PREPARE" || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      try {
        for (const url of serwist.getPrecachedUrls()) {
          if (!(await serwist.matchPrecache(url))) {
            // Recover entries evicted by the browser without touching IndexedDB.
            await Promise.all(
              repair.handleAll({
                event,
                request: new Request(url),
                url: new URL(url),
              }),
            );
            if (!(await serwist.matchPrecache(url)))
              throw new Error("Offline cache repair failed");
          }
        }
        event.ports[0].postMessage({ ready: true });
      } catch {
        event.ports[0].postMessage({ ready: false });
      }
    })(),
  );
});
