const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Offline – Homiework</title>
  <style>
    body { margin: 0; padding: 48px 20px; background: #e4e9f2; color: #1a2240; font-family: system-ui, -apple-system, sans-serif; }
    main { max-width: 32rem; margin: 0 auto; background: #fcfdff; border: 1px solid #b9c8e6; border-radius: 6px; padding: 28px 24px; }
    h1 { font-family: Georgia, serif; font-size: 1.5rem; margin: 0 0 8px; }
    p { color: #566078; line-height: 1.5; margin: 0; }
  </style>
</head>
<body>
  <main>
    <h1>You are offline.</h1>
    <p>Reconnect to the internet to check this week's homework or mark yourself done.</p>
  </main>
</body>
</html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {
    title: "Homiework",
    body: "Open Homiework to check this week's topic.",
    url: "/home",
    tag: "homiework",
  };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data.text() || data.body;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
