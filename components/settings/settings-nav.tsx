'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Palette,
  Globe2,
  FileCheck2,
  Hash,
  GitBranch,
  Bell,
  Mail,
  Users,
  ShieldCheck,
  QrCode,
  FileText,
  Workflow,
  Crown,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export function SettingsNav() {
  const pathname = usePathname()
  const params = useParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const [mounted, setMounted] = useState(false)
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'rangao'

  useEffect(() => {
    setMounted(true)
  }, [])

  const links = [
    {
      title: 'Overview',
      titleBn: 'মূল সেটিংস',
      href: '/settings',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Company Profile',
      titleBn: 'প্রতিষ্ঠান তথ্য',
      href: '/settings/company',
      icon: Building2,
    },
    {
      title: 'Branding & Theme',
      titleBn: 'ব্র্যান্ডিং ও লোগো',
      href: '/settings/branding',
      icon: Palette,
    },
    {
      title: 'Localization & Formats',
      titleBn: 'ভাষা ও মুদ্রা',
      href: '/settings/localization',
      icon: Globe2,
    },
    {
      title: 'Tax & NBR BIN/TIN',
      titleBn: 'ট্যাক্স ও ভ্যাট',
      href: '/settings/tax',
      icon: FileCheck2,
    },
    {
      title: 'Document Numbering',
      titleBn: 'ডকুমেন্ট নাম্বারিং',
      href: '/settings/document-numbering',
      icon: Hash,
    },
    {
      title: 'Document Templates',
      titleBn: 'ডকুমেন্ট টেমপ্লেট',
      href: '/settings/documents',
      icon: FileText,
    },
    {
      title: 'Workflow Automations',
      titleBn: 'কাজের অটোমেশন',
      href: '/settings/automations',
      icon: Workflow,
    },
    {
      title: 'Branches & Hubs',
      titleBn: 'শাখা ও কারখানা',
      href: '/settings/branches',
      icon: GitBranch,
    },
    {
      title: 'Attendance & QR',
      titleBn: 'হাজিরা ও কিউআর',
      href: '/settings/attendance',
      icon: QrCode,
    },
    {
      title: 'Notifications & SMS',
      titleBn: 'নোটিফিকেশন ও এসএমএস',
      href: '/settings/notifications',
      icon: Bell,
    },
    {
      title: 'Email Gateway',
      titleBn: 'ইমেইল গেটওয়ে',
      href: '/settings/email',
      icon: Mail,
    },
    {
      title: 'Team Users',
      titleBn: 'টিম মেম্বার',
      href: '/settings/users',
      icon: Users,
    },
    {
      title: 'Roles & Matrix',
      titleBn: 'অনুমতি ম্যাট্রিক্স',
      href: '/settings/roles',
      icon: ShieldCheck,
    },
    {
      title: 'Subscription',
      titleBn: 'সাবস্ক্রিপশন',
      href: '/settings/subscription',
      icon: Crown,
    },
  ]

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1 pb-px scrollbar-none mb-6 touch-scroll">
      {links.map((link) => {
        const Icon = link.icon
        const cleanPath = (company?.slug && pathname?.startsWith(`/${company.slug}`))
          ? pathname.slice(`/${company.slug}`.length) || '/'
          : (pathname || '')

        let isActive = false
        if (link.exact) {
          isActive = pathname === link.href || cleanPath === link.href || cleanPath === '/settings' || pathname === `/${company?.slug}/settings`
        } else {
          isActive = pathname === link.href || cleanPath === link.href || cleanPath.startsWith(`${link.href}/`) || pathname.endsWith(link.href)
        }

        const targetHref = getTenantNavHref(link.href, pathname, tenantSlug)

        return (
          <Link
            key={link.href}
            href={targetHref}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px h-10 sm:h-9 shrink-0',
              isActive
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950/20 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tBilingual(link.title, link.titleBn)}</span>
          </Link>
        )
      })}
    </div>
  )
}

