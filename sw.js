// كۆزنەك كىنوخانىسى - Service Worker (v3.1)
const CACHE_NAME = 'koznak-cinema-cache-v3.1';
const VIDEO_CACHE_NAME = 'koznak-offline-videos-v1';

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
          if (key !== CACHE_NAME && key !== VIDEO_CACHE_NAME) {
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

  // تورسىز فىلىملەر يەرلىك سىن سىغىمىدىن ئېلىنىدۇ
  if (req.url.includes('.mp4') || req.url.includes('archive.org/download/')) {
    event.respondWith(
      caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(req).catch(() => {
          return new Response('سىن تورسىز تېپىلمىدى', { status: 503 });
        });
      })
    );
    return;
  }

  // Firebase ئۇچۇرلىرىنى ئالدى بىلەن توردىن ئېلىش
  if (url.origin.includes('firebaseio.com')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // ئادەتتىكى بېكەت ھۆججەتلىرى
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
