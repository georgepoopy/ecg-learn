/*
 * ECG Learn service worker.
 *
 * Deliberately minimal: it makes the site installable and speeds up static
 * assets, but it NEVER intercepts page navigations or non-GET requests. The app
 * is auth'd and server-rendered, so caching HTML or touching the POST server
 * actions would serve stale/incorrect data — so we only cache immutable static
 * files (Next build assets + our icons).
 */
const CACHE = "ecg-learn-static-v1";
const PRECACHE = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // leave server actions / auth POSTs alone
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname);
  if (!isStatic) return; // navigations & data: always go to the network

  // Cache-first for immutable static assets.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }),
    ),
  );
});
