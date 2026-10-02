'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Building2,
  CreditCard,
  HeartPulse,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

interface NavTab {
  labelEn: string
  labelBn: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  isAction?: boolean
  onClick?: () => void
}

export function PlatformMobileBottomNav() {
  const pathname = usePathname()
  const { locale, tBilingual } = useI18n()

  const tabs: NavTab[] = [
    {
      labelEn: 'Overview',
      labelBn: 'সারসংক্ষেপ',
      href: '/platform',
      icon: Activity,
    },
    {
      labelEn: 'Clients',
      labelBn: 'ক্লায়েন্ট',
      href: '/platform/tenants',
      icon: Building2,
    },
    {
      labelEn: 'Bills',
      labelBn: 'বিল',
      href: '/platform/billing',
      icon: CreditCard,
    },
    {
      labelEn: 'Health',
      labelBn: 'স্বাস্থ্য',
      href: '/platform/health',
      icon: HeartPulse,
    },
    {
      labelEn: 'Menu',
      labelBn: 'মেনু',
      icon: Menu,
      isAction: true,
      onClick: () => {
        window.dispatchEvent(new Event('printerp_open_platform_nav'))
      },
    },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-1 shadow-xs safe-area-inset-bottom"
      aria-label={tBilingual('Navigation', 'মেনু')}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const label = locale === 'bn' ? tab.labelBn : tab.labelEn
          const isActive = tab.href
            ? tab.href === '/platform'
              ? pathname === '/platform' || pathname === '/platform/dashboard'
              : pathname.startsWith(tab.href) ||
                (tab.href === '/platform/tenants' && pathname.startsWith('/platform/companies'))
            : false

          if (tab.isAction) {
            return (
              <button
                key={tab.labelEn}
                type="button"
                onClick={tab.onClick}
                className="flex flex-col items-center justify-center py-1 px-2 min-w-14 min-h-12 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg group"
                aria-label={label}
              >
                <div className="p-1 rounded-lg group-hover:bg-muted transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-2xs font-semibold tracking-tight mt-0.5">
                  {label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.labelEn}
              href={tab.href!}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 min-w-14 min-h-12 rounded-lg transition-all',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'group-hover:bg-muted'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              </div>
              <span className="text-2xs font-semibold tracking-tight mt-0.5">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
