'use client'

import React, { useEffect, useState } from 'react'
import { ShieldAlert, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PlatformSupportBanner() {
  const [supportData, setSupportData] = useState<{
    targetCompanyName: string
    targetCompanySlug: string
    reason?: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check for cookie or sessionStorage flag
    const match = document.cookie.match(new RegExp('(^| )printerp_support_tenant=([^;]+)'))
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[2]))
        setSupportData(parsed)
      } catch {
        // Ignored
      }
    }
  }, [])

  const handleExitSupportMode = async () => {
    // Clear cookie
    document.cookie = 'printerp_support_tenant=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/platform/companies')
    router.refresh()
  }

  if (!supportData) return null

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg sticky top-0 z-50 border-b border-white/20 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <span className="p-1 rounded bg-black/30 text-amber-200">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <span>
          <strong className="tracking-wide uppercase font-black text-amber-100">
            Platform Support Mode:
          </strong>{' '}
          Viewing tenant <span className="underline font-bold text-white">{supportData.targetCompanyName}</span>{' '}
          {supportData.reason ? `(Reason: ${supportData.reason})` : ''}
        </span>
      </div>
      <button
        type="button"
        onClick={handleExitSupportMode}
        className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold transition-all border border-white/30 cursor-pointer shadow-sm"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Exit Support Mode</span>
      </button>
    </div>
  )
}
