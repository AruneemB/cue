// Cue Service Worker — handles push notifications

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const { title, body, actionUrl, snoozeToken } = event.data.json();

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: actionUrl, snoozeToken },
      actions: [
        { action: "open", title: "Let's go \u2192" },
        { action: "snooze", title: "Snooze 30m" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "snooze") {
    const snoozeToken = event.notification.data?.snoozeToken;
    event.waitUntil(
      fetch("/api/notify/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutes: 30, snoozeToken }),
      })
    );
  } else {
    const url = event.notification.data?.url || "/dashboard";
    event.waitUntil(clients.openWindow(url));
  }
});
