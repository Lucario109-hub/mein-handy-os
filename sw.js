const CACHE = 'mos-v9';
const FILES = [
  './', 
  './index.html', 
  './manifest.json',
  'https://dicebear.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => { 
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE) return caches.delete(key);
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request).then(fetchRes => {
        return caches.open(CACHE).then(cache => {
          cache.put(e.request, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => caches.match('./index.html'))
  );
});
