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
  Key,
  Mail,
  Settings,
} from 'lucide-react'
import { GlobalSearchDialog } from './global-search-dialog'
import { PlatformNotificationsPopover } from './platform-notifications-popover'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { useI18n } from '@/i18n/context'
import { platformLogoutAction, getPlatformSessionUserAction } from '@/actions/platform-auth.actions'
import { PlatformUserRecord } from '@/lib/auth/types'
import { usePlatformSettings } from '@/hooks/use-platform-settings'

export function PlatformHeader({ initialUser }: { initialUser?: PlatformUserRecord | null } = {}) {
  const { appName, appLogoUrl } = usePlatformSettings()
  const { tBilingual } = useI18n()
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<PlatformUserRecord | null>(initialUser || null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!currentUser) {
      getPlatformSessionUserAction().then((user) => {
        if (user) {
          setCurrentUser(user)
        }
      })
    }
  }, [currentUser])

  // Global keyboard shortcut '/' to open search, 'Escape' to close modals/menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false)
        setSearchOpen(false)
        return
      }
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
    try {
      const res = await platformLogoutAction()
      window.location.replace(res.redirectUrl || '/platform/login')
    } catch {
      window.location.replace('/platform/login')
    }
  }

  const userFullName = currentUser?.full_name || 'Platform Administrator'
  const userEmail = currentUser?.email || ''
  const userRole = currentUser?.role || 'platform_readonly'

  // Extract initials (e.g. "Md. Shahidur Rahman" -> "SR")
  const nameParts = userFullName.replace(/^(Md\.|Haji|Dr|Mr|Mrs|Ms)\s+/i, '').trim().split(/\s+/)
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
      <header className="h-16 border-b border-border bg-card px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shrink-0">
        {/* Left: Hamburger (Mobile) & Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event('printflow_open_platform_nav'))
            }}
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground hover:bg-muted/80 border border-border cursor-pointer min-h-11 min-w-11"
            aria-label="Open Platform Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/platform" className="flex items-center gap-2 sm:gap-2.5 group">
            {appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt={appName}
                className="h-8 w-8 rounded-lg object-contain bg-muted border border-border p-1 shadow-xs shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                <Server className="h-4 w-4" />
              </div>
            )}
            <div className="hidden xs:block sm:block">
              <div className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                {appName} SaaS
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary tabular-nums font-bold border border-primary/20">
                  ROOT
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {tBilingual('Control Center', 'কন্ট্রোল সেন্টার')}
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-1 sm:mx-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-9 px-2.5 sm:px-3 rounded-lg bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-xs flex items-center justify-between transition-all cursor-pointer min-h-9"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate hidden sm:inline text-muted-foreground">
                {tBilingual('Search clients, staff, activity...', 'ক্লায়েন্ট বা কাজ খুঁজুন...')}
              </span>
              <span className="truncate sm:hidden text-xs text-muted-foreground">
                {tBilingual('Search...', 'খুঁজুন...')}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground bg-card border border-border rounded font-semibold shadow-xs">
                /
              </kbd>
            </div>
          </button>
        </div>

        {/* Right: Actions, Language, Theme Toggle & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Notifications */}
          <PlatformNotificationsPopover />

          {/* System Health Pill */}
          <Link
            href="/platform/health"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-surface border border-success/30 text-success text-xs font-semibold hover:opacity-90 transition-opacity"
            title={tBilingual('System OK', 'সব ঠিক আছে')}
          >
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>{tBilingual('System OK', 'সব ঠিক আছে')}</span>
          </Link>

          {/* Language Switcher */}
          <LanguageSwitcher size="sm" />

          {/* Theme Toggle (Light / Dark) */}
          <ThemeToggle variant="button" size="sm" />

          {/* Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer min-h-10"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 max-w-xs bg-popover border border-border rounded-xl shadow-md z-50 p-2 text-xs divide-y divide-border animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-3 py-2">
                    <div className="font-bold text-foreground truncate">{userFullName}</div>
                    <div className="text-xs text-muted-foreground tabular-nums truncate font-mono">{userEmail}</div>
                    <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {formattedRole}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/platform/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Profile', 'প্রোফাইল')}</span>
                    </Link>

                    <Link
                      href="/platform/security"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Security', 'নিরাপত্তা')}</span>
                    </Link>

                    <Link
                      href="/platform/support"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Support', 'সহায়তা')}</span>
                    </Link>

                    <Link
                      href="/platform/sessions"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Devices', 'ডিভাইস')}</span>
                    </Link>

                    <Link
                      href="/platform/settings/communication"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Email', 'ইমেইল')}</span>
                    </Link>

                    <Link
                      href="/platform/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tBilingual('Settings', 'সেটিংস')}</span>
                    </Link>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-destructive hover:bg-danger-surface transition-colors font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{isLoggingOut ? tBilingual('Logging out...', 'লগ আউট হচ্ছে...') : tBilingual('Log Out', 'লগ আউট')}</span>
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
