'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings,
  Mail,
  Layers,
  Shield,
  Users,
  Sliders,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function PlatformSettingsNav() {
  const pathname = usePathname()

  const tabs = [
    {
      title: 'General & Disaster Recovery',
      href: '/platform/settings',
      icon: Settings,
      exact: true,
    },
    {
      title: 'Email Gateway & Delivery',
      href: '/platform/settings/communication',
      icon: Mail,
      badge: 'SMTP / Cloud',
    },
    {
      title: 'Integrations & Webhooks',
      href: '/platform/integrations',
      icon: Layers,
    },
    {
      title: 'Security Center',
      href: '/platform/security',
      icon: Shield,
    },
    {
      title: 'Platform Admins',
      href: '/platform/admins',
      icon: Users,
    },
    {
      title: 'RBAC & Permissions',
      href: '/platform/permissions',
      icon: Sliders,
      badge: 'Templates',
      matches: ['/platform/permissions', '/platform/rbac'],
    },
  ]

  return (
    <div className="flex border-b border-slate-800/80 overflow-x-auto gap-2 pb-px scrollbar-none mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.matches
          ? tab.matches.some((m) => pathname === m || pathname.startsWith(m + '/'))
          : tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + '/')

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
              isActive
                ? 'bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white border-indigo-500/50 shadow-md shadow-indigo-600/20 font-bold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 hover:border-slate-700'
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
              )}
            />
            <span>{tab.title}</span>
            {tab.badge && (
              <span
                className={cn(
                  'text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                )}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
