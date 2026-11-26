/* Tempo — service worker : fonctionne hors ligne et se met à jour tout seul */
const VERSION = 'tempo-v4';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/core.js', 'js/data.js', 'js/perso.js', 'js/ui.js', 'js/fun.js', 'js/markdown.js', 'js/reminders.js', 'js/sync.js', 'js/journal.js',
  'js/views/dashboard.js', 'js/views/timetable.js', 'js/views/projects.js', 'js/views/gantt.js', 'js/views/tasks.js',
  'js/views/homework.js', 'js/views/calendar.js', 'js/views/focus.js', 'js/views/stats.js', 'js/views/settings.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Réseau d'abord pour nos fichiers (toujours la dernière version), cache si hors ligne
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

// Clic sur une notification : ouvre / ramène Tempo
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
