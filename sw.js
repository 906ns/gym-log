const CACHE = 'gym-log-v11-6';
const SHELL = ['./', './index.html', './css/style.css', './manifest.webmanifest', './data/exercises.seed.json', './js/app.js', './js/db.js', './js/lib/calc.js', './js/lib/datetime.js', './js/lib/history.js', './js/lib/id.js', './js/lib/input.js', './js/lib/migration.js', './js/lib/records.js', './js/lib/transfer.js', './js/lib/units.js', './js/lib/wakelock.js', './js/repo.js', './js/views/exercise-history.js', './js/views/home.js', './js/views/pointer.js', './js/views/session.js', './js/views/settings.js', './js/views/ui.js', './js/views/weight-control.js', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gym-log-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
