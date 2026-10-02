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
  Server,
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
      matches: ['/platform/settings/communication', '/platform/email'],
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
    {
      title: 'Emergency Controls',
      href: '/platform/emergency',
      icon: Server,
    },
  ]

  return (
    <div className="flex border-b border-border overflow-x-auto gap-2 pb-px scrollbar-none mb-6">
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
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0',
              isActive
                ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            />
            <span>{tab.title}</span>
            {tab.badge && (
              <span
                className={cn(
                  'text-2xs px-1.5 py-0.5 rounded font-semibold shrink-0',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/10 text-primary border border-primary/20'
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
