const CACHE_NAME = "community-news-prod-related-articles-1";
const ASSETS = [
  "./",
  "./index.html?v=push-prod-related-articles-1",
  "./styles.css?v=push-prod-related-articles-1",
  "./app.js?v=push-prod-related-articles-1",
  "./manifest.webmanifest",
  "./favicon.png",
  "./logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const path = url.pathname || "";
  const isGasApi = url.hostname.includes("script.google.com") || url.searchParams.has("action");
  const isConfig = path.endsWith("/config.js") || path.endsWith("config.js");
  const isHtml = event.request.mode === "navigate" || path.endsWith("/index.html");

  if (isGasApi || isConfig || isHtml) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_err) {
    payload = { title: "お知らせ", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "語り場ニュース";
  const body = payload.body || "新しいお知らせがあります。";
  const url = payload.url || "./";
  const icon = payload.icon || "./favicon.png";
  const badge = payload.badge || "./favicon.png";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
