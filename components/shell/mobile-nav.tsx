'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  LayoutDashboard,
  FileSpreadsheet,
  Briefcase,
  Users,
  Printer,
  Package,
  Truck,
  Receipt,
  Settings,
  ShieldCheck,
  Palette,
  Calculator,
  Layers,
  ShoppingBag,
  Wallet,
  Users2,
  BarChart3,
  MessageSquare,
  Landmark,
  FileText,
  Crown,
  Sparkles,
  Smartphone,
  Workflow,
  UserCheck,
  QrCode,
  MapPin,
  Globe2,
  Building,
} from 'lucide-react'
import { getNavigationConfig } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Sheet, SheetHeader, SheetContent, SheetFooter } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  FileSpreadsheet,
  Briefcase,
  Users,
  Printer,
  Package,
  Truck,
  Receipt,
  Settings,
  ShieldCheck,
  Palette,
  Calculator,
  Layers,
  ShoppingBag,
  Wallet,
  Users2,
  BarChart3,
  MessageSquare,
  Landmark,
  FileText,
  Crown,
  Sparkles,
  Smartphone,
  Workflow,
  UserCheck,
  QrCode,
  MapPin,
}

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { isTrial, daysRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { locale, setLocale, tBilingual } = useI18n()

  const tenantSlug = company?.slug || 'app'
  const navSections = getNavigationConfig(tenantSlug)

  const isNavItemAllowed = (href: string): boolean => {
    if (isOwner) return true
    if (href.endsWith('/dashboard') || href.endsWith('/mobile') || href.includes('/attendance')) return true

    if (href.includes('/customers')) return can('view', 'customers')
    if (href.includes('/quotations')) return can('view', 'quotations')
    if (href.includes('/orders')) return can('view', 'orders')
    if (href.includes('/sales')) return can('view', 'quotations') || can('view', 'orders') || can('view', 'customers')
    if (href.includes('/pricing')) return can('view', 'quotations') || can('create', 'orders')
    if (href.includes('/products')) return can('view', 'orders') || can('view', 'inventory')
    if (href.includes('/costing')) return can('view', 'reports') || can('view', 'orders')
    if (href.includes('/design')) return can('view', 'design')
    if (href.includes('/production') || href.includes('/operator')) return can('view', 'production')
    if (href.includes('/inventory') || href.includes('/purchases') || href.includes('/suppliers'))
      return can('view', 'inventory')
    if (href.includes('/delivery')) return can('view', 'delivery')
    if (href.includes('/billing')) return can('view', 'invoices')
    if (href.includes('/accounting')) return can('view', 'payments') || can('view', 'reports')
    if (href.includes('/reports')) return can('view', 'reports')
    if (href.includes('/settings')) return can('view', 'settings')
    if (href.includes('/hr')) return can('view', 'settings') || can('manage', 'settings')

    return true
  }

  const toggleLanguage = () => {
    if (locale === 'en') setLocale('bn')
    else setLocale('en')
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shadow-xs"
        aria-label="Open Navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen} side="left">
        <SheetHeader onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-slate-200" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  Print<span className="text-blue-600">ERP</span>
                </span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                  BD Print SaaS
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Globe2 className="h-3 w-3 text-blue-600" />
              <span>{locale === 'en' ? 'বাংলা' : 'EN'}</span>
            </button>
          </div>
        </SheetHeader>

        <SheetContent className="pb-6">
          <div className="space-y-6 py-2">
            {/* Active Company Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Building className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="block font-bold text-xs text-slate-900 dark:text-white truncate">
                    {company?.name || 'Workspace'}
                  </span>
                  <span className="block text-[10px] text-slate-400 capitalize truncate">
                    {currentPlan.name}
                  </span>
                </div>
              </div>
              {isTrial && (
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[9px] font-bold border-amber-300 shrink-0">
                  {daysRemainingInTrial}d trial
                </Badge>
              )}
            </div>

            {/* Nav Sections */}
            {navSections
              .map((section) => {
                const filteredItems = section.items.filter((item) => isNavItemAllowed(item.href))
                return { ...section, items: filteredItems }
              })
              .filter((section) => section.items.length > 0)
              .map((section, sIdx) => {
                const sectionTitle = tBilingual(section.title, section.titleBn)

                return (
                  <div key={sIdx} className="space-y-1">
                    <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {sectionTitle}
                    </h4>

                    {section.items.map((item) => {
                      const Icon = iconMap[item.icon] || Sparkles
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      const itemTitle = tBilingual(item.title, item.titleBn)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all min-h-[44px]',
                            isActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{itemTitle}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? 'secondary' : 'default'}
                              className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500 text-white font-bold shrink-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )
              })}

            {/* Trial Upgrade Widget in Mobile Menu */}
            {isTrial && (
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-3 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    <span>{tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড')}</span>
                  </span>
                  <Badge className="text-[9px] bg-amber-500 text-white font-bold">
                    {daysRemainingInTrial}d left
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    openUpgradeModal('business')
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold text-center shadow-xs cursor-pointer bangla-text min-h-[40px]"
                >
                  {tBilingual('Unlock All Features', 'সকল ফিচার আনলক করুন')}
                </button>
              </div>
            )}
          </div>
        </SheetContent>

        <SheetFooter className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="w-full text-center text-[11px] text-slate-400">
            <span>PrintERP SaaS • +880 1700-000000</span>
          </div>
        </SheetFooter>
      </Sheet>
    </div>
  )
}
