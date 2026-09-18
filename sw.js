// كۆزنەك كىنوخانىسى - Service Worker (v2.0)
const CACHE_NAME = 'koznak-cinema-cache-v2';
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

  // سىنلار IndexedDB غا يەرلىك كىرىدىغان بولغاچقا، سىن ئېقىملىرىغا سۈزۈك يول بېرىلىدۇ
  if (req.url.includes('.mp4') || req.url.includes('.m3u8') || req.url.includes('archive.org/download/')) {
    return;
  }

  // Firebase ساندانى مەزمۇنلىرىنى ئالدى بىلەن توردىن يېڭىلاش
  if (url.origin.includes('firebaseio.com')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ئادەتتىكى بەت بايلىقلىرى (HTML, CSS, Fonts) ئالدى بىلەن كۆچمە سىغىمدىن ئېلىنىدۇ
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || req.method !== 'GET') {
          return networkResponse;
        }
        const toCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, toCache));
        return networkResponse;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
