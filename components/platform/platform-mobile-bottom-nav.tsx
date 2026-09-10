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

interface NavTab {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  isAction?: boolean
  onClick?: () => void
}

export function PlatformMobileBottomNav() {
  const pathname = usePathname()

  const tabs: NavTab[] = [
    {
      label: 'Overview',
      href: '/platform',
      icon: Activity,
    },
    {
      label: 'Tenants',
      href: '/platform/tenants',
      icon: Building2,
    },
    {
      label: 'Billing',
      href: '/platform/subscriptions',
      icon: CreditCard,
    },
    {
      label: 'Health',
      href: '/platform/health',
      icon: HeartPulse,
    },
    {
      label: 'Menu',
      icon: Menu,
      isAction: true,
      onClick: () => {
        window.dispatchEvent(new Event('inkflow_open_platform_nav'))
        window.dispatchEvent(new Event('printerp_open_platform_nav'))
      },
    },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 shadow-2xl safe-area-inset-bottom"
      aria-label="Platform Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.href
            ? tab.href === '/platform'
              ? pathname === '/platform' || pathname === '/platform/dashboard'
              : pathname.startsWith(tab.href) ||
                (tab.href === '/platform/tenants' && pathname.startsWith('/platform/companies'))
            : false

          if (tab.isAction) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={tab.onClick}
                className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] text-slate-400 hover:text-white transition-colors cursor-pointer rounded-xl group"
                aria-label="Open full platform navigation menu"
              >
                <div className="p-1 rounded-lg group-hover:bg-slate-800/80 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.label}
              href={tab.href!}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition-all',
                isActive
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-all',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-xs'
                    : 'group-hover:bg-slate-800/80'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              </div>
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
