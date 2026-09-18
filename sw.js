// كۆزنەك كىنوخانىسى - Service Worker (v1.0)
const CACHE_NAME = 'koznak-cache-v1';
const VIDEO_CACHE_NAME = 'koznak-offline-videos-v1';

// دەسلەپتە يەرلىكتە تۇتۇۋالىدىغان مۇھىم ھۆججەتلەر
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/hls.js@latest'
];

// 1. ئورنىتىش (Install): بارلىق تۇراقلىق ھۆججەتلەرنى يەرلىك سىغىمغا كىرگۈزۈش
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. قوزغىتىش (Activate): كونا نۇسخىدىكى لاياقەتسىز كەشلەرنى پاكىز تازىلاش
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

// 3. تور تەلەپلىرىنى تۇتۇۋېلىش (Fetch Strategy)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // سىن ھۆججەتلىرى ۋە چۈشۈرۈلگەن سىنلار ئۈچۈن ئىستراتېگىيە
  if (
    event.request.url.includes('.mp4') || 
    event.request.url.includes('.m3u8') || 
    event.request.url.includes('archive.org/download/')
  ) {
    event.respondWith(
      caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          return new Response('تورسىز ھالەتتە سىن تېپىلمىدى', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
    return;
  }

  // Firebase ساندانى ۋە ئېقىم تەلىپى بولسا ئالدى بىلەن توردىن ئېلىش
  if (requestUrl.origin.includes('firebaseio.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // ئادەتتىكى بېكەت ھۆججەتلىرى (HTML, CSS, JS, رەسىملەر): ئالدى بىلەن كۆچمە سىغىمدىن، بولمىسا توردىن
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // پەقەت نورمال 200 قايتقان ۋە GET تەلەپلىرىنىلا ئاپتوماتىك كەش قىلىش
        if (
          !networkResponse || 
          networkResponse.status !== 200 || 
          networkResponse.type !== 'basic' ||
          event.request.method !== 'GET'
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // پۈتۈنلەي تور ئۈزۈلگەندە ۋە كەش يوق بولغاندا باش بەتكە يۆتكەش
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
