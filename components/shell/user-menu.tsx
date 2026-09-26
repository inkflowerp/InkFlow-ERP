'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Settings, User as UserIcon, Shield, Headphones, Sun, Moon, Laptop } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from './language-switcher'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen)
  const { signOut } = useAuth()
  const { company, currentRole, currentBranch, currentUser } = useTenant()
  const { can, isOwner } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const slug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'my-company'

  const userName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'User'
  const userEmail = currentUser?.profile?.email || ''

  const roleName = currentRole ? ({
    owner: tBilingual('Owner', 'মালিক'),
    business_owner: tBilingual('Owner', 'মালিক'),
    platform_owner: tBilingual('Platform Owner', 'প্ল্যাটফর্ম মালিক'),
    admin: tBilingual('Admin', 'অ্যাডমিন'),
    manager: tBilingual('Manager', 'ম্যানেজার'),
    sales_manager: tBilingual('Sales Manager', 'বিক্রয় ব্যবস্থাপক'),
    designer: tBilingual('Designer', 'ডিজাইনার'),
    production_manager: tBilingual('Production Manager', 'উৎপাদন ব্যবস্থাপক'),
    operator: tBilingual('Operator', 'অপারেটর'),
    store_manager: tBilingual('Store Manager', 'স্টোর ম্যানেজার'),
    accountant: tBilingual('Accountant', 'হিসাবরক্ষক'),
    delivery_coordinator: tBilingual('Delivery Coordinator', 'ডেলিভারি সমন্বয়কারী'),
    general_staff: tBilingual('Staff', 'কর্মী'),
    staff: tBilingual('Staff', 'কর্মী'),
  } as Record<string, string>)[currentRole] || currentRole : tBilingual('Staff', 'কর্মী')

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
      >
        <Avatar
          fallback={userName}
          src={currentUser?.profile?.avatar_url || undefined}
          className="h-8 w-8 text-xs font-bold shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        />
        <div className="hidden 2xl:flex flex-col text-left shrink-0 whitespace-nowrap max-w-[140px]">
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap truncate bangla-text">
            {userName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap truncate bangla-text">
            {roleName} {currentBranch ? `• ${currentBranch.code || currentBranch.name.split(' ')[0]}` : ''}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate bangla-text">
              {userName}
            </p>
            {userEmail && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-xs uppercase font-semibold py-0.5 px-2 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 bangla-text">
                <Shield className="h-3 w-3 mr-1 text-blue-600" />
                {roleName}
              </Badge>
              {currentBranch && (
                <Badge variant="secondary" className="text-xs py-0.5 px-2 truncate max-w-[130px]">
                  {currentBranch.name.split('(')[0].trim()}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-0.5 py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
              onClick={() => {
                setIsOpen(false)
                router.push(getTenantNavHref('/settings/users', pathname, slug))
              }}
            >
              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              <span>{tBilingual('My Profile & Team', 'আমার প্রোফাইল ও টিম')}</span>
            </button>
            {(isOwner || can('view', 'settings')) && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
                onClick={() => {
                  setIsOpen(false)
                  router.push(getTenantNavHref('/settings/company', pathname, slug))
                }}
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>{tBilingual('Company Settings', 'প্রতিষ্ঠান সেটিংস')}</span>
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
                onClick={() => {
                  setIsOpen(false)
                  router.push(getTenantNavHref('/settings/subscription', pathname, slug))
                }}
              >
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <span>{tBilingual('Subscription & Plan', 'সাবস্ক্রিপশন ও প্ল্যান')}</span>
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
              onClick={() => {
                setIsOpen(false)
                router.push(getTenantNavHref('/support', pathname, slug))
              }}
            >
              <Headphones className="h-3.5 w-3.5 text-indigo-500" />
              <span>{tBilingual('Help & Support Desk', 'সহায়তা ও সাপোর্ট ডেস্ক')}</span>
            </button>
          </div>

          {/* Quick Language & Theme Controls */}
          <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="bangla-text font-medium">{tBilingual('Language', 'ভাষা')}</span>
            <LanguageSwitcher size="sm" />
          </div>

          <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span className="bangla-text font-medium">{tBilingual('Theme', 'থিম')}</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  theme === 'system'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="System Mode"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer bangla-text"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{tBilingual('Sign Out', 'লগ আউট')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
