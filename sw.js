const CACHE = 'quizhar-v1';
const ASSET_NAMES = ['', 'index.html', 'styles.css', 'app.js', 'manifest.json'];

self.addEventListener('install', e => {
  const base = self.registration.scope;
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSET_NAMES.map(f => base + f))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
