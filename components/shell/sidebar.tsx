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
  Scissors,
  Search,
  X,
  Globe2,
  Hash,
  GitBranch,
  Mail,
  QrCode,
  Sliders,
  Key,
  Shield,
  RotateCcw,
  Flame,
} from 'lucide-react'
import { getNavigationConfig, type NavItem, type NavSection } from '@/config/navigation.config'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ResetTenantDataModal } from './reset-tenant-data-modal'

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
  Scissors,
  Flame,
  Globe2,
  Hash,
  GitBranch,
  Mail,
  QrCode,
  Sliders,
  Key,
  Shield,
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'inkflow_sidebar_collapsed'
const EXPANDED_GROUPS_STORAGE_KEY = 'inkflow_nav_expanded_groups'
const EXPANDED_SUB_NAV_STORAGE_KEY = 'inkflow_nav_expanded_sub_nav'

export function Sidebar() {
  const pathname = usePathname()
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { hasFeature, isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { tBilingual } = useI18n()

  const [filterQuery, setFilterQuery] = useState('')
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // State of expanded group IDs
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { today: true, work: true, management: true, settings: true }
    }
    try {
      const saved = localStorage.getItem(EXPANDED_GROUPS_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {}
    return { today: true, work: true, management: true, settings: true }
  })

  // State of expanded sub-item groups (e.g. company_settings)
  const [expandedSubNav, setExpandedSubNav] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { company_settings: true }
    }
    try {
      const saved = localStorage.getItem(EXPANDED_SUB_NAV_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {}
    return { company_settings: true }
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

  // Filter sections by permissions and search query
  const processedSections = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()

    return navSections
      .map((section) => {
        const allowedItems: NavItem[] = []

        for (const item of section.items) {
          if (!isNavItemAllowed(item)) continue

          const allowedChildren = item.children?.filter(isNavItemAllowed)

          if (!q) {
            allowedItems.push({
              ...item,
              children: allowedChildren,
            })
            continue
          }

          const matchTitle = item.title.toLowerCase().includes(q)
          const matchTitleBn = item.titleBn.toLowerCase().includes(q)
          const matchKey = item.key.toLowerCase().includes(q)

          const matchedChildren = allowedChildren?.filter((child) => {
            const cTitle = child.title.toLowerCase().includes(q)
            const cTitleBn = child.titleBn.toLowerCase().includes(q)
            const cKey = child.key.toLowerCase().includes(q)
            return cTitle || cTitleBn || cKey
          })

          if (matchTitle || matchTitleBn || matchKey || (matchedChildren && matchedChildren.length > 0)) {
            allowedItems.push({
              ...item,
              children: matchedChildren && matchedChildren.length > 0 ? matchedChildren : allowedChildren,
            })
          }
        }

        return { ...section, items: allowedItems }
      })
      .filter((section) => section.items.length > 0)
  }, [navSections, isNavItemAllowed, filterQuery])

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

  // Persist sub-nav expansion state
  const toggleSubNav = useCallback((key: string) => {
    setExpandedSubNav((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(EXPANDED_SUB_NAV_STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Check whether an item is active with strict exact matching for root paths
  const isItemActive = useCallback((itemHref: string, exact?: boolean) => {
    if (!pathname) return false
    const cleanPath = (company?.slug && pathname.startsWith(`/${company.slug}`))
      ? pathname.slice(`/${company.slug}`.length) || '/'
      : pathname

    if (pathname === itemHref || cleanPath === itemHref) return true

    if (itemHref === '/settings/users' && (cleanPath === '/settings/roles' || cleanPath.startsWith('/settings/roles/'))) {
      return true
    }

    // Exact matches or /settings base must not claim child routes
    if (exact || itemHref === '/' || itemHref === '/settings') {
      return false
    }

    if (cleanPath.startsWith(`${itemHref}/`)) {
      return true
    }
    return false
  }, [pathname, company?.slug])

  // Automatically ensure active route's parent group and sub-nav are expanded
  useEffect(() => {
    if (!pathname) return
    const cleanPath = (company?.slug && pathname.startsWith(`/${company.slug}`))
      ? pathname.slice(`/${company.slug}`.length) || '/'
      : pathname

    for (const section of processedSections) {
      const hasActive = section.items.some((item) => {
        if (isItemActive(item.href, item.exact)) return true
        return item.children?.some((child) => isItemActive(child.href, child.exact))
      })

      if (hasActive && !expandedGroups[section.id]) {
        setExpandedGroups((prev) => {
          const next = { ...prev, [section.id]: true }
          try {
            localStorage.setItem(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify(next))
          } catch {}
          return next
        })
      }

      for (const item of section.items) {
        if (item.children && item.children.length > 0) {
          const hasActiveChild = item.children.some((child) => isItemActive(child.href, child.exact))
          if (hasActiveChild || (cleanPath.startsWith('/settings') && item.key === 'company_settings')) {
            setExpandedSubNav((prev) => {
              if (prev[item.key]) return prev
              const next = { ...prev, [item.key]: true }
              try {
                localStorage.setItem(EXPANDED_SUB_NAV_STORAGE_KEY, JSON.stringify(next))
              } catch {}
              return next
            })
          }
        }
      }
    }
  }, [pathname, processedSections, isItemActive, expandedGroups, company?.slug])

  return (
    <aside
      aria-label="Tenant Navigation Sidebar"
      className={cn(
        'relative hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 select-none z-30 h-full max-h-full shrink-0 overflow-hidden shadow-xs',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand Header with CMYK Color Indicator */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        {!collapsed ? (
          <Link
            href={getTenantNavHref('/dashboard', pathname, company?.slug)}
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
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                {tBilingual('Print ERP System', 'প্রিন্ট ইআরপি সফটওয়্যার')}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href={getTenantNavHref('/dashboard', pathname, company?.slug)}
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

      {/* Quick Menu Filter (Only in Expanded Sidebar) */}
      {!collapsed && (
        <div className="px-3 pt-2.5 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={tBilingual('Quick filter...', 'মেনু খুঁজুন...')}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200/80 bg-slate-50 text-slate-800 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bangla-text"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav
        aria-label="Sidebar Menu"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-3 overscroll-contain touch-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-300 dark:hover:scrollbar-thumb-slate-700"
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
                  className="w-full flex items-center justify-between px-3 py-1.5 text-2xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 cursor-pointer bangla-text group"
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

              {/* Items List */}
              {(!collapsed ? isExpanded : true) && (
                <div className="space-y-0.5 transition-all">
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon] || Sparkles
                    const isActive = isItemActive(item.href, item.exact)
                    const itemTitle = tBilingual(item.title, item.titleBn)
                    const isPrimary = item.isPrimaryAction
                    const hasChildren = item.children && item.children.length > 0
                    const isSubExpanded = expandedSubNav[item.key] ?? false
                    const isChildActive = Boolean(hasChildren && item.children!.some((child) => isItemActive(child.href, child.exact)))

                    return (
                      <div key={item.key} className="relative group/nav">
                        <div className="flex items-center">
                          <Link
                            href={getTenantNavHref(item.href, pathname, company?.slug)}
                            aria-label={`${item.title} - ${item.titleBn}`}
                            className={cn(
                              'flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer bangla-text min-h-[38px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                              isPrimary
                                ? isActive
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400'
                                  : 'bg-gradient-to-r from-blue-600/95 to-indigo-600/95 text-white font-bold hover:from-blue-600 hover:to-indigo-600 shadow-sm shadow-blue-500/20 active:scale-98'
                                : isActive
                                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20 font-semibold'
                                : isChildActive && !isActive
                                ? 'bg-blue-50 text-blue-800 font-semibold dark:bg-blue-950/40 dark:text-blue-300'
                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                              collapsed && 'justify-center px-2'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform group-hover/nav:scale-105',
                                isPrimary || isActive
                                  ? 'text-white'
                                  : isChildActive
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-400 group-hover/nav:text-slate-600 dark:group-hover/nav:text-slate-200'
                              )}
                            />

                            {!collapsed ? (
                              <div className="flex flex-1 items-center justify-between truncate min-w-0">
                                <span className="truncate">{itemTitle}</span>
                                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                                  {item.badge && (
                                    <Badge
                                      variant={isActive || isPrimary ? 'secondary' : 'default'}
                                      className={cn(
                                        'text-2xs px-2 py-0.5 h-4.5 font-bold shrink-0',
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
                                  {hasChildren && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        toggleSubNav(item.key)
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                                      title={isSubExpanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
                                    >
                                      <ChevronDown
                                        className={cn(
                                          'h-3.5 w-3.5 transition-transform duration-200',
                                          isSubExpanded ? 'rotate-180' : ''
                                        )}
                                      />
                                    </button>
                                  )}
                                </div>
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
                        </div>

                        {/* Nested Sub-Modules (Expanded Sidebar) */}
                        {!collapsed && hasChildren && (isSubExpanded || Boolean(filterQuery)) && (
                          <div className="ml-4 pl-3.5 border-l-2 border-slate-200/80 dark:border-slate-800 space-y-0.5 mt-1 animate-in fade-in-0 duration-150">
                            {item.children!.map((child) => {
                              const ChildIcon = iconMap[child.icon] || Sparkles
                              const isSubActive = isItemActive(child.href, child.exact)
                              const childTitle = tBilingual(child.title, child.titleBn)

                              return (
                                <Link
                                  key={child.key}
                                  href={getTenantNavHref(child.href, pathname, company?.slug)}
                                  aria-label={`${child.title} - ${child.titleBn}`}
                                  className={cn(
                                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer bangla-text min-h-[32px] focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
                                    isSubActive
                                      ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-500/20'
                                      : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                                  )}
                                >
                                  <ChildIcon
                                    className={cn(
                                      'h-3.5 w-3.5 shrink-0 transition-transform',
                                      isSubActive
                                        ? 'text-white'
                                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                                    )}
                                  />
                                  <span className="truncate flex-1">{childTitle}</span>
                                  {child.badge && (
                                    <Badge
                                      variant={isSubActive ? 'secondary' : 'default'}
                                      className="text-3xs px-1.5 py-0 h-4 font-bold shrink-0 ml-1"
                                    >
                                      {child.badge}
                                    </Badge>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        )}

                        {/* Collapsed Hover Flyout / Popover */}
                        {collapsed && (
                          <div className="absolute left-full top-0 ml-2.5 hidden group-hover/nav:flex flex-col z-50 animate-in fade-in-0 zoom-in-95 duration-150 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-2xl">
                            {/* Popover Header */}
                            <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate bangla-text">
                                  {itemTitle}
                                </span>
                              </div>
                              {hasChildren && (
                                <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                                  {item.children!.length} modules
                                </span>
                              )}
                            </div>

                            {/* Flyout Sub-links */}
                            {hasChildren ? (
                              <div className="py-1 max-h-[70vh] overflow-y-auto space-y-0.5 scrollbar-thin">
                                {item.children!.map((child) => {
                                  const ChildIcon = iconMap[child.icon] || Sparkles
                                  const isSubActive = isItemActive(child.href, child.exact)
                                  return (
                                    <Link
                                      key={child.key}
                                      href={getTenantNavHref(child.href, pathname, company?.slug)}
                                      className={cn(
                                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bangla-text',
                                        isSubActive
                                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                                      )}
                                    >
                                      <ChildIcon className={cn('h-3.5 w-3.5 shrink-0', isSubActive ? 'text-white' : 'text-slate-400')} />
                                      <span className="truncate flex-1">{tBilingual(child.title, child.titleBn)}</span>
                                    </Link>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="p-1">
                                <Link
                                  href={getTenantNavHref(item.href, pathname, company?.slug)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 bangla-text"
                                >
                                  <span>Open {itemTitle}</span>
                                </Link>
                              </div>
                            )}
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

        {/* Empty filter search indicator */}
        {processedSections.length === 0 && filterQuery && (
          <div className="text-center py-6 px-3">
            <p className="text-xs text-slate-400 bangla-text">{tBilingual('No matching menu items found', 'কোনো মেনু পাওয়া যায়নি')}</p>
          </div>
        )}
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
                  {timeRemainingInTrial ? (tBilingual(timeRemainingInTrial.statusBadgeEn, timeRemainingInTrial.statusBadgeBn || timeRemainingInTrial.statusBadgeEn)) : `${daysRemainingInTrial} ${tBilingual('d left', 'দিন বাকি')}`}
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
            href={getTenantNavHref('/support', pathname, company?.slug)}
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

          {/* Reset All Data Button */}
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="w-full flex items-center justify-between rounded-xl bg-rose-50/60 dark:bg-rose-950/20 px-2.5 py-1.5 border border-rose-200/80 dark:border-rose-900/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <RotateCcw className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 group-hover:rotate-[-45deg] transition-transform" />
              <span className="text-xs font-bold truncate bangla-text">
                {tBilingual('Reset All Data', 'সব ডাটা রিসেট')}
              </span>
            </div>
            <Badge className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 font-mono px-1 py-0 shrink-0">
              Zero State
            </Badge>
          </button>
        </div>
      )}

      {/* Collapsed Reset Action */}
      {collapsed && (
        <div className="shrink-0 border-t border-slate-100 p-2 dark:border-slate-800 flex justify-center">
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
            title={tBilingual('Reset All Data', 'সব তথ্য রিসেট')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ResetTenantDataModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        companyId={company?.id || ''}
        companySlug={company?.slug || ''}
        companyName={company?.name || 'Your Business'}
      />
    </aside>
  )
}

