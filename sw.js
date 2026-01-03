/* Service Worker Cache Strategy with Dynamic Versioning
   - Update ASSET_VERSION when pushing significant changes to ensure old caches are cleared
*/
const ASSET_VERSION = "2025-11-20-v4"; // Bumped to invalidate old caches

// Separate caches: precache vs runtime
const PRECACHE_NAME = `ru-security-precache-${ASSET_VERSION}`;
const RUNTIME_NAME = `ru-security-runtime-${ASSET_VERSION}`;

// Asset endpoints to precache (same-origin)
const URLS = [
  "/",
  "/security.html",
  "/en/security.html",
  "/assets/js/security-page.min.js",
  "/assets/js/main-script-base.min.js",
  "/assets/js/main-script-fa.min.js",
  "/assets/js/main-script-en.min.js",
  "/assets/js/theme-toggle.min.js",
  "/assets/css/design-system.min.css",
  "/assets/css/main-style-fa.min.css",
  "/assets/css/main-style-en.min.css",
  "/assets/vendor/aos/aos.min.css",
  "/assets/vendor/aos/aos.min.js",
  "/assets/images/RasoulUnlimited.webp",
  "/assets/data/security-timeline.json",
  "/.well-known/security.txt"
];

// Simple offline HTML fallback (inline)
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:2rem;max-width:640px;margin:0 auto;line-height:1.5}
    h1{color:#222;margin:0 0 0.75rem}
    p{color:#555;margin:0 0 1rem}
    .box{padding:1rem 1.25rem;border:1px solid #e5e5e5;border-radius:12px;background:#fafafa}
    code{background:#eee;padding:0.15rem 0.35rem;border-radius:6px}
  </style>
</head>
<body>
  <h1>Offline</h1>
  <div class="box">
    <p>This content is not available offline.</p>
    <p>Please check your internet connection and try again.</p>
  </div>
</body>
</html>`;

/**
 * Safely cache URLs with error handling
 * Uses cache: "reload" to avoid pulling stale entries from the HTTP cache.
 */
async function precacheUrls() {
  const cache = await caches.open(PRECACHE_NAME);

  // Prefer “reload” so we don’t re-cache stale browser HTTP cache responses
  const requests = URLS.map((url) => new Request(url, { cache: "reload" }));

  try {
    await cache.addAll(requests);
  } catch (err) {
    // Fallback: add URLs one by one to cache what we can
    console.warn("Cache.addAll failed, falling back to individual caching:", err);
    await Promise.all(
      requests.map((req) =>
        cache.add(req).catch((addErr) => {
          console.warn(`Failed to cache ${req.url}:`, addErr);
        })
      )
    );
  }
}

/**
 * Helper: only handle same-origin GET requests
 */
function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

/**
 * Strategy: Network-first for HTML navigations, with cache fallback.
 * Uses navigation preload response when available.
 */
async function handleHtmlRequest(event) {
  const request = event.request;

  // Use navigation preload if available (Chrome/Edge etc.)
  const preloadResponse = await event.preloadResponse;
  if (preloadResponse) {
    // Update runtime cache in background
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(RUNTIME_NAME);
        await cache.put(request, preloadResponse.clone());
      } catch {}
    })());
    return preloadResponse;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses for offline use (runtime cache)
    if (response && response.status === 200 && isSameOrigin(request)) {
      const cache = await caches.open(RUNTIME_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Fall back to caches (runtime first, then precache)
    const runtime = await caches.match(request);
    if (runtime) return runtime;

    const precached = await caches.open(PRECACHE_NAME).then((c) => c.match(request));
    if (precached) return precached;

    return new Response(OFFLINE_HTML, {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}

/**
 * Strategy: Stale-While-Revalidate for static assets
 * - Return cache immediately if exists
 * - In background fetch and update cache (runtime)
 */
async function handleAssetRequest(event) {
  const request = event.request;

  // Try runtime cache first, then precache
  const cached = await caches.match(request);
  if (cached) {
    // Update in background (best effort, same-origin only)
    event.waitUntil((async () => {
      try {
        if (!isSameOrigin(request)) return;
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) {
          const cache = await caches.open(RUNTIME_NAME);
          await cache.put(request, fresh.clone());
        }
      } catch {}
    })());

    return cached;
  }

  // Not cached → fetch and cache
  try {
    const response = await fetch(request);

    // Cache successful same-origin responses (runtime)
    if (response && response.status === 200 && isSameOrigin(request)) {
      const cache = await caches.open(RUNTIME_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    // Fallbacks
    if (request.destination === "image") {
      // Try precached fallback image
      const fallback = await caches.open(PRECACHE_NAME).then((c) => c.match("/assets/images/RasoulUnlimited.webp"));
      return fallback || new Response("Image not found", { status: 404 });
    }
    return new Response("Resource not available", { status: 503 });
  }
}

// Install event: precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheUrls();
      // Activate new SW immediately
      await self.skipWaiting();
    })()
  );
});

// Activate event: enable navigation preload + clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if supported
      if (self.registration && self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {}
      }

      const keys = await caches.keys();
      const keep = new Set([PRECACHE_NAME, RUNTIME_NAME]);

      await Promise.all(
        keys
          .filter((k) => k.startsWith("ru-security-") && !keep.has(k))
          .map((k) => {
            console.warn("Deleting old cache version:", k);
            return caches.delete(k);
          })
      );

      await self.clients.claim();
    })()
  );
});

// Optional: allow client to trigger skipWaiting (useful for “Update available” UI)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event
self.addEventListener("fetch", (event) => {
  // Only handle GET
  if (event.request.method !== "GET") return;

  const accept = event.request.headers.get("accept") || "";
  const isHtml =
    event.request.mode === "navigate" ||
    (accept.includes("text/html"));

  // Only manage same-origin HTML navigations/assets (avoid surprises with third-party requests)
  if (!isSameOrigin(event.request) && isHtml) {
    // Let the browser handle cross-origin navigations normally
    return;
  }

  if (isHtml) {
    event.respondWith(handleHtmlRequest(event));
  } else {
    event.respondWith(handleAssetRequest(event));
  }
});
