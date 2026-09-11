// ==============================================================================
// PrintERP SaaS - Service Worker (PWA & Offline-Friendly Caching)
// Provides fast loading, asset caching, and offline status handling.
// ==============================================================================

const CACHE_NAME = 'printerp-static-v2'
const STATIC_ASSETS = [
  '/manifest.json',
  '/globe.svg',
  '/file.svg',
]

// 1. Install: Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Fetch Strategy:
// For static assets: Cache First, fallback to network
// For navigations & API: Network First (never trap auth or dynamic data)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Avoid intercepting non-GET requests or browser-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return
  }

  // Never intercept local development traffic
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return
  }

  // Never intercept Supabase, auth, API, Next.js internal files, or Server Action calls
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('/_next/') ||
    request.headers.get('accept')?.includes('application/json')
  ) {
    return
  }

  // Static immutable assets: Cache First
  if (
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.includes('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => caches.match('/globe.svg'))
      })
    )
    return
  }

  // Dynamic pages / navigation: Network First, fallback to offline notice
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        // Return offline payload if completely disconnected
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - PrintERP</title><style>body{font-family:sans-serif;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:1rem;text-align:center}button{margin-top:1rem;padding:0.75rem 1.5rem;background:#06b6d4;color:#000;border:none;border-radius:0.5rem;font-weight:bold;cursor:pointer}</style></head><body><h2>Offline / সংযোগ বিচ্ছিন্ন</h2><p>PrintERP requires an active connection for real-time ERP data. Changes are queued.</p><button onclick="window.location.reload()">Retry / পুনরায় চেষ্টা করুন</button></body></html>',
          {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 503,
          }
        )
      })
  )
})
