const CACHE = 'aog-v4';
const FILES = [
  '/',
  '/index.html',
  '/maintenance.html',
  '/gas.html',
  '/electrical.html',
  '/ts-checklist.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Network first for HTML files so updates are always picked up
  if (e.request.destination === 'document' || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache first for everything else
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return response;
          })
          .catch(() => caches.match('/index.html'));
      })
  );
});

// Force update when message received
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
