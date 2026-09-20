'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Printer,
  Plus,
  Bell,
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
  FileSpreadsheet,
  Settings,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Headphones,
  Zap,
  Layers,
  Disc,
  Tag,
  Trash2,
} from 'lucide-react'
import { getNavigationConfig, type NavItem, type NavSection } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Printer,
  Plus,
  Bell,
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
  FileSpreadsheet,
  Settings,
  Crown,
  Sparkles,
  Zap,
  Layers,
  Disc,
  Tag,
  Trash2,
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'inkflow_sidebar_collapsed'
const EXPANDED_GROUPS_STORAGE_KEY = 'inkflow_nav_expanded_groups'

export function Sidebar() {
  const pathname = usePathname()
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { hasFeature, isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { tBilingual } = useI18n()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // State of expanded group IDs (e.g. ['today', 'work', 'materials', 'management', 'settings'])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { today: true, work: true, materials: true, management: true, settings: true }
    }
    try {
      const saved = localStorage.getItem(EXPANDED_GROUPS_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {}
    return { today: true, work: true, materials: true, management: true, settings: true }
  })

  const navSections = useMemo(() => getNavigationConfig(), [])

  // Explicit permission and feature entitlement filtering
  const isNavItemAllowed = useCallback((item: NavItem): boolean => {
    if (item.featureGate && !hasFeature(item.featureGate)) return false
    if (isOwner) return true
    if (item.ownerOnly && !isOwner) return false
    if (!item.permission) return true
    return can(item.permission.action, item.permission.resource)
  }, [hasFeature, isOwner, can])

  // Filter sections by permissions
  const processedSections = useMemo(() => {
    return navSections
      .map((section) => {
        const allowedItems = section.items.filter(isNavItemAllowed)
        return { ...section, items: allowedItems }
      })
      .filter((section) => section.items.length > 0)
  }, [navSections, isNavItemAllowed])

  // Persist sidebar collapsed state
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  // Persist group expansion state
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] }
      try {
        localStorage.setItem(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Check whether an item is active
  const isItemActive = useCallback((itemHref: string) => {
    if (!pathname) return false
    const cleanPath = (company?.slug && pathname.startsWith(`/${company.slug}`))
      ? pathname.slice(`/${company.slug}`.length) || '/'
      : pathname

    if (pathname === itemHref || cleanPath === itemHref) return true
    if (cleanPath.startsWith(`${itemHref}/`) && itemHref !== '/') {
      return true
    }
    return false
  }, [pathname, company?.slug])

  // Automatically ensure active route's parent group is expanded
  useEffect(() => {
    if (!pathname) return
    for (const section of processedSections) {
      const hasActive = section.items.some((item) => isItemActive(item.href))
      if (hasActive && !expandedGroups[section.id]) {
        setExpandedGroups((prev) => {
          const next = { ...prev, [section.id]: true }
          try {
            localStorage.setItem(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify(next))
          } catch {}
          return next
        })
      }
    }
  }, [pathname, processedSections, isItemActive])

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
            href="/dashboard"
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
            href="/dashboard"
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
          onClick={handleToggleCollapsed}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Sidebar Menu"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3 overscroll-contain touch-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-slate-700"
      >
        {processedSections.map((section) => {
          const isExpanded = expandedGroups[section.id] ?? true
          const sectionTitle = tBilingual(section.title, section.titleBn)

          return (
            <div key={section.id} className="space-y-1">
              {!collapsed ? (
                /* Collapsible Group Header Button (Expanded Sidebar) */
                <button
                  type="button"
                  onClick={() => toggleGroup(section.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 cursor-pointer bangla-text group"
                >
                  <span className="truncate">{sectionTitle}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
                  )}
                </button>
              ) : (
                /* Subtle Divider in Collapsed Sidebar */
                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1.5 mx-2" />
              )}

              {/* Items List (Toggled in expanded sidebar, always accessible via icons in collapsed sidebar) */}
              {(!collapsed ? isExpanded : true) && (
                <div className="space-y-0.5 transition-all">
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon] || Sparkles
                    const isActive = isItemActive(item.href)
                    const itemTitle = tBilingual(item.title, item.titleBn)
                    const isPrimary = item.isPrimaryAction

                    return (
                      <div key={item.key} className="relative group/nav">
                        <Link
                          href={item.href}
                          aria-label={`${item.title} - ${item.titleBn}`}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer bangla-text min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
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
                              'h-4 w-4 shrink-0 transition-transform group-hover/nav:scale-105',
                              isPrimary || isActive
                                ? 'text-white'
                                : 'text-slate-400 group-hover/nav:text-slate-600 dark:group-hover/nav:text-slate-200'
                            )}
                          />

                          {!collapsed ? (
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
                          ) : (
                            /* Collapsed Badges (Live pulse dot) */
                            item.badge && (
                              <span
                                className={cn(
                                  'absolute top-1.5 right-1.5 h-2 w-2 rounded-full',
                                  item.badgeVariant === 'live' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                                )}
                              />
                            )
                          )}
                        </Link>

                        {/* Collapsed Hover Tooltip */}
                        {collapsed && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover/nav:flex items-center z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150">
                            <div className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold shadow-xl whitespace-nowrap dark:bg-slate-800 dark:border dark:border-slate-700 bangla-text flex items-center gap-2">
                              <span>{itemTitle}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.2 rounded bg-white/20 text-2xs font-bold uppercase">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Optional Visual Separator Below Item */}
                        {item.hasDividerBelow && (
                          <div
                            className={cn(
                              'h-px bg-slate-200/80 dark:bg-slate-800/80 my-2',
                              collapsed ? 'mx-2' : 'mx-1.5'
                            )}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer / Support Desk & Subscription Upgrade Area */}
      {!collapsed && (
        <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800 space-y-2">
          {/* Plan / Upgrade Box */}
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
            currentPlan && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate bangla-text">
                      {tBilingual(currentPlan.name, currentPlan.name_bn)}
                    </span>
                  </div>
                </div>
                {currentPlan.code !== 'enterprise' && (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('enterprise')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bangla-text cursor-pointer shrink-0 ml-1.5"
                  >
                    {tBilingual('Upgrade', 'আপগ্রেড')}
                  </button>
                )}
              </div>
            )
          )}

          {/* Support Desk Link */}
          <Link
            href="/support"
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
