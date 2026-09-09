'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export function SettingsNav() {
  const pathname = usePathname()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'app'

  const links = [
    {
      title: 'Company Profile',
      titleBn: 'প্রতিষ্ঠান তথ্য',
      href: `/${slug}/settings/company`,
      icon: Building2,
    },
    {
      title: 'Branding & Theme',
      titleBn: 'ব্র্যান্ডিং ও লোগো',
      href: `/${slug}/settings/branding`,
      icon: Palette,
    },
    {
      title: 'Localization & Formats',
      titleBn: 'ভাষা ও মুদ্রা',
      href: `/${slug}/settings/localization`,
      icon: Globe2,
    },
    {
      title: 'Tax & NBR BIN/TIN',
      titleBn: 'ট্যাক্স ও ভ্যাট',
      href: `/${slug}/settings/tax`,
      icon: FileCheck2,
    },
    {
      title: 'Document Numbering',
      titleBn: 'ডকুমেন্ট নাম্বারিং',
      href: `/${slug}/settings/document-numbering`,
      icon: Hash,
    },
    {
      title: 'Branches & Hubs',
      titleBn: 'শাখা ও কারখানা',
      href: `/${slug}/settings/branches`,
      icon: GitBranch,
    },
    {
      title: 'Notifications & SMS',
      titleBn: 'নোটিফিকেশন ও এসএমএস',
      href: `/${slug}/settings/notifications`,
      icon: Bell,
    },
    {
      title: 'Email Gateway',
      titleBn: 'ইমেইল গেটওয়ে',
      href: `/${slug}/settings/email`,
      icon: Mail,
    },
    {
      title: 'Team Users',
      titleBn: 'টিম মেম্বার',
      href: `/${slug}/settings/users`,
      icon: Users,
    },
    {
      title: 'Roles & Matrix',
      titleBn: 'অনুমতি ম্যাট্রিক্স',
      href: `/${slug}/settings/roles`,
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1 pb-px scrollbar-none mb-6">
      {links.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950/20'
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
