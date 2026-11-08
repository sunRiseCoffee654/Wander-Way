/**
 * WanderWay Service Worker (PWA Offline Engine)
 * PRD v3.0 §5.10 & §5.11
 */

const CACHE_NAME = "wanderway-pwa-v1";

const PRECACHE_ASSETS = [
  "/",
  "/trips",
  "/icon.png",
  "/favicon.png",
];

// 1. Install Event: Pre-cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[sw] Pre-cache error:", err);
      })
  );
});

// 2. Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent routing and offline caching strategies
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or browser extension protocols
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. Navigation Requests (HTML pages: /trips, /trips/[tripId], /vault)
  // Network-First with Cache Fallback for offline access
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to cached root or trips page
          return (await caches.match("/trips")) || (await caches.match("/"));
        })
    );
    return;
  }

  // B. Static Assets (Fonts, Google Fonts, Images, CSS)
  // Cache-First with Network Fallback
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. API Requests (Weather, Advisories, Currency)
  // Network-First, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }
});