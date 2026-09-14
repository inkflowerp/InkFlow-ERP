'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  Search,
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
  Settings,
  Crown,
  Sparkles,
  Zap,
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  Headphones,
} from 'lucide-react'
import { getNavigationConfig, type NavItem } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Sheet, SheetHeader, SheetContent, SheetFooter } from '@/components/ui/sheet'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from './language-switcher'
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
  Settings,
  Crown,
  Sparkles,
  Zap,
}

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    today: true,
    work: true,
    materials: true,
    management: true,
    settings: true,
  })

  const pathname = usePathname()
  const { signOut } = useAuth()
  const { company, currentRole, currentBranch, currentUser } = useTenant()
  const { can, isOwner } = usePermissions()
  const { isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { tBilingual } = useI18n()

  const pathSlug = pathname ? pathname.split('/')[1] : null
  const tenantSlug = (pathSlug && pathSlug !== 'platform-admin' && pathSlug !== 'login' && pathSlug !== 'onboarding' ? pathSlug : company?.slug) || 'app'
  const navSections = useMemo(() => getNavigationConfig(tenantSlug), [tenantSlug])

  // Close drawer automatically on route navigation
  useEffect(() => {
    setOpen(false)
    setSearchQuery('')
  }, [pathname])

  // Listen to cross-component global event triggers
  useEffect(() => {
    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)
    const handleToggle = () => setOpen((prev) => !prev)

    window.addEventListener('printerp_open_mobile_nav', handleOpen)
    window.addEventListener('printerp_close_mobile_nav', handleClose)
    window.addEventListener('printerp_toggle_mobile_nav', handleToggle)
    window.addEventListener('inkflow_open_mobile_nav', handleOpen)
    window.addEventListener('inkflow_close_mobile_nav', handleClose)

    return () => {
      window.removeEventListener('printerp_open_mobile_nav', handleOpen)
      window.removeEventListener('printerp_close_mobile_nav', handleClose)
      window.removeEventListener('printerp_toggle_mobile_nav', handleToggle)
      window.removeEventListener('inkflow_open_mobile_nav', handleOpen)
      window.removeEventListener('inkflow_close_mobile_nav', handleClose)
    }
  }, [])

  // Explicit permission checking
  const isNavItemAllowed = useCallback((item: NavItem): boolean => {
    if (isOwner) return true
    if (item.ownerOnly && !isOwner) return false
    if (!item.permission) return true
    return can(item.permission.action, item.permission.resource)
  }, [isOwner, can])

  const userName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'User'

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  // Filter sections by search query in real-time
  const filteredNavSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return navSections
      .map((section) => {
        const allowedItems = section.items.filter(isNavItemAllowed)
        if (!q) return { ...section, items: allowedItems }

        const matchedItems = allowedItems.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.titleBn.toLowerCase().includes(q) ||
            item.href.toLowerCase().includes(q) ||
            section.title.toLowerCase().includes(q) ||
            section.titleBn.toLowerCase().includes(q)
        )
        return { ...section, items: matchedItems }
      })
      .filter((section) => section.items.length > 0)
  }, [navSections, searchQuery, isNavItemAllowed])

  return (
    <div className="lg:hidden">
      {/* Elevated Hamburger Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-200/90 bg-white/90 p-2 text-slate-700 hover:bg-slate-100/80 hover:text-blue-600 hover:border-blue-400/40 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shadow-xs active:scale-95 transition-all"
        aria-label="Open Navigation Menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen} side="left">
        {/* Custom Header with Brand, Language Toggle, and Close Button */}
        <SheetHeader onClose={() => setOpen(false)}>
          <div className="flex items-center justify-between w-full pr-1">
            {/* Logo and Brand */}
            <Link
              href={`/${tenantSlug}/dashboard`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="grid grid-cols-2 gap-0.5 p-1 rounded-lg bg-slate-900 shadow-xs ring-1 ring-slate-800 group-hover:scale-105 transition-transform">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-slate-200" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-base text-slate-900 dark:text-white leading-tight">
                  Ink<span className="text-blue-600">Flow</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Print ERP
                </span>
              </div>
            </Link>

            {/* 1-Click Language Switcher */}
            <LanguageSwitcher compact size="sm" />
          </div>
        </SheetHeader>

        <SheetContent className="pb-6">
          <div className="space-y-4 py-1">
            {/* Active Workspace & User Profile Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    fallback={userName}
                    src={currentUser?.profile?.avatar_url || undefined}
                    className="h-8 w-8 text-xs font-bold shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20"
                  />
                  <div className="truncate">
                    <span className="block font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate leading-tight bangla-text">
                      {userName}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                      {company?.name || 'InkFlow Workspace'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="text-xs uppercase font-semibold py-0.5 px-2 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0"
                >
                  <Shield className="h-3 w-3 mr-1 text-blue-600" />
                  {currentRole || 'Staff'}
                </Badge>
              </div>

              {/* Status / Plan Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Building className="h-3.5 w-3.5 text-blue-600" />
                  <span className="font-medium text-xs truncate max-w-[140px]">
                    {currentBranch ? currentBranch.name.split('(')[0].trim() : currentPlan?.name || 'Main Branch'}
                  </span>
                </div>
                {isTrial ? (
                  <Badge suppressHydrationWarning className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold border-amber-300 shrink-0 px-1.5 py-0.5">
                    {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d trial`}
                  </Badge>
                ) : (
                  currentPlan && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {tBilingual(currentPlan.name, currentPlan.name_bn)}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Quick Actions Shortcuts Chips */}
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                href={`/${tenantSlug}/sales`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors min-h-[38px] bangla-text"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                <span>{tBilingual('Quotes', 'কোটেশন')}</span>
              </Link>
              <Link
                href={`/${tenantSlug}/sales/new-work`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors min-h-[38px] bangla-text"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                <span>{tBilingual('New Work', 'নতুন কাজ')}</span>
              </Link>
              <Link
                href={`/${tenantSlug}/production`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200/70 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-100 transition-colors min-h-[38px] bangla-text"
              >
                <Printer className="h-3.5 w-3.5 text-cyan-600" />
                <span>{tBilingual('Press', 'প্রোডাকশন')}</span>
              </Link>
            </div>

            {/* Instant Filter Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tBilingual('Search menu & features...', 'মেনু ফিল্টার করুন...')}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all bangla-text"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear filter search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Navigation Sections */}
            {filteredNavSections.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bangla-text">
                {tBilingual(`No modules matching "${searchQuery}"`, `"${searchQuery}" এর জন্য কোনো মেনু পাওয়া যায়নি`)}
              </div>
            ) : (
              filteredNavSections.map((section) => {
                const sectionTitle = tBilingual(section.title, section.titleBn)
                const isExpanded = searchQuery ? true : (expandedGroups[section.id] ?? true)

                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(section.id)}
                      className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer bangla-text"
                    >
                      <span>{sectionTitle}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
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
                              onClick={() => setOpen(false)}
                              className={cn(
                                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all min-h-[44px] cursor-pointer bangla-text',
                                isPrimary
                                  ? isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 ring-2 ring-blue-400'
                                    : 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white font-bold'
                                  : isActive
                                  ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
                                  : 'text-slate-700 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:bg-slate-800'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                                  isPrimary || isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                )}
                              />
                              <span className="flex-1 truncate">{itemTitle}</span>
                              {item.badge && (
                                <Badge
                                  variant={isActive || isPrimary ? 'secondary' : 'default'}
                                  className={cn(
                                    'text-2xs px-2 py-0.5 h-4.5 font-bold shrink-0',
                                    item.badgeVariant === 'live'
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : item.badgeVariant === 'fast'
                                      ? 'bg-emerald-400 text-slate-950 font-black'
                                      : 'bg-emerald-500 text-white'
                                  )}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Trial Upgrade Widget in Mobile Menu */}
            {isTrial && (
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-3.5 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 bangla-text">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span>{tBilingual('Free Trial Active', 'ফ্রি ট্রায়াল চলছে')}</span>
                  </span>
                  <Badge suppressHydrationWarning className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5">
                    {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d left`}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug bangla-text">
                  {tBilingual('Unlock unlimited orders, multi-branch, and SMS automation.', 'আনলিমিটেড অর্ডার ও ফিচারের জন্য বিজনেস প্ল্যানে আপগ্রেড করুন।')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    openUpgradeModal('business')
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold text-center shadow-xs cursor-pointer bangla-text min-h-[40px] flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-300" />
                  <span>{tBilingual('Upgrade Plan', 'প্ল্যান আপগ্রেড করুন')}</span>
                </button>
              </div>
            )}
          </div>
        </SheetContent>

        {/* Footer with Support Desk and Sign Out Button */}
        <SheetFooter className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-2">
          <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400 px-1">
            <Link
              href={`/${tenantSlug}/support`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>{company?.phone || '24/7 Live Desk'}</span>
            </Link>
            <span className="text-xs text-slate-400">InkFlow ERP</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/60 active:scale-98 transition-all cursor-pointer min-h-[42px] bangla-text shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>{tBilingual('Sign Out', 'লগ আউট')}</span>
          </button>
        </SheetFooter>
      </Sheet>
    </div>
  )
}
