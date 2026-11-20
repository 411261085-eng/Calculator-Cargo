// Naikkan VERSION setiap kali Anda mengganti ikon atau manifest.
// File index.html sendiri otomatis diperbarui (network-first), jadi tidak perlu menaikkan versi untuk itu.
const VERSION = 'v1';
const CACHE = 'kalkulator-cargo-' + VERSION;
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Pustaka 3D dari CDN disimpan juga agar tampilan 3D tetap jalan saat offline.
    try {
      await cache.add(THREE_URL);
    } catch (_) {
      try {
        const res = await fetch(THREE_URL, { mode: 'no-cors' });
        await cache.put(THREE_URL, res);
      } catch (__) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('kalkulator-cargo-') && k !== CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(request, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res && res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (_) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(req));
  } else if (url.origin === self.location.origin || req.url === THREE_URL) {
    event.respondWith(cacheFirst(req));
  }
});
