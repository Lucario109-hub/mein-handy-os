// sw.js - robust service worker for PWA (updated to precache PNG fallbacks)
const CACHE_NAME = 'mos-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(PRECACHE_URLS); } catch (err) { console.warn('Precache warning:', err); }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
    await clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const accept = req.headers.get('Accept') || '';
  const isNavigation = req.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirst(req));
  } else if (req.destination === 'image') {
    // images: cache-first
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      try { await cache.put(request, response.clone()); } catch (e) { /* ignore put errors */ }
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // navigation fallback to index.html
    const nav = await caches.match('./index.html');
    if (nav) return nav;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      try { await cache.put(request, response.clone()); } catch (e) { /* ignore put errors */ }
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}
