/**
 * Service Worker — KILL SWITCH (2026-05-04).
 *
 * Old SW used cache-first for static assets, so after a frontend rebuild
 * the chunk hashes changed and the browser kept serving stale HTML
 * pointing at chunks that 404. Result: "Failed to load chunk ..." +
 * users bounced back to /login.
 *
 * This file replaces the old SW. On activate it deletes every cache and
 * unregisters itself, then forces all open tabs to reload so the page
 * comes back without an SW in the way. Caching is now handled at the
 * nginx layer (no-store for HTML, immutable for /_next/static).
 *
 * Once we are confident every active client has run this kill switch
 * (give it ~1–2 weeks), we can remove the registration block from
 * `app/layout.tsx` and delete this file.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Wipe every cache this origin owns.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Stop intercepting future requests in this scope.
      await self.registration.unregister();

      // Force every open tab to reload so they leave the SW behind.
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// Pass-through for any in-flight fetches during activation. No caching,
// no interception — just go to network.
self.addEventListener("fetch", () => {});
