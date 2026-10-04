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
  Cpu,
  Layers,
  Shield,
  FileClock,
  Settings,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Server,
  Bell,
  Laptop,
  MessageSquare,
  Mail,
  FileCheck2,
  AlertTriangle,
  Sparkles,
  UserCheck,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetHeader, SheetContent } from '@/components/ui/sheet'
import { usePlatformNotifications } from '@/hooks/use-platform-notifications'
import { usePlatformSettings } from '@/hooks/use-platform-settings'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { useI18n } from '@/i18n/context'

interface NavItem {
  titleEn: string
  titleBn: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
}

interface NavSection {
  titleEn: string
  titleBn: string
  items: NavItem[]
}

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    titleEn: 'Main',
    titleBn: 'মূল মেনু',
    items: [
      { titleEn: 'Overview', titleBn: 'সারসংক্ষেপ', href: '/platform', icon: Activity },
      { titleEn: 'Clients', titleBn: 'ক্লায়েন্ট', href: '/platform/tenants', icon: Building2 },
      { titleEn: 'Users', titleBn: 'ব্যবহারকারী', href: '/platform/users', icon: Users },
    ],
  },
  {
    titleEn: 'Money & Plans',
    titleBn: 'প্ল্যান ও টাকা',
    items: [
      { titleEn: 'Plans', titleBn: 'প্ল্যান', href: '/platform/plans', icon: Briefcase },
      { titleEn: 'Client Plans', titleBn: 'চলতি প্ল্যান', href: '/platform/subscriptions', icon: CreditCard },
      { titleEn: 'Bills', titleBn: 'বিল', href: '/platform/billing', icon: FileCheck2 },
      { titleEn: 'Features', titleBn: 'ফিচার', href: '/platform/feature-flags', icon: Flag },
      { titleEn: 'Usage', titleBn: 'ব্যবহার', href: '/platform/usage', icon: Gauge },
      { titleEn: 'Client Help', titleBn: 'গ্রাহক সহায়তা', href: '/platform/customer-success', icon: Sparkles },
    ],
  },
  {
    titleEn: 'Support & Health',
    titleBn: 'সহায়তা ও সিস্টেম',
    items: [
      { titleEn: 'Support', titleBn: 'সহায়তা', href: '/platform/support', icon: ShieldAlert },
      { titleEn: 'Problems', titleBn: 'সমস্যা', href: '/platform/incidents', icon: AlertTriangle },
      { titleEn: 'System Health', titleBn: 'সিস্টেম অবস্থা', href: '/platform/health', icon: HeartPulse },
      { titleEn: 'System Tasks', titleBn: 'সিস্টেম কাজ', href: '/platform/jobs', icon: Cpu },
      { titleEn: 'Alerts', titleBn: 'বিজ্ঞপ্তি', href: '/platform/notifications', icon: Bell },
    ],
  },
  {
    titleEn: 'Security',
    titleBn: 'নিরাপত্তা',
    items: [
      { titleEn: 'Security', titleBn: 'নিরাপত্তা', href: '/platform/security', icon: Shield },
      { titleEn: 'Admins', titleBn: 'এডমিন', href: '/platform/admins', icon: UserCheck },
      { titleEn: 'Roles', titleBn: 'দায়িত্ব', href: '/platform/rbac', icon: Sliders },
      { titleEn: 'Devices', titleBn: 'ডিভাইস', href: '/platform/sessions', icon: Laptop },
      { titleEn: 'Activity Log', titleBn: 'কাজের ইতিহাস', href: '/platform/audit', icon: FileText },
    ],
  },
  {
    titleEn: 'Settings',
    titleBn: 'সেটিংস',
    items: [
      { titleEn: 'Settings', titleBn: 'সেটিংস', href: '/platform/settings', icon: Settings },
      { titleEn: 'Email', titleBn: 'ইমেইল', href: '/platform/email', icon: Mail, badge: 'SMTP' },
      { titleEn: 'Connections', titleBn: 'সংযোগ', href: '/platform/integrations', icon: Layers },
      { titleEn: 'Emergency Stop', titleBn: 'জরুরি বন্ধ', href: '/platform/emergency', icon: Server },
    ],
  },
]

export function PlatformSidebar() {
  const pathname = usePathname()
  const { appName } = usePlatformSettings()
  const { locale, tBilingual } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [businessSlug, setBusinessSlug] = useState('')

  // Resolve target business ERP tenant slug dynamically
  useEffect(() => {
    try {
      // 1. Check support session cookie
      const supportMatch = document.cookie.match(/(?:^|; )printerp_support_tenant=([^;]*)/)
      if (supportMatch && supportMatch[1]) {
        const parsed = JSON.parse(decodeURIComponent(supportMatch[1]))
        if (parsed?.targetCompanySlug) {
          setBusinessSlug(parsed.targetCompanySlug)
          return
        }
      }

      // 2. Check tenant session cookie
      const sessionMatch = document.cookie.match(/(?:^|; )printerp_tenant_session=([^;]*)/)
      if (sessionMatch && sessionMatch[1]) {
        const parsed = JSON.parse(decodeURIComponent(sessionMatch[1]))
        if (parsed?.companySlug) {
          setBusinessSlug(parsed.companySlug)
          return
        }
      }

      // 3. Check localStorage
      const localSlug =
        localStorage.getItem('printerp_current_company') ||
        localStorage.getItem('printerp_tenant_slug') ||
        localStorage.getItem('printerp_active_tenant')
      if (localSlug) {
        setBusinessSlug(localSlug)
        return
      }
    } catch {
      // ignore
    }
  }, [])

  // Load persisted collapsed state from localStorage
  useEffect(() => {
    try {
      const legacy = localStorage.getItem('inkflow_platform_sidebar_collapsed')
      if (legacy !== null && !localStorage.getItem('printerp_platform_sidebar_collapsed')) {
        localStorage.setItem('printerp_platform_sidebar_collapsed', legacy)
        localStorage.removeItem('inkflow_platform_sidebar_collapsed')
      }
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

  // Auto-close on route change
  useEffect(() => {
    setMobileOpen(false)
    setSearchQuery('')
  }, [pathname])

  const { unreadCount } = usePlatformNotifications({ pageSize: 1 })

  // Filter sections by search query and inject live unread badge
  const filteredSections = useMemo(() => {
    const sectionsWithBadges = SIDEBAR_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.map((item) => {
        if (item.href === '/platform/notifications') {
          return {
            ...item,
            badge: unreadCount > 0 ? `${unreadCount}` : undefined,
            badgeColor: 'bg-destructive/10 text-destructive font-bold border border-destructive/20',
          }
        }
        return item
      }),
    }))

    if (!searchQuery.trim()) return sectionsWithBadges
    const q = searchQuery.toLowerCase().trim()

    return sectionsWithBadges
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.titleEn.toLowerCase().includes(q) ||
            item.titleBn.toLowerCase().includes(q) ||
            item.href.toLowerCase().includes(q) ||
            sec.titleEn.toLowerCase().includes(q) ||
            sec.titleBn.toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.items.length > 0)
  }, [searchQuery, unreadCount])

  const renderNavList = (isMobile = false, isCollapsed = false) => {
    return (
      <div className="overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4 flex-1 min-h-0 select-none">
        {/* Quick Filter Search Input (when expanded) */}
        {!isCollapsed && (
          <div className="px-1 mb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tBilingual('Filter menu...', 'মেনু খুঁজুন...')}
                className="w-full h-8 pl-8 pr-7 rounded-lg bg-muted/60 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {filteredSections.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {tBilingual('Nothing found for', 'কিছু পাওয়া যায়নি:')} &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredSections.map((sec) => {
            const secTitle = locale === 'bn' ? sec.titleBn : sec.titleEn
            return (
              <div key={sec.titleEn} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {secTitle}
                  </div>
                )}

                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon
                    const [baseHref] = item.href.split('?')
                    const isActive =
                      baseHref === '/platform'
                        ? pathname === '/platform' || pathname === '/platform/dashboard'
                        : baseHref === '/platform/settings'
                          ? pathname === '/platform/settings'
                          : baseHref === '/platform/settings/communication'
                            ? pathname.startsWith('/platform/settings/communication') || pathname.startsWith('/platform/email')
                            : pathname === baseHref ||
                              (pathname.startsWith(baseHref + '/') && baseHref !== '/platform') ||
                              (baseHref === '/platform/tenants' && pathname.startsWith('/platform/companies')) ||
                              (baseHref === '/platform/features' && pathname.startsWith('/platform/feature-flags')) ||
                              (baseHref === '/platform/permissions' && pathname.startsWith('/platform/rbac')) ||
                              (baseHref === '/platform/audit' && pathname.startsWith('/platform/activity'))

                    const title = locale === 'bn' ? item.titleBn : item.titleEn

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={isCollapsed ? `${title}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                        onClick={() => {
                          if (isMobile) setMobileOpen(false)
                        }}
                        className={cn(
                          'flex items-center rounded-lg text-xs font-medium transition-all group relative',
                          isCollapsed
                            ? 'justify-center p-2.5 min-h-10 min-w-10'
                            : 'justify-between px-3 py-2 min-h-9',
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <div className={cn('flex items-center min-w-0', isCollapsed ? 'justify-center' : 'gap-2.5')}>
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            )}
                          />
                          {!isCollapsed && <span className="truncate">{title}</span>}
                        </div>

                        {/* Badge in expanded mode */}
                        {!isCollapsed && item.badge && (
                          <span
                            className={cn(
                              'text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5',
                              item.badgeColor || 'bg-primary/10 text-primary border border-primary/20'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Dot badge in collapsed mode */}
                        {isCollapsed && item.badge && (
                          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  const renderFooter = (isMobile = false, isCollapsed = false) => {
    const hasActiveTenant = Boolean(businessSlug)
    const businessHref = hasActiveTenant ? getTenantLink(businessSlug, '/dashboard') : '/platform/tenants'
    const buttonLabel = hasActiveTenant
      ? tBilingual('Open Shop ERP', 'শপ ERP খুলুন')
      : tBilingual('All Clients', 'সব ক্লায়েন্ট')
    const tooltipTitle = hasActiveTenant
      ? `${tBilingual('Open Shop ERP', 'শপ ERP খুলুন')} (${businessSlug})`
      : tBilingual('All Clients', 'সব ক্লায়েন্ট')

    return (
      <div className="p-2.5 border-t border-border bg-card space-y-2 shrink-0 select-none">
        {!isCollapsed ? (
          <>
            <div className="p-2 rounded-lg bg-muted border border-border text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {tBilingual('System Online', 'সিস্টেম চালু')}
              </span>
              <span className="tabular-nums text-muted-foreground text-xs font-semibold">{appName}</span>
            </div>

            <Link
              href={businessHref}
              onClick={() => {
                if (isMobile) setMobileOpen(false)
              }}
              className="flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted px-3 py-2 rounded-lg transition-all border border-border group min-h-9 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform text-muted-foreground group-hover:text-foreground" />
                <span>{buttonLabel}</span>
              </span>
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </>
        ) : (
          <Link
            href={businessHref}
            title={tooltipTitle}
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex bg-card border-r border-border flex-col shrink-0 z-20 transition-all duration-300 h-full max-h-full overflow-hidden',
          collapsed ? 'w-18' : 'w-64'
        )}
      >
        {/* Top Control Bar */}
        <div className="flex h-11 items-center justify-between border-b border-border px-3 shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs tabular-nums font-bold uppercase tracking-widest text-primary truncate">
                {appName} {tBilingual('Control Center', 'কন্ট্রোল সেন্টার')}
              </span>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="h-2 w-2 rounded-full bg-primary block" />
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleCollapse}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
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
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
              <Server className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-foreground block">{appName}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {tBilingual('Control Center', 'কন্ট্রোল সেন্টার')}
              </span>
            </div>
          </div>
        </SheetHeader>
        <SheetContent className="p-0 bg-card text-foreground border-border flex flex-col justify-between h-full overflow-hidden">
          {renderNavList(true, false)}
          {renderFooter(true, false)}
        </SheetContent>
      </Sheet>
    </>
  )
}
