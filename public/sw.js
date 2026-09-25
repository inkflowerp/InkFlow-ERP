// ==============================================================================
// PrintERP SaaS - Service Worker Cleanup & Self-Unregistration
// Removes stale caching layers to prevent 503 intercepts on Next.js Server Actions.
// ==============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  )
})
