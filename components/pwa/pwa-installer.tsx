'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    // Android/Desktop Chrome install prompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Register Service Worker in production only, cleanup in development
    if ('serviceWorker' in navigator) {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'

      if (process.env.NODE_ENV === 'production' && !isLocalhost) {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.debug('SW registration error:', err))
      } else {
        // In local development, unregister any existing service workers to avoid intercepting dev server requests
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        }).catch(() => {})
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  if (installed || !showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-white">Install PrintERP App</p>
            <p className="text-slate-400 text-[11px]">
              {isIOS ? 'Tap Share ➔ Add to Home Screen' : 'Fast offline access from your home screen'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 font-semibold"
            >
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
          )}
          <button
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
