const CACHE = "terminal-007";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then(cache => cache.addAll(FILES)),
    self.skipWaiting()
  ]));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate" || new URL(event.request.url).pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(event.request).then(async response => {
        if (!response.ok) throw new Error("Navigation request failed");
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
        return response;
      }).catch(async () =>
        await caches.match(event.request) ||
        await caches.match("./index.html") ||
        await caches.match("./")
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(async response => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    }))
  );
});
