'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import {
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { useUnsavedChanges } from './unsaved-changes-context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModalDialog } from '@/components/shared/modal-dialog'

export interface SettingsGroupItem {
  id: string
  href: string
  aliases?: string[]
  titleEn: string
  titleBn: string
  descEn?: string
  descBn?: string
  badge?: string
}

export const SETTINGS_11_GROUPS: SettingsGroupItem[] = [
  {
    id: 'company',
    href: '/settings',
    aliases: ['/settings/company'],
    titleEn: 'Company Profile',
    titleBn: 'কোম্পানি প্রোফাইল',
    descEn: 'Corporate legal name, BIN/TIN, office address & fiscal year',
    descBn: 'কোম্পানির আইনগত নাম, বিআইএন/টিআইএন ও অফিস ঠিকানা',
  },
  {
    id: 'branches',
    href: '/settings/branches',
    titleEn: 'Branches & Outlets',
    titleBn: 'শাখা ও আউটলেট',
    descEn: 'Multi-branch physical outlets, counter locations & managers',
    descBn: 'শাখা, আউটলেট, কাউন্টার ও ব্রাঞ্চ ম্যানেজার ব্যবস্থাপনা',
  },
  {
    id: 'roles',
    href: '/settings/roles',
    aliases: ['/settings/users'],
    titleEn: 'Users & Roles (RBAC)',
    titleBn: 'ব্যবহারকারী ও পদবী',
    descEn: 'Team accounts, 7 company roles, user overrides & branch access',
    descBn: 'টিম মেম্বার, পদবী, পারমিশন ওভাররাইড ও ব্রাঞ্চ অ্যাসাইনমেন্ট',
    badge: 'Matrix',
  },
  {
    id: 'subscription',
    href: '/settings/subscription',
    titleEn: 'Subscription & Quotas',
    titleBn: 'সাবস্ক্রিপশন ও কোটা',
    descEn: 'Plan tier, active usage meters (80%/100%) & billing history',
    descBn: 'প্ল্যান টায়ার, রিসোর্স ব্যবহার মিটার ও ইনভয়েস হিস্ট্রি',
  },
  {
    id: 'branding',
    href: '/settings/branding',
    titleEn: 'Branding & Visuals',
    titleBn: 'ব্র্যান্ডিং ও লোগো',
    descEn: 'Primary logo, signature, company seal, stamps & watermarks',
    descBn: 'লোগো, সিল, স্বাক্ষর ও অফিসিয়াল ডকুমেন্ট ব্র্যান্ডিং',
  },
  {
    id: 'documents',
    href: '/settings/documents',
    titleEn: 'Print & Documents',
    titleBn: 'প্রিন্ট ও ডকুমেন্ট লেআউট',
    descEn: 'Delivery challan format, work orders & print terms',
    descBn: 'ডেলিভারি চালান, ওয়ার্ক অর্ডার ফরম্যাট ও প্রিন্ট নীতিমালা',
  },
  {
    id: 'document-numbering',
    href: '/settings/document-numbering',
    titleEn: 'Document Numbering',
    titleBn: 'ডকুমেন্ট নাম্বারিং',
    descEn: 'Sequential prefixes & formats for invoices, quotes & orders',
    descBn: 'ইনভয়েস, কোটেশন ও অর্ডারের জন্য ক্রমিক নম্বর ফরম্যাট',
  },
  {
    id: 'tax',
    href: '/settings/tax',
    titleEn: 'Tax & VAT Rates',
    titleBn: 'ট্যাক্স ও ভ্যাট রেট',
    descEn: 'NBR 15% standard VAT, printing rates, withholding & exemptions',
    descBn: 'এনবিআর ভ্যাট, প্রিন্টিং হার ও ট্যাক্স ইনভয়েস কনফিগারেশন',
  },
  {
    id: 'attendance',
    href: '/settings/attendance',
    titleEn: 'Attendance & QR',
    titleBn: 'হাজিরা ও কিউআর কোড',
    descEn: 'Work shifts, grace time, geofencing & dynamic QR tokens',
    descBn: 'কাজের শিফট, শিথিল সময়, জিওফেন্স ও কিউআর হাজিরা',
  },
  {
    id: 'communications',
    href: '/settings/whatsapp',
    aliases: ['/settings/email'],
    titleEn: 'Gateways & WhatsApp',
    titleBn: 'গেটওয়ে ও হোয়াটসঅ্যাপ',
    descEn: 'WhatsApp Cloud API / QR, SMTP, Gmail OAuth & SMS gateways',
    descBn: 'হোয়াটসঅ্যাপ সংযোগ, এসএমটিপি, জিমেইল ও এসএমএস গেটওয়ে',
  },
  {
    id: 'automations',
    href: '/settings/automations',
    aliases: ['/settings/notifications', '/settings/trash'],
    titleEn: 'Automations & Safety',
    titleBn: 'অটোমেশন ও ডেটা সুরক্ষা',
    descEn: 'Event triggers, notification rules, trash bin & tenant safety',
    descBn: 'ইভেন্ট ট্রিগার, ট্র্যাশ বিন রিটেনশন ও ডেটা সুরক্ষা গার্ড',
  },
  {
    id: 'localization',
    href: '/settings/localization',
    titleEn: 'Language & Formats',
    titleBn: 'ভাষা ও মুদ্রা',
    descEn: 'System language, number formatting and currency preferences',
    descBn: 'সিস্টেমের ভাষা, সংখ্যার বিন্যাস ও মুদ্রা সেটিংস',
  },
]

export function SettingsHubShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const { company } = useTenant()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || ''
  const { tBilingual } = useI18n()
  const { isDirty, confirmNavigation, showDiscardModal, cancelNavigation, proceedNavigation } =
    useUnsavedChanges()

  const isCurrentActive = (item: SettingsGroupItem) => {
    const target = getTenantNavHref(item.href, pathname, tenantSlug)
    if (pathname === target || pathname?.startsWith(`${target}/`)) return true
    if (item.aliases) {
      return item.aliases.some((alias) => {
        const aliasTarget = getTenantNavHref(alias, pathname, tenantSlug)
        return pathname === aliasTarget || pathname?.startsWith(`${aliasTarget}/`)
      })
    }
    return false
  }

  const activeGroup =
    SETTINGS_11_GROUPS.find((g) => isCurrentActive(g)) || SETTINGS_11_GROUPS[0]

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = getTenantNavHref(href, pathname, tenantSlug)
    if (pathname === target) return

    if (isDirty) {
      e.preventDefault()
      confirmNavigation(() => {
        router.push(target)
      })
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={getTenantNavHref('/dashboard', pathname, tenantSlug)}
            onClick={(e) => handleNavClick(e, '/dashboard')}
            className="hover:text-foreground transition-colors font-medium"
          >
            {tBilingual('Dashboard', 'ড্যাশবোর্ড')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Link
            href={getTenantNavHref('/settings', pathname, tenantSlug)}
            onClick={(e) => handleNavClick(e, '/settings')}
            className="hover:text-foreground transition-colors font-medium"
          >
            {tBilingual('Settings Hub', 'সেটিংস হাব')}
          </Link>
          {activeGroup && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-foreground">
                {tBilingual(activeGroup.titleEn, activeGroup.titleBn)}
              </span>
            </>
          )}
        </div>

        {isDirty && (
          <Badge
            variant="outline"
            className="bg-warning/10 text-warning border-warning-border/30 text-xs font-bold animate-pulse self-start sm:self-auto"
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {tBilingual('Unsaved Changes in Section', 'অসংরক্ষিত পরিবর্তন আছে')}
          </Badge>
        )}
      </div>

      {/* Main Content Area */}
      <main className="w-full min-w-0">
        {children}
      </main>

      {/* Unsaved Changes Confirmation Challenge Dialog */}
      <ModalDialog
        open={showDiscardModal}
        onOpenChange={(op) => {
          if (!op) cancelNavigation()
        }}
        title={tBilingual('Discard Unsaved Changes?', 'অসংরক্ষিত পরিবর্তন বাতিল করবেন?')}
        size="sm"
        hideFooter
      >
        <div className="space-y-4 p-4 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning-border/30 text-warning">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>
              {tBilingual(
                'You have unsaved changes in this settings section. If you navigate away without saving, your changes will be lost.',
                'এই সেকশনে আপনার অসংরক্ষিত তথ্য রয়েছে। সেভ না করে বের হলে তথ্যগুলো মুছে যাবে।'
              )}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={cancelNavigation} className="h-9">
              {tBilingual('Stay & Save', 'এখানে থাকুন ও সেভ করুন')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={proceedNavigation}
              className="h-9"
            >
              {tBilingual('Discard & Leave', 'বাতিল করে প্রস্থান করুন')}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </div>
  )
}

