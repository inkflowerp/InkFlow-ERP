'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Workflow,
  UserCheck,
  QrCode,
  MapPin,
} from 'lucide-react'
import { getNavigationConfig } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
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
  Smartphone,
  Workflow,
  UserCheck,
  QrCode,
  MapPin,
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { tBilingual } = useI18n()


  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'
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

  return (
    <aside
      className={cn(
        'relative hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 select-none z-30 h-full max-h-full shrink-0 overflow-hidden',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header with CMYK Color Bars */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            {/* CMYK Symbol: 4 dots representing Cyan, Magenta, Yellow, Key */}
            <div className="grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 dark:bg-slate-800 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-base text-slate-900 dark:text-white leading-tight">
                Print<span className="text-blue-600">ERP</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                BD Print SaaS
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 dark:bg-slate-800">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="h-2 w-2 rounded-full bg-pink-500" />
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 overscroll-contain touch-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-slate-700">
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
                {!collapsed && (
                  <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    {sectionTitle}
                  </h4>
                )}

                {section.items.map((item) => {
                  const Icon = iconMap[item.icon] || Sparkles
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const itemTitle = tBilingual(item.title, item.titleBn)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? itemTitle : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer',
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                        )}
                      />

                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between truncate">
                          <span className="truncate">{itemTitle}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive ? 'secondary' : 'default'}
                              className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500 text-white font-bold"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
      </div>

      {/* Footer / Bengali Hotline Support & Trial Upgrade Widget */}
      {!collapsed && (
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800 space-y-2.5">
          {/* Trial / Plan Upgrade Box */}
          {isTrial ? (
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-3 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                    {tBilingual(currentPlan?.name || 'Free Trial', currentPlan?.name_bn || 'ফ্রি ট্রায়াল')}
                  </span>
                </div>
                <Badge suppressHydrationWarning className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border-amber-300 px-1 py-0 h-4">
                  {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d left`}
                </Badge>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight bangla-text">
                {tBilingual('Upgrade now to unlock unlimited orders & users.', 'আনলিমিটেড অর্ডার ও ফিচারের জন্য আপগ্রেড করুন।')}
              </p>

              <button
                type="button"
                onClick={() => openUpgradeModal('business')}
                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer bangla-text"
              >
                <Crown className="h-3 w-3 text-amber-300" />
                <span>{tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড')}</span>
              </button>
            </div>
          ) : (
            currentPlan.code !== 'enterprise' && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {tBilingual(currentPlan.name, currentPlan.name_bn)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeModal('enterprise')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline bangla-text"
                >
                  {tBilingual('Upgrade', 'আপগ্রেড')}
                </button>
              </div>
            )
          )}

          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Local Support', 'বাংলা হেল্পলাইন')}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              +880 1700-000000
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
