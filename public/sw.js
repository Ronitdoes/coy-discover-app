/**
 * Coy's service worker.
 *
 * The app is a single-screen React client, so the caching strategy is small
 * and deliberate:
 * - navigations: network-first, cached app shell when offline
 * - hashed Next.js assets: network-first with a cache fallback
 * - local photos + PWA icons: cache-first
 * - API routes: never cached (swipes and matches must be live)
 */

const VERSION = "coy-pwa-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const IMAGE_CACHE = `${VERSION}-images`;

const SHELL_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // Cache entries individually so one failed request (for example a dev
      // server that is still warming up) cannot abort the whole install.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: "reload" }));
            if (response.ok) await cache.put(url, response);
          } catch {
            // Best effort: runtime caching will pick it up later.
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheable(response) {
  return Boolean(response && response.ok && response.type === "basic");
}

function isApiRequest(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname === "/feed" ||
    pathname === "/swipe" ||
    pathname === "/matches"
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (request.mode === "navigate") {
      const shell =
        (await cache.match("/", { ignoreSearch: true })) ||
        (await cache.match("/offline", { ignoreSearch: true }));
      if (shell) return shell;
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Mutations and the live feed must always hit the server.
  if (isApiRequest(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(networkFirst(request, ASSET_CACHE));
    return;
  }

  if (
    url.pathname.startsWith("/photos/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  }
});
