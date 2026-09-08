'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Server,
  Activity,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Cpu,
  HeartPulse,
  Menu,
  Laptop,
} from 'lucide-react'
import { GlobalSearchDialog } from './global-search-dialog'
import { PlatformNotificationsPopover } from './platform-notifications-popover'
import { platformLogoutAction, getPlatformSessionUserAction } from '@/actions/platform-auth.actions'
import { PlatformUserRecord } from '@/lib/auth/types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { PlatformAdminUser } from '@/types/platform.types'

export function PlatformHeader() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<PlatformUserRecord | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const syncUserFromStore = () => {
    const cachedAdmins = PrintERPDataStore.get<PlatformAdminUser[]>(STORAGE_KEYS.PLATFORM_USERS)
    const owner = cachedAdmins?.find((p) => p.role === 'platform_owner') || cachedAdmins?.[0]
    if (owner) {
      setCurrentUser((prev) =>
        prev
          ? { ...prev, full_name: owner.full_name, email: owner.email }
          : {
              id: owner.id,
              user_id: owner.user_id,
              email: owner.email,
              full_name: owner.full_name,
              role: owner.role,
              is_active: owner.is_active,
              created_at: owner.created_at,
            }
      )
    }
  }

  useEffect(() => {
    syncUserFromStore()

    getPlatformSessionUserAction().then((user) => {
      if (user) {
        // Prefer cached store name if available
        const cachedAdmins = PrintERPDataStore.get<PlatformAdminUser[]>(STORAGE_KEYS.PLATFORM_USERS)
        const owner = cachedAdmins?.find((p) => p.role === 'platform_owner') || cachedAdmins?.[0]
        setCurrentUser({
          ...user,
          full_name: owner?.full_name || user.full_name,
        })
      }
    })

    const handleSync = () => {
      syncUserFromStore()
    }

    window.addEventListener('printerp_data_sync', handleSync)
    return () => window.removeEventListener('printerp_data_sync', handleSync)
  }, [])

  // Global keyboard shortcut '/' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) &&
        !['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())
      ) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    const res = await platformLogoutAction()
    router.push(res.redirectUrl || '/platform/login')
    router.refresh()
  }

  const userFullName = currentUser?.full_name || 'Platform Administrator'
  const userEmail = currentUser?.email || 'admin@printerp.com.bd'
  const userRole = currentUser?.role || 'platform_owner'

  // Extract initials (e.g. "Haji Mohammad Shamim" -> "MS")
  const nameParts = userFullName.replace(/^(Haji|Dr|Mr|Mrs|Ms)\s+/i, '').trim().split(/\s+/)
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : (userFullName.slice(0, 2) || 'PA').toUpperCase()

  const formattedRole = userRole
    .replace('platform_', '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shrink-0">
        {/* Left: Hamburger (Mobile) & Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('printerp_open_platform_nav'))}
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Open Platform Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/platform" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-1 ring-white/20 group-hover:scale-105 transition-transform shrink-0">
              <Server className="h-4 w-4" />
            </div>
            <div className="hidden xs:block sm:block">
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                PrintERP SaaS
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                  ROOT
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Platform Administration</div>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-9 px-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-between transition-all cursor-pointer shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">Search platform, companies, audit...</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-xs">
                /
              </kbd>
            </div>
          </button>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <PlatformNotificationsPopover />

          {/* System Health Pill */}
          <Link
            href="/platform/health"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-900/30 transition-colors"
            title="System Cluster Operational (BD-Central)"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cluster Operational</span>
          </Link>

          {/* Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 text-xs divide-y divide-slate-800 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-3 py-2">
                    <div className="font-bold text-white truncate">{userFullName}</div>
                    <div className="text-[11px] text-indigo-400 font-mono truncate">{userEmail}</div>
                    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {formattedRole}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/platform/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Profile</span>
                    </Link>

                    <Link
                      href="/platform/security"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Shield className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Security & MFA</span>
                    </Link>

                    <Link
                      href="/platform/security#sessions"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Laptop className="h-3.5 w-3.5 text-purple-400" />
                      <span>Active Sessions</span>
                    </Link>

                    <Link
                      href="/platform/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Cpu className="h-3.5 w-3.5 text-amber-400" />
                      <span>Platform Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Secure Logout'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
