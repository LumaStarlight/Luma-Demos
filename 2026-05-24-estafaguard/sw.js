(function () {
  "use strict";

  var CACHE_NAME = "estafaguard-v1";
  var CORE_FILES = [
    "./",
    "index.html",
    "css/style.css",
    "js/app.js",
    "js/search.js",
    "js/feed.js",
    "js/alerts.js",
    "js/report.js",
    "js/monetization.js",
    "data/scams.json",
    "data/alerts.json",
    "manifest.json",
    "assets/favicon.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/og-image.png"
  ];

  function offlineResponse() {
    return new Response(
      "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>EstafaGuard offline</title><body><main style=\"font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:1rem\"><h1>EstafaGuard está sin conexión</h1><p>Algunos recursos no están disponibles ahora. Vuelve a intentarlo cuando recuperes internet.</p></main></body></html>",
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      }
    );
  }

  self.addEventListener("install", function (event) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(CORE_FILES).catch(function () {
          return Promise.all(CORE_FILES.map(function (url) {
            return cache.add(url).catch(function () {
              return undefined;
            });
          }));
        });
      }).then(function () {
        return self.skipWaiting();
      })
    );
  });

  self.addEventListener("activate", function (event) {
    event.waitUntil(
      caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }

          return undefined;
        }));
      }).then(function () {
        return self.clients.claim();
      })
    );
  });

  self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") {
      return;
    }

    event.respondWith(
      caches.match(event.request).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(function (networkResponse) {
          var responseCopy = networkResponse.clone();

          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseCopy);
          });

          return networkResponse;
        }).catch(function () {
          if (event.request.mode === "navigate") {
            return offlineResponse();
          }

          return new Response("", { status: 503, statusText: "Offline" });
        });
      })
    );
  });
})();
