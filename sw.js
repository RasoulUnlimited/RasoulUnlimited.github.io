// Service Worker Cache Strategy with Dynamic Versioning
// Update ASSET_VERSION when pushing significant changes to ensure old caches are cleared
const ASSET_VERSION = '2025-01-20-v3'; // Bumped to invalidate old caches
const CACHE_NAME = `ru-security-${ASSET_VERSION}`;

const URLS = [
  '/',
  '/security.html',
  '/en/security.html',
  '/assets/js/security-page.min.js',
  '/assets/js/main-script-base.min.js',
  '/assets/js/main-script-fa.min.js',
  '/assets/js/main-script-en.min.js',
  '/assets/js/theme-toggle.min.js',
  '/assets/css/design-system.min.css',
  '/assets/css/main-style-fa.min.css',
  '/assets/css/main-style-en.min.css',
  '/assets/vendor/aos/aos.min.css',
  '/assets/vendor/aos/aos.min.js',
  '/assets/images/RasoulUnlimited.webp',
  '/assets/data/security-timeline.json',
  '/.well-known/security.txt'
];

// Install event: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Try to add all URLs. If any fail, add them individually to identify which ones failed
      return cache.addAll(URLS).catch(err => {
        // Log errors but don't fail entirely if some assets aren't available
        console.warn('Cache.addAll failed:', err);
        
        // Fallback: add URLs one by one to cache what we can
        return Promise.all(
          URLS.map(url => 
            cache.add(url).catch(addErr => {
              console.warn(`Failed to cache ${url}:`, addErr);
              // Continue even if individual cache fails
            })
          )
        );
      });
    })
  );
  // Skip waiting to activate immediately when a new version is deployed
  self.skipWaiting();
});

// Activate event: clean up old cache versions
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('ru-security-') && k !== CACHE_NAME)
            .map(k => {
              console.log('Deleting old cache version:', k);
              return caches.delete(k);
            })
        )
      ),
      self.clients.claim()
    ])
  );
});

// Fetch event: implement smart caching strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // For HTML documents, prioritize network (fresh content) with fallback to cache
  if (event.request.destination === 'document' || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses for offline use
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network is unavailable
          return caches.match(event.request) ||
            new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title><style>body{font-family:sans-serif;padding:2rem;max-width:600px;margin:0 auto}h1{color:#333}p{color:#666}</style></head><body><h1>Offline</h1><p>This content is not available offline. Please check your internet connection and try again.</p></body></html>', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/html; charset=utf-8'
              })
            });
        })
    );
  } else {
    // For assets (CSS, JS, images), use cache-first with network fallback
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .catch(() => {
          // Return a placeholder for failed image requests
          if (event.request.destination === 'image') {
            return caches.match('/assets/images/RasoulUnlimited.webp');
          }
          return new Response('Resource not available', { status: 503 });
        })
    );
  }
});
