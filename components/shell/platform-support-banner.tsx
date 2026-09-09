'use client'

import React, { useEffect, useState } from 'react'
import { ShieldAlert, LogOut, Clock, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { exitTenantSupportSessionAction } from '@/actions/platform.actions'

export function PlatformSupportBanner() {
  const [supportData, setSupportData] = useState<{
    sessionId?: string
    targetCompanyName: string
    targetCompanySlug: string
    reason?: string
    accessLevel?: string
    expiresAt?: string
  } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
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

  useEffect(() => {
    if (!supportData?.expiresAt) return

    const calculateTime = () => {
      const now = new Date().getTime()
      const expiry = new Date(supportData.expiresAt!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        handleExitSupportMode()
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${minutes}m ${seconds}s remaining`)
      }
    }

    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [supportData?.expiresAt])

  const handleExitSupportMode = async () => {
    if (isExiting) return
    setIsExiting(true)
    try {
      await exitTenantSupportSessionAction()
      document.cookie = 'printerp_support_tenant=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      router.push('/platform/support')
      router.refresh()
    } catch {
      router.push('/platform/support')
    }
  }

  if (!supportData) return null

  return (
    <aside aria-label="Support Mode Banner" className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-lg sticky top-0 z-50 border-b border-white/20 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="p-1.5 rounded-lg bg-black/30 text-amber-200 shadow-xs">
          <ShieldAlert className="h-4 w-4" />
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-black/30 text-amber-200 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider">
            SUPPORT MODE ACTIVE
          </span>
          <span>
            Tenant: <strong className="underline text-white font-bold">{supportData.targetCompanyName}</strong>
          </span>
          {supportData.accessLevel && (
            <span className="bg-black/20 text-amber-100 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
              {supportData.accessLevel.replace('_', ' ')}
            </span>
          )}
          {supportData.reason && (
            <span className="text-amber-100 hidden sm:inline">
              • Reason: <em className="not-italic text-white">&quot;{supportData.reason}&quot;</em>
            </span>
          )}
          {timeLeft && (
            <span className="inline-flex items-center gap-1 bg-black/20 text-amber-100 px-2 py-0.5 rounded text-[11px] font-mono">
              <Clock className="h-3 w-3 text-amber-300" />
              {timeLeft}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleExitSupportMode}
        disabled={isExiting}
        className="flex items-center gap-1.5 bg-black/40 hover:bg-black/70 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border border-white/30 cursor-pointer shadow-sm active:scale-95 disabled:opacity-60"
      >
        {isExiting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        <span>{isExiting ? 'Exiting...' : 'Exit Support Mode'}</span>
      </button>
    </aside>
  )
}
