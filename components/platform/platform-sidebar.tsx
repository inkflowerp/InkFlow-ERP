'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Building2,
  Users,
  CreditCard,
  Gauge,
  Sliders,
  Flag,
  HeartPulse,
  AlertOctagon,
  Cpu,
  Layers,
  Shield,
  FileClock,
  Settings,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Zap,
  DollarSign,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Server,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetHeader, SheetContent } from '@/components/ui/sheet'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    title: 'Platform Overview',
    items: [
      { title: 'Dashboard', href: '/platform', icon: Activity },
    ],
  },
  {
    title: 'Tenant Operations',
    items: [
      { title: 'Companies', href: '/platform/companies', icon: Building2 },
      {
        title: 'Customer Success',
        href: '/platform/customer-success',
        icon: Zap,
        badge: 'Churn Risk',
        badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      },
      { title: 'Subscriptions', href: '/platform/subscriptions', icon: CreditCard },
      { title: 'Billing & Reconciliation', href: '/platform/billing', icon: DollarSign },
      { title: 'Plans Management', href: '/platform/plans', icon: Briefcase },
      { title: 'Usage & Limits', href: '/platform/usage', icon: Gauge },
    ],
  },
  {
    title: 'Governance & Security',
    items: [
      { title: 'Support Access', href: '/platform/support', icon: ShieldAlert },
      { title: 'Platform Users', href: '/platform/users', icon: Users },
      { title: 'Platform RBAC', href: '/platform/rbac', icon: Sliders },
      { title: 'Feature Flags', href: '/platform/feature-flags', icon: Flag },
      { title: 'Security Center', href: '/platform/security', icon: Shield },
      { title: 'Platform Audit', href: '/platform/audit', icon: FileClock },
    ],
  },
  {
    title: 'Operations & Health',
    items: [
      { title: 'System Health', href: '/platform/health', icon: HeartPulse },
      {
        title: 'Incidents',
        href: '/platform/incidents',
        icon: AlertOctagon,
      },
      { title: 'Background Jobs', href: '/platform/jobs', icon: Cpu },
      { title: 'Integrations', href: '/platform/integrations', icon: Layers },
    ],
  },
  {
    title: 'System Config',
    items: [
      { title: 'Platform Settings', href: '/platform/settings', icon: Settings },
      {
        title: 'Emergency Controls',
        href: '/platform/emergency',
        icon: ShieldAlert,
        badge: 'PROTECTED',
        badgeColor: 'bg-red-950 text-red-400 border border-red-800',
      },
    ],
  },
]

export function PlatformSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load persisted collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('printerp_platform_sidebar_collapsed')
      if (saved !== null) {
        setCollapsed(saved === 'true')
      }
    } catch {
      // Ignored
    }
  }, [])

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('printerp_platform_sidebar_collapsed', String(next))
      } catch {
        // Ignored
      }
      return next
    })
  }

  // Handle global events for mobile navigation drawer
  useEffect(() => {
    const handleOpen = () => setMobileOpen(true)
    const handleClose = () => setMobileOpen(false)

    window.addEventListener('printerp_open_platform_nav', handleOpen)
    window.addEventListener('printerp_close_platform_nav', handleClose)

    return () => {
      window.removeEventListener('printerp_open_platform_nav', handleOpen)
      window.removeEventListener('printerp_close_platform_nav', handleClose)
    }
  }, [])

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SIDEBAR_SECTIONS
    const q = searchQuery.toLowerCase().trim()

    return SIDEBAR_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q))
      ),
    })).filter((sec) => sec.items.length > 0)
  }, [searchQuery])

  const renderNavList = (isMobile = false, isCollapsed = false) => {
    return (
      <div className="overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4 flex-1 min-h-0 select-none scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-700">
        {/* Quick Filter Search Input (when expanded) */}
        {!isCollapsed && (
          <div className="px-1 mb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter menu..."
                className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {filteredSections.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            No items matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {sec.title}
                </div>
              )}

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.href === '/platform'
                      ? pathname === '/platform' || pathname === '/platform/dashboard'
                      : pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/platform')

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? `${item.title}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                      onClick={() => {
                        if (isMobile) setMobileOpen(false)
                      }}
                      className={cn(
                        'flex items-center rounded-xl text-xs font-semibold transition-all group relative',
                        isCollapsed
                          ? 'justify-center p-2.5 min-h-[44px] min-w-[44px]'
                          : 'justify-between px-3 py-2 min-h-[38px]',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      )}
                    >
                      <div className={cn('flex items-center min-w-0', isCollapsed ? 'justify-center' : 'gap-2.5')}>
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                          )}
                        />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </div>

                      {/* Badge in expanded mode */}
                      {!isCollapsed && item.badge && (
                        <span
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5',
                            item.badgeColor || 'bg-indigo-500/20 text-indigo-300'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Dot badge in collapsed mode */}
                      {isCollapsed && item.badge && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-400 ring-2 ring-slate-900 animate-pulse" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  const renderFooter = (isMobile = false, isCollapsed = false) => (
    <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 space-y-2 shrink-0 select-none">
      {!isCollapsed ? (
        <>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              BD-Central DC
            </span>
            <span className="font-mono text-slate-500 text-[9px] font-bold">v22.0</span>
          </div>

          <Link
            href="/dashboard"
            onClick={() => {
              if (isMobile) setMobileOpen(false)
            }}
            className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all border border-slate-800 group min-h-[38px]"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform text-indigo-400" />
              <span>Exit to App</span>
            </span>
            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
          </Link>
        </>
      ) : (
        <Link
          href="/dashboard"
          title="Exit to App"
          className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-indigo-400" />
        </Link>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex bg-slate-900 border-r border-slate-800 flex-col shrink-0 shadow-xl z-20 transition-all duration-300 h-full max-h-full overflow-hidden',
          collapsed ? 'w-18' : 'w-64'
        )}
      >
        {/* Top Control Bar */}
        <div className="flex h-11 items-center justify-between border-b border-slate-800/80 px-3 shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 truncate">
                Platform Console
              </span>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="h-2 w-2 rounded-full bg-indigo-500 block" />
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleCollapse}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation List */}
        {renderNavList(false, collapsed)}

        {/* Footer */}
        {renderFooter(false, collapsed)}
      </aside>

      {/* Mobile Navigation Drawer Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left">
        <SheetHeader onClose={() => setMobileOpen(false)}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md">
              <Server className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-white block">PrintERP Root</span>
              <span className="text-[10px] text-indigo-400 font-mono">Platform Governance</span>
            </div>
          </div>
        </SheetHeader>
        <SheetContent className="p-0 bg-slate-900 text-slate-100 border-slate-800 flex flex-col justify-between h-full overflow-hidden">
          {renderNavList(true, false)}
          {renderFooter(true, false)}
        </SheetContent>
      </Sheet>
    </>
  )
}
