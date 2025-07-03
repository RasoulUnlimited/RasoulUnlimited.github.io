const CACHE_NAME = 'ru-security-v1';
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
  '/assets/images/RasoulUnlimited.webp'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('ru-security-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});