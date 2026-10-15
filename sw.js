const CACHE = 'mos-v2';
const FILES = [
  './', 
  'index.html', 
  'manifest.json',
  'https://flaticon.com',
  'https://flaticon.com'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request).catch(()=>caches.match('index.html'))));
});
