const cacheName = 'ndani-offline-v1';
const offlinePage = '/ndani/offline.html';
const farmerPages = new Set(['/pilot-login', '/virtual-ndani', '/farm-assistant',
  '/farm-check-in', '/farm-timeline', '/virtual-ndani/reading']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.add(offlinePage)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('ndani-offline-') && key !== cacheName)
      .map(key => caches.delete(key))
  )));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate'
    || url.origin !== self.location.origin || !farmerPages.has(url.pathname)) return;

  // Cache only the public offline message. Keep sign-in and farm data network-only.
  event.respondWith(fetch(request).catch(async () =>
    (await caches.match(offlinePage)) ?? Response.error()
  ));
});
