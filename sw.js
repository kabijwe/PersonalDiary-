// Kabijwe service worker.
// - App shell (same-origin only) is NETWORK-FIRST so a new app.js/panchang.js is picked up on the next
//   online visit; the cache is only an offline fallback.
// - Cross-origin requests (Trisambat, Open-Meteo, Nominatim) are never cached here, so weather and
//   dates can never be served stale from this cache. Pages cache their own data with timestamps.
const CACHE = "kabijwe-shell-v8";
const CORE = ["./", "./index.html", "./styles.css", "./panchang.js", "./app.js", "./manifest.webmanifest", "./icons/icon.svg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
