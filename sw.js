/*
  Service worker focused on resiliency:
  - Network-first navigation with timeout and offline fallback
  - Stale-while-revalidate for same-origin static assets
  - Runtime cache size control to avoid unbounded growth
*/

const SW_VERSION = "2026-02-20-v1";
const CACHE_PREFIX = "ru-site";
const PRECACHE_NAME = `${CACHE_PREFIX}-precache-${SW_VERSION}`;
const RUNTIME_NAME = `${CACHE_PREFIX}-runtime-${SW_VERSION}`;

const OFFLINE_URL = "/offline.html";
const FALLBACK_IMAGE_URL = "/assets/images/RasoulUnlimited.webp";

const NAVIGATION_TIMEOUT_MS = 7000;
const ASSET_TIMEOUT_MS = 12000;
const MAX_RUNTIME_ENTRIES = 220;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/en/index.html",
  "/security.html",
  "/en/security.html",
  OFFLINE_URL,
  "/includes/header-fa.html",
  "/includes/header-en.html",
  "/includes/footer.html",
  "/assets/js/include.min.js",
  "/assets/js/performance-helpers.min.js",
  "/assets/js/main-script-base.min.js",
  "/assets/js/main-script-fa.min.js",
  "/assets/js/main-script-en.min.js",
  "/assets/js/theme-toggle.min.js",
  "/assets/js/security-page.min.js",
  "/assets/css/design-system.min.css",
  "/assets/css/main-style-fa.min.css",
  "/assets/css/main-style-en.min.css",
  "/assets/vendor/aos/aos.min.css",
  "/assets/vendor/aos/aos.min.js",
  FALLBACK_IMAGE_URL,
  "/assets/data/security-timeline.json",
  "/.well-known/security.txt",
];

function isHttpRequest(request) {
  try {
    const protocol = new URL(request.url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function canCacheResponse(request, response) {
  if (!isSameOrigin(request)) {
    return false;
  }

  if (!response || response.status !== 200 || response.type !== "basic") {
    return false;
  }

  const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store")) {
    return false;
  }

  return true;
}

async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_NAME);
  const keys = await cache.keys();

  if (keys.length <= MAX_RUNTIME_ENTRIES) {
    return;
  }

  const overflowCount = keys.length - MAX_RUNTIME_ENTRIES;
  await Promise.all(keys.slice(0, overflowCount).map((request) => cache.delete(request)));
}

async function putRuntime(request, response) {
  if (!canCacheResponse(request, response)) {
    return;
  }

  const cache = await caches.open(RUNTIME_NAME);
  await cache.put(request, response);
  await trimRuntimeCache();
}

async function fetchWithTimeout(request, timeoutMs) {
  if (typeof AbortController !== "function") {
    return fetch(request);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function precacheUrls() {
  const cache = await caches.open(PRECACHE_NAME);
  const requests = PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }));

  try {
    await cache.addAll(requests);
  } catch (err) {
    console.warn("Precache addAll failed, retrying one-by-one:", err);

    await Promise.all(
      requests.map(async (request) => {
        try {
          const response = await fetchWithTimeout(request, ASSET_TIMEOUT_MS);
          if (canCacheResponse(request, response)) {
            await cache.put(request, response.clone());
          }
        } catch (fetchErr) {
          console.warn("Failed to precache:", request.url, fetchErr);
        }
      })
    );
  }
}

function isAssetRequest(request) {
  const destination = request.destination || "";
  if (["script", "style", "image", "font", "manifest"].includes(destination)) {
    return true;
  }

  try {
    const path = new URL(request.url).pathname;
    return (
      path.startsWith("/assets/") ||
      path.startsWith("/includes/") ||
      path.startsWith("/.well-known/")
    );
  } catch {
    return false;
  }
}

function getNavigationFallbackPath(request) {
  try {
    const path = new URL(request.url).pathname;
    return path.startsWith("/en/") ? "/en/index.html" : "/index.html";
  } catch {
    return "/index.html";
  }
}

async function handleNavigationRequest(event) {
  const request = event.request;

  const preloadResponse = await event.preloadResponse;
  if (preloadResponse) {
    event.waitUntil(putRuntime(request, preloadResponse.clone()));
    return preloadResponse;
  }

  try {
    const networkResponse = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    event.waitUntil(putRuntime(request, networkResponse.clone()));
    return networkResponse;
  } catch {
    const runtimeMatch = await caches.match(request);
    if (runtimeMatch) {
      return runtimeMatch;
    }

    const languageFallback = await caches.match(getNavigationFallbackPath(request));
    if (languageFallback) {
      return languageFallback;
    }

    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function handleAssetRequest(event) {
  const request = event.request;
  const cached = await caches.match(request);

  const revalidatePromise = (async () => {
    try {
      const networkResponse = await fetchWithTimeout(request, ASSET_TIMEOUT_MS);
      await putRuntime(request, networkResponse.clone());
      return networkResponse;
    } catch {
      return null;
    }
  })();

  if (cached) {
    event.waitUntil(revalidatePromise);
    return cached;
  }

  const networkResponse = await revalidatePromise;
  if (networkResponse) {
    return networkResponse;
  }

  if (request.destination === "image") {
    const fallbackImage = await caches.match(FALLBACK_IMAGE_URL);
    if (fallbackImage) {
      return fallbackImage;
    }
  }

  return new Response("Resource not available", { status: 503 });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheUrls();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration && self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // Ignore navigation preload failures.
        }
      }

      const keys = await caches.keys();
      const keep = new Set([PRECACHE_NAME, RUNTIME_NAME]);

      await Promise.all(
        keys
          .filter((key) => {
            const isCurrent = keep.has(key);
            const isManaged =
              key.startsWith(`${CACHE_PREFIX}-`) ||
              key.startsWith("ru-security-precache-") ||
              key.startsWith("ru-security-runtime-");
            return isManaged && !isCurrent;
          })
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (!isHttpRequest(request)) {
    return;
  }

  if (request.headers.has("range")) {
    return;
  }

  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  if (!isSameOrigin(request)) {
    return;
  }

  const accept = request.headers.get("accept") || "";
  const isNavigation = request.mode === "navigate" || accept.includes("text/html");

  if (isNavigation) {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (isAssetRequest(request)) {
    event.respondWith(handleAssetRequest(event));
  }
});