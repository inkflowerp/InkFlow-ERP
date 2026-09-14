'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Printer,
  Plus,
  MessageSquare,
  Users,
  Briefcase,
  Receipt,
  Palette,
  Truck,
  Package,
  ShoppingBag,
  Building2,
  Building,
  BarChart3,
  Calculator,
  Landmark,
  Wallet,
  UserCheck,
  Users2,
  Cpu,
  ShieldCheck,
  Workflow,
  FileCheck2,
  FileText,
  Settings,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Headphones,
  Zap,
} from 'lucide-react'
import { getNavigationConfig, type NavItem } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useOperatorMode } from '@/hooks/use-operator-mode'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Printer,
  Plus,
  MessageSquare,
  Users,
  Briefcase,
  Receipt,
  Palette,
  Truck,
  Package,
  ShoppingBag,
  Building2,
  Building,
  BarChart3,
  Calculator,
  Landmark,
  Wallet,
  UserCheck,
  Users2,
  Cpu,
  ShieldCheck,
  Workflow,
  FileCheck2,
  FileText,
  Settings,
  Crown,
  Sparkles,
  Zap,
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showMoreInSimpleMode, setShowMoreInSimpleMode] = useState(false)
  const pathname = usePathname()
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { isSimpleMode } = useOperatorMode()
  const { hasFeature, isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { tBilingual } = useI18n()

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'
  const navSections = getNavigationConfig(tenantSlug)

  // Explicit permission and subscription feature entitlement resolution
  const isNavItemAllowed = (item: NavItem): boolean => {
    if (item.featureGate && !hasFeature(item.featureGate)) return false
    if (isOwner) return true
    if (item.ownerOnly && !isOwner) return false
    if (!item.permission) return true
    return can(item.permission.action, item.permission.resource)
  }

  // Filter sections and items based on permissions and Simple Mode
  const processedSections = navSections
    .map((section) => {
      const allowedItems = section.items.filter(isNavItemAllowed)
      return { ...section, items: allowedItems }
    })
    .filter((section) => section.items.length > 0)

  // In Simple Mode: separate daily essential items from advanced items
  const simpleSections = processedSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.simpleMode),
    }))
    .filter((section) => section.items.length > 0)

  const advancedSections = processedSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.simpleMode),
    }))
    .filter((section) => section.items.length > 0)

  const activeSectionsToRender = !isSimpleMode || showMoreInSimpleMode
    ? processedSections
    : simpleSections

  return (
    <aside
      aria-label="Tenant Navigation Sidebar"
      className={cn(
        'relative hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 select-none z-30 h-full max-h-full shrink-0 overflow-hidden',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header with CMYK Color Indicator */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        {!collapsed ? (
          <Link
            href={`/${tenantSlug}/dashboard`}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-0.5"
          >
            {/* CMYK Symbol: 4 distinct printing dots */}
            <div className="grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 dark:bg-slate-800 shadow-xs group-hover:scale-105 transition-transform">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black tracking-tight text-base text-slate-900 dark:text-white leading-tight">
                Ink<span className="text-blue-600">Flow</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Print ERP
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href={`/${tenantSlug}/dashboard`}
            className="mx-auto grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 dark:bg-slate-800 hover:scale-105 transition-transform cursor-pointer"
            title="InkFlow ERP Dashboard"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="h-2 w-2 rounded-full bg-pink-500" />
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="h-2 w-2 rounded-full bg-slate-200" />
          </Link>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-5 overscroll-contain touch-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-slate-700">
        {activeSectionsToRender.map((section) => {
          const sectionTitle = tBilingual(section.title, section.titleBn)

          return (
            <div key={section.id} className="space-y-1">
              {!collapsed && (
                <h4 className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 bangla-text">
                  {sectionTitle}
                </h4>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon] || Sparkles
                  const isActive = pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== `/${tenantSlug}`)
                  const itemTitle = tBilingual(item.title, item.titleBn)
                  const isPrimary = item.isPrimaryAction

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      title={collapsed ? `${item.title} (${item.titleBn})` : undefined}
                      aria-label={`${item.title} - ${item.titleBn}`}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer bangla-text min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        isPrimary
                          ? isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400'
                            : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white font-bold hover:from-blue-600 hover:to-indigo-600 shadow-sm shadow-blue-500/20 active:scale-98'
                          : isActive
                          ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                          isPrimary || isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                        )}
                      />

                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between truncate min-w-0">
                          <span className="truncate">{itemTitle}</span>
                          {item.badge && (
                            <Badge
                              variant={isActive || isPrimary ? 'secondary' : 'default'}
                              className={cn(
                                'text-2xs px-2 py-0.5 h-4.5 font-bold shrink-0 ml-1.5',
                                item.badgeVariant === 'live'
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : item.badgeVariant === 'fast'
                                  ? 'bg-emerald-400 text-slate-950 font-black'
                                  : item.badgeVariant === 'pro'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-500 text-white'
                              )}
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
            </div>
          )
        })}

        {/* Simple Mode "More / Advanced" Expansion Toggle */}
        {isSimpleMode && !collapsed && advancedSections.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowMoreInSimpleMode(!showMoreInSimpleMode)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer bangla-text min-h-[36px]"
              aria-expanded={showMoreInSimpleMode}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  {showMoreInSimpleMode
                    ? tBilingual('Show Less', 'কম মেনু দেখুন')
                    : tBilingual('More Modules', 'আরও মেনু দেখুন')}
                </span>
              </div>
              {showMoreInSimpleMode ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer / Support Hotline & Trial Upgrade Widget */}
      {!collapsed && (
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800 space-y-2">
          {/* Trial / Plan Upgrade Box */}
          {isTrial ? (
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-2.5 border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate bangla-text">
                    {tBilingual(currentPlan?.name || 'Free Trial', currentPlan?.name_bn || 'ফ্রি ট্রায়াল')}
                  </span>
                </div>
                <Badge suppressHydrationWarning className="text-2xs bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border-amber-300 px-1.5 py-0.2 shrink-0">
                  {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d left`}
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => openUpgradeModal('business')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all cursor-pointer bangla-text"
              >
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                <span>{tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড')}</span>
              </button>
            </div>
          ) : (
            currentPlan.code !== 'enterprise' && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate bangla-text">
                    {tBilingual(currentPlan.name, currentPlan.name_bn)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeModal('enterprise')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bangla-text cursor-pointer shrink-0"
                >
                  {tBilingual('Upgrade', 'আপগ্রেড')}
                </button>
              </div>
            )
          )}

          {/* Support Desk Link */}
          <Link
            href={`/${tenantSlug}/support`}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/90 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Headphones className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate bangla-text">
                  {tBilingual('Help & Support', 'সহায়তা ও সাপোর্ট')}
                </p>
                <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {company?.phone || '24/7 Live Desk'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
          </Link>
        </div>
      )}
    </aside>
  )
}
