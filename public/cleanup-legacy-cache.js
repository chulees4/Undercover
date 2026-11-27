/* global self, caches */
const legacyCacheName = 'undercover-vn-v1.1.0';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (!(await caches.has(legacyCacheName))) return;
      const legacy = await caches.open(legacyCacheName);
      const entries = await legacy.keys();
      const scope = self.registration.scope;
      const files = new Set([
        '',
        'index.html',
        'manifest.json',
        'assets/icons/icon.svg',
        'assets/icons/icon-maskable.svg',
        'src/css/tokens.css',
        'src/css/layout.css',
        'src/css/components.css',
        'src/css/phases.css',
        'src/data/words.js',
        'src/data/avatars.js',
        'src/js/main.js',
        'src/js/core/storage.js',
        'src/js/core/utils.js',
        'src/js/core/audio.js',
        'src/js/core/state.js',
        'src/js/core/wordManager.js',
        'src/js/core/router.js',
        'src/js/ui/feedback.js',
        'src/js/ui/confetti.js',
        'src/js/ui/customWordsModal.js',
        'src/js/engine/gameInit.js',
        'src/js/phases/setup.js',
        'src/js/phases/distribute.js',
        'src/js/phases/describe.js',
        'src/js/phases/voting.js',
        'src/js/phases/elimination.js',
        'src/js/phases/endgame.js',
      ]);
      await Promise.all(
        entries
          .filter(
            ({ url }) =>
              url.startsWith(scope) && files.has(url.slice(scope.length)),
          )
          .map((request) => legacy.delete(request)),
      );
      // This legacy name was shared by installations at different base paths.
      // Keep the cache container so activating here cannot delete another scope.
    })().catch(() => {}),
  );
});
