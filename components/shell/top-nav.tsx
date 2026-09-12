import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CompanySelector } from './company-selector'
import { Breadcrumbs } from './breadcrumbs'
import { LanguageSwitcher } from './language-switcher'
import { NotificationsDropdown } from './notifications-dropdown'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import {
  Search,
  ChevronDown,
  Plus,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Users,
  Radio,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useRealtime } from '@/components/providers/realtime-provider'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { ConfigurableLimitType } from '@/types/subscription.types'
import { cn } from '@/lib/utils'

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { t, tBilingual } = useI18n()
  const { company, currentRole, currentUser } = useTenant()
  const { isLive, status } = useRealtime()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, isTrialExpired } = useSubscription()
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)
  const quickActionRef = useOutsideClick<HTMLDivElement>(() => setIsQuickActionOpen(false), isQuickActionOpen)

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const slug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'

  const quickActions: Array<{
    titleEn: string
    titleBn: string
    icon: any
    href: string
    color: string
    limitType?: ConfigurableLimitType
  }> = [
    {
      titleEn: 'New Quotation',
      titleBn: 'নতুন কোটেশন তৈরি',
      icon: FileSpreadsheet,
      href: `/${slug}/quotations`,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
      limitType: 'monthly_orders',
    },
    {
      titleEn: 'New Job Order',
      titleBn: 'নতুন জব অর্ডার',
      icon: ShoppingBag,
      href: `/${slug}/orders`,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50',
      limitType: 'monthly_orders',
    },
    {
      titleEn: 'Record Payment (MR)',
      titleBn: 'পেমেন্ট রিসিট (মানি রিসিট)',
      icon: CreditCard,
      href: `/${slug}/billing`,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      titleEn: 'New Customer Profile',
      titleBn: 'নতুন কাস্টমার যোগ',
      icon: Users,
      href: `/${slug}/customers`,
      color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50',
      limitType: 'max_customers',
    },
  ]

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-2 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 gap-1.5 sm:gap-2">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        <MobileNav />
        <CompanySelector />
        <div className="hidden xl:block pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Realtime Live Sync Health Indicator */}
        <div className="hidden lg:flex items-center mr-1" suppressHydrationWarning>
          {isLive ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80"
              title="Live Database Realtime Connected: Synchronized across all users & tabs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/80"
              title={`Connection State: ${status}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{status === 'connecting' || status === 'reconnecting' ? 'Syncing...' : 'Live Ready'}</span>
            </span>
          )}
        </div>

        {/* Quick Action Hub (Hidden on mobile <640px to prevent crowding with CompanySelector) */}
        <div ref={quickActionRef} className="relative shrink-0 hidden sm:block">
          <button
            type="button"
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 cursor-pointer transition-all active:scale-98 shrink-0 whitespace-nowrap min-h-[40px]"
            title="Quick operational actions (+ Quotation, + Order, + Payment)"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap bangla-text">{tBilingual('Quick Action', 'দ্রুত কাজ')}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 p-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>{tBilingual('Quick Operations', 'দ্রুত অপারেশন')}</span>
                <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-bold">Hotkey: N</span>
              </div>
              <div className="space-y-1 mt-1">
                {quickActions.map((qa) => {
                  const Icon = qa.icon
                  const limitCheck = qa.limitType ? checkCanCreate(qa.limitType) : { allowed: !isTrialExpired }
                  const isBlocked = !limitCheck.allowed || isTrialExpired

                  return (
                    <button
                      key={qa.titleEn}
                      type="button"
                      onClick={() => {
                        setIsQuickActionOpen(false)
                        if (isBlocked) {
                          if (qa.limitType) {
                            openLimitExceededModal(qa.limitType)
                          } else {
                            openUpgradeModal('business')
                          }
                          return
                        }
                        router.push(qa.href)
                      }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-xs text-left transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] cursor-pointer"
                    >
                      <div className={cn('p-1.5 rounded-lg', qa.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold">{tBilingual(qa.titleEn, qa.titleBn)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Search Button (Desktop 1280px+) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="hidden xl:flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-100/60 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0 whitespace-nowrap min-h-[40px] transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="whitespace-nowrap bangla-text font-medium">{t('common.search')}</span>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 font-mono shrink-0 shadow-xs">
            ⌘K /
          </kbd>
        </button>

        {/* Quick Search Icon Button (Mobile / Tablets under 1280px) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="xl:hidden flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 bg-slate-100/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer shrink-0 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] transition-colors"
          title="Global Search (/)"
          aria-label="Search"
        >
          <Search className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
        </button>

        <div className="hidden sm:block shrink-0">
          <LanguageSwitcher />
        </div>
        <NotificationsDropdown />
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />
        <UserMenu />
      </div>
    </header>
  )
}
