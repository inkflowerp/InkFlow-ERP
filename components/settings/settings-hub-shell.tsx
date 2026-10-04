'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useParams } from 'next/navigation'
import {
  Building2,
  GitBranch,
  ShieldCheck,
  Crown,
  Palette,
  FileText,
  Hash,
  Percent,
  QrCode,
  MessageSquare,
  Workflow,
  ChevronRight,
  AlertTriangle,
  Search,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { useUnsavedChanges } from './unsaved-changes-context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalDialog } from '@/components/shared/modal-dialog'

export interface SettingsGroupItem {
  id: string
  href: string
  aliases?: string[]
  titleEn: string
  titleBn: string
  descEn: string
  descBn: string
  icon: React.ElementType
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
    icon: Building2,
  },
  {
    id: 'branches',
    href: '/settings/branches',
    titleEn: 'Branches & Outlets',
    titleBn: 'শাখা ও আউটলেট',
    descEn: 'Multi-branch physical outlets, counter locations & managers',
    descBn: 'শাখা, আউটলেট, কাউন্টার ও ব্রাঞ্চ ম্যানেজার ব্যবস্থাপনা',
    icon: GitBranch,
  },
  {
    id: 'roles',
    href: '/settings/roles',
    aliases: ['/settings/users'],
    titleEn: 'Users & Roles (RBAC)',
    titleBn: 'ব্যবহারকারী ও পদবী',
    descEn: 'Team accounts, 7 company roles, user overrides & branch access',
    descBn: 'টিম মেম্বার, পদবী, পারমিশন ওভাররাইড ও ব্রাঞ্চ অ্যাসাইনমেন্ট',
    icon: ShieldCheck,
    badge: 'Matrix',
  },
  {
    id: 'subscription',
    href: '/settings/subscription',
    titleEn: 'Subscription & Quotas',
    titleBn: 'সাবস্ক্রিপশন ও কোটা',
    descEn: 'Plan tier, active usage meters (80%/100%) & billing history',
    descBn: 'প্ল্যান টায়ার, রিসোর্স ব্যবহার মিটার ও ইনভয়েস হিস্ট্রি',
    icon: Crown,
  },
  {
    id: 'branding',
    href: '/settings/branding',
    titleEn: 'Branding & Visuals',
    titleBn: 'ব্র্যান্ডিং ও লোগো',
    descEn: 'Primary logo, signature, company seal, stamps & watermarks',
    descBn: 'লোগো, সিল, স্বাক্ষর ও অফিসিয়াল ডকুমেন্ট ব্র্যান্ডিং',
    icon: Palette,
  },
  {
    id: 'documents',
    href: '/settings/documents',
    titleEn: 'Print & Documents',
    titleBn: 'প্রিন্ট ও ডকুমেন্ট লেআউট',
    descEn: 'Delivery challan format, work orders & print terms',
    descBn: 'ডেলিভারি চালান, ওয়ার্ক অর্ডার ফরম্যাট ও প্রিন্ট নীতিমালা',
    icon: FileText,
  },
  {
    id: 'document-numbering',
    href: '/settings/document-numbering',
    titleEn: 'Document Numbering',
    titleBn: 'ডকুমেন্ট নাম্বারিং',
    descEn: 'Sequential prefixes & formats for invoices, quotes & orders',
    descBn: 'ইনভয়েস, কোটেশন ও অর্ডারের জন্য ক্রমিক নম্বর ফরম্যাট',
    icon: Hash,
  },
  {
    id: 'tax',
    href: '/settings/tax',
    titleEn: 'Tax & VAT Rates',
    titleBn: 'ট্যাক্স ও ভ্যাট রেট',
    descEn: 'NBR 15% standard VAT, printing rates, withholding & exemptions',
    descBn: 'এনবিআর ভ্যাট, প্রিন্টিং হার ও ট্যাক্স ইনভয়েস কনফিগারেশন',
    icon: Percent,
  },
  {
    id: 'attendance',
    href: '/settings/attendance',
    titleEn: 'Attendance & QR',
    titleBn: 'হাজিরা ও কিউআর কোড',
    descEn: 'Work shifts, grace time, geofencing & dynamic QR tokens',
    descBn: 'কাজের শিফট, শিথিল সময়, জিওফেন্স ও কিউআর হাজিরা',
    icon: QrCode,
  },
  {
    id: 'communications',
    href: '/settings/whatsapp',
    aliases: ['/settings/email'],
    titleEn: 'Gateways & WhatsApp',
    titleBn: 'গেটওয়ে ও হোয়াটসঅ্যাপ',
    descEn: 'WhatsApp Cloud API / QR, SMTP, Gmail OAuth & SMS gateways',
    descBn: 'হোয়াটসঅ্যাপ সংযোগ, এসএমটিপি, জিমেইল ও এসএমএস গেটওয়ে',
    icon: MessageSquare,
  },
  {
    id: 'automations',
    href: '/settings/automations',
    aliases: ['/settings/notifications', '/settings/trash'],
    titleEn: 'Automations & Safety',
    titleBn: 'অটোমেশন ও ডেটা সুরক্ষা',
    descEn: 'Event triggers, notification rules, trash bin & tenant safety',
    descBn: 'ইভেন্ট ট্রিগার, ট্র্যাশ বিন রিটেনশন ও ডেটা সুরক্ষা গার্ড',
    icon: Workflow,
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
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGroups = SETTINGS_11_GROUPS.filter((g) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      g.titleEn.toLowerCase().includes(q) ||
      g.titleBn.toLowerCase().includes(q) ||
      g.descEn.toLowerCase().includes(q) ||
      g.descBn.toLowerCase().includes(q)
    )
  })

  const isCurrentActive = (item: SettingsGroupItem) => {
    const target = getTenantNavHref(item.href, pathname, tenantSlug)
    if (pathname === target) return true
    if (item.aliases) {
      return item.aliases.some((alias) => pathname === getTenantNavHref(alias, pathname, tenantSlug))
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
            className="hover:text-foreground transition-colors font-medium"
          >
            {tBilingual('Dashboard', 'ড্যাশবোর্ড')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Link
            href={getTenantNavHref('/settings', pathname, tenantSlug)}
            className="hover:text-foreground transition-colors font-medium"
          >
            {tBilingual('Settings Hub', 'সেটিংস হাব')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-bold text-foreground">
            {tBilingual(activeGroup.titleEn, activeGroup.titleBn)}
          </span>
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

      {/* Main 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation: 11 Standardized Settings Groups */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="p-3 bg-card border border-border rounded-xl shadow-xs space-y-2.5">
            {/* Search Filter for Quick Nav */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={tBilingual('Search 11 setting groups...', 'সেটিংস খুঁজুন...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-muted border-input"
              />
            </div>

            {/* Navigation List */}
            <nav className="space-y-1" aria-label="Settings Navigation">
              {filteredGroups.map((group) => {
                const Icon = group.icon
                const active = isCurrentActive(group)
                const targetHref = getTenantNavHref(group.href, pathname, tenantSlug)

                return (
                  <Link
                    key={group.id}
                    href={targetHref}
                    onClick={(e) => handleNavClick(e, group.href)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all select-none',
                      active
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-foreground hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}
                      />
                      <span className="truncate bangla-text">
                        {tBilingual(group.titleEn, group.titleBn)}
                      </span>
                    </div>

                    {group.badge && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs py-0 px-1.5 font-bold',
                          active
                            ? 'border-primary-foreground/40 text-primary-foreground'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {group.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Quick Info Box */}
          <div className="p-3 bg-muted border border-border rounded-xl text-xs text-muted-foreground space-y-1">
            <div className="font-bold text-foreground">
              {tBilingual('Executive Control Center', 'ম্যানেজমেন্ট কন্ট্রোল সেন্টার')}
            </div>
            <p>
              {tBilingual(
                'Changes in these 11 groups are scoped strictly to your organization and enforced on the server.',
                'এই ১১টি গ্রুপের সকল কনফিগারেশন আপনার প্রতিষ্ঠানের জন্য সুনির্দিষ্ট এবং সার্ভার দ্বারা নিয়ন্ত্রিত।'
              )}
            </p>
          </div>
        </aside>

        {/* Right Section Content */}
        <main className="lg:col-span-8 xl:col-span-9 min-w-0">
          {children}
        </main>
      </div>

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
