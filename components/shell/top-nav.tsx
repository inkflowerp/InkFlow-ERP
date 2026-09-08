'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CompanySelector } from './company-selector'
import { Breadcrumbs } from './breadcrumbs'
import { LanguageSwitcher } from './language-switcher'
import { NotificationsDropdown } from './notifications-dropdown'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import {
  Search,
  Shield,
  ChevronDown,
  Server,
  Check,
  Plus,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Users,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { PrimaryRole } from '@/types/rbac.types'
import { AuthService } from '@/services/auth.service'
import { cn } from '@/lib/utils'

export function TopNav() {
  const router = useRouter()
  const { t, tBilingual } = useI18n()
  const { company, currentRole, currentUser } = useTenant()
  const [isPersonaOpen, setIsPersonaOpen] = useState(false)
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)


  const slug = company?.slug || 'padma-digital'

  const quickActions = [
    {
      titleEn: 'New Quotation',
      titleBn: 'নতুন কোটেশন তৈরি',
      icon: FileSpreadsheet,
      href: `/${slug}/quotations`,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
    },
    {
      titleEn: 'New Job Order',
      titleBn: 'নতুন জব অর্ডার',
      icon: ShoppingBag,
      href: `/${slug}/orders`,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50',
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
    },
  ]

  const personas = [
    {
      role: 'owner',
      email: 'owner@padmadigital.com.bd',
      titleEn: 'Business Owner',
      titleBn: 'ব্যবসায়ের মালিক',
      route: `/${slug}/dashboard`,
      badge: 'Owner',
    },
    {
      role: 'manager',
      email: 'manager@padmadigital.com.bd',
      titleEn: 'Shop / Sales Manager',
      titleBn: 'সেলস ম্যানেজার',
      route: `/${slug}/sales`,
      badge: 'Sales',
    },
    {
      role: 'designer',
      email: 'designer@padmadigital.com.bd',
      titleEn: 'Graphic Designer',
      titleBn: 'গ্রাফিক ডিজাইনার',
      route: `/${slug}/design`,
      badge: 'Pre-Press',
    },
    {
      role: 'operator',
      email: 'operator@padmadigital.com.bd',
      titleEn: 'Machine Operator',
      titleBn: 'মেশিন অপারেটর',
      route: `/${slug}/operator`,
      badge: 'Machine',
    },
    {
      role: 'accountant',
      email: 'accountant@padmadigital.com.bd',
      titleEn: 'Accountant',
      titleBn: 'হিসাবরক্ষক',
      route: `/${slug}/billing`,
      badge: 'Finance',
    },
    {
      role: 'installer',
      email: 'delivery@padmadigital.com.bd',
      titleEn: 'Delivery Coordinator',
      titleBn: 'ডেলিভারি ও ইনস্টলেশন',
      route: `/${slug}/delivery`,
      badge: 'Dispatch',
    },
  ]

  const handleSelectPersona = async (p: typeof personas[0]) => {
    setIsPersonaOpen(false)
    const res = await AuthService.signIn(p.email, 'printerp1234')
    if (res.success) {
      router.push(p.route)
    }
  }

  const activeRoleLabel = currentRole || 'Owner'

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-2 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 gap-1.5 sm:gap-2">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
        <MobileNav />
        <CompanySelector />
        <div className="hidden xl:block pl-3 border-l border-slate-200 dark:border-slate-800 shrink-0">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Role Persona Switcher (Live isolated account switcher) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 cursor-pointer transition-colors shrink-0 whitespace-nowrap min-h-[40px]"
            title="Switch authenticated account role"
          >
            <Shield className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span className="hidden lg:inline text-purple-600/80 font-medium whitespace-nowrap">Account:</span>
            <span className="font-bold capitalize whitespace-nowrap text-[11px] sm:text-xs">
              {activeRoleLabel}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </button>

          {isPersonaOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsPersonaOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 p-2 z-50 animate-in fade-in-0">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Isolated Account:
                </div>
                <div className="space-y-1 mt-1">
                  {personas.map((p) => {
                    const isCurrent = currentRole === p.role
                    return (
                      <button
                        key={p.role}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors min-h-[44px]',
                          isCurrent
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <div>
                          <div className="font-semibold">{tBilingual(p.titleEn, p.titleBn)}</div>
                          <div className={cn('text-[10px]', isCurrent ? 'text-purple-100' : 'text-slate-400')}>
                            {p.email}
                          </div>
                        </div>
                        {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    )
                  })}

                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href="/platform-admin"
                      onClick={() => setIsPersonaOpen(false)}
                      className="flex items-center gap-2 w-full px-2.5 py-2.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 min-h-[44px]"
                    >
                      <Server className="h-3.5 w-3.5" />
                      <span>Platform Owner Portal (Root)</span>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>


        {/* Quick Action Hub */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-blue-600 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 cursor-pointer transition-colors shrink-0 whitespace-nowrap min-h-[40px]"
            title="Quick operational actions (+ Quotation, + Order, + Payment)"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap bangla-text">{tBilingual('Quick Action', 'দ্রুত কাজ')}</span>
            <ChevronDown className="h-3 w-3 opacity-80 shrink-0" />
          </button>

          {isQuickActionOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsQuickActionOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 p-2 z-50 animate-in fade-in-0">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{tBilingual('Quick Operations', 'দ্রুত অপারেশন')}</span>
                  <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Hotkey: N</span>
                </div>
                <div className="space-y-1 mt-1">
                  {quickActions.map((qa) => {
                    const Icon = qa.icon
                    return (
                      <Link
                        key={qa.titleEn}
                        href={qa.href}
                        onClick={() => setIsQuickActionOpen(false)}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-lg text-xs text-left transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
                      >
                        <div className={cn('p-1.5 rounded-md', qa.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold">{tBilingual(qa.titleEn, qa.titleBn)}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Search Button (Desktop 1280px+) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:hover:border-slate-700 cursor-pointer shrink-0 whitespace-nowrap min-h-[40px]"
        >
          <Search className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span className="whitespace-nowrap bangla-text">{t('common.search')}</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 font-mono shrink-0">
            ⌘K /
          </kbd>
        </button>

        {/* Quick Search Icon Button (Mobile / Tablets under 1280px) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('printerp_open_search'))}
          className="xl:hidden flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer shrink-0 min-h-[40px] min-w-[40px]"
          title="Global Search (/)"
          aria-label="Search"
        >
          <Search className="h-4 w-4 shrink-0" />
        </button>

        <LanguageSwitcher />
        <NotificationsDropdown />
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />
        <UserMenu />
      </div>
    </header>
  )
}
