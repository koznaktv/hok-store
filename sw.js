// كۆزنەك كىنوخانىسى - Service Worker (v3.0 Secure Offline Storage Engine)
const CACHE_NAME = 'koznak-cinema-cache-v3.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // مېدىيا تەلەپلىرى يەرلىك مەخپىي ئېقىم ئارقىلىق بىر تەرەپ قىلىنىدۇ
  if (req.url.includes('.mp4') || req.url.includes('.m3u8') || req.url.includes('archive.org/download/')) {
    return;
  }

  // Firebase ئۇچۇرلىرىنى تور ئارقىلىق يېڭىلاش
  if (url.origin.includes('firebaseio.com')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ئادەتتىكى بېكەت كۆرۈنۈشى بايلىقلىرىنى تېز يۈكلەش
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200 || req.method !== 'GET') {
          return networkRes;
        }
        const toCache = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, toCache));
        return networkRes;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
