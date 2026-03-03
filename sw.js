/**
 * sw.js — GoSong Service Worker
 * Enables background audio playback and caches core assets.
 */

const CACHE = 'gosong-v1';
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/youtube.js',
    '/api.js',
    '/mobile.js',
    '/logo.png'
];

/* ── Install: cache core assets ─────────────────────────── */
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS).catch(() => { }))
    );
});

/* ── Activate: clean old caches ─────────────────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

/* ── Fetch: network-first for API, cache-first for assets ── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    /* Let audio/video streams bypass SW completely */
    if (url.hostname.includes('jamendo') || url.hostname.includes('youtube') || url.hostname.includes('googlevideo')) {
        return;
    }

    /* Network-first for API calls */
    if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
        return;
    }

    /* Cache-first for local assets */
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);
        })
    );
});
