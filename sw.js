const CACHE_NAME = 'undercover-vn-v1.1.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './src/css/tokens.css',
  './src/css/layout.css',
  './src/css/components.css',
  './src/css/phases.css',
  './src/data/words.js',
  './src/data/avatars.js',
  './src/js/core/storage.js',
  './src/js/core/utils.js',
  './src/js/core/audio.js',
  './src/js/core/state.js',
  './src/js/core/wordManager.js',
  './src/js/core/router.js',
  './src/js/ui/feedback.js',
  './src/js/ui/confetti.js',
  './src/js/ui/customWordsModal.js',
  './src/js/engine/gameInit.js',
  './src/js/phases/setup.js',
  './src/js/phases/distribute.js',
  './src/js/phases/describe.js',
  './src/js/phases/voting.js',
  './src/js/phases/elimination.js',
  './src/js/phases/endgame.js',
  './src/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
