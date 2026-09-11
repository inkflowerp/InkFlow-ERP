'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
  Search,
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
  LogOut,
  User as UserIcon,
  Shield,
  Plus,
  Zap,
  ChevronRight,
  PhoneCall,
  Radio,
} from 'lucide-react'
import { getNavigationConfig } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Sheet, SheetHeader, SheetContent, SheetFooter } from '@/components/ui/sheet'
import { Avatar } from '@/components/ui/avatar'
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
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { company, currentRole, currentBranch, currentUser } = useTenant()
  const { can, isOwner } = usePermissions()
  const { isTrial, daysRemainingInTrial, timeRemainingInTrial, currentPlan, openUpgradeModal } = useSubscription()
  const { locale, setLocale, tBilingual } = useI18n()

  const tenantSlug = company?.slug || 'app'
  const navSections = getNavigationConfig(tenantSlug)

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

  const userName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'User'
  const userEmail = currentUser?.profile?.email || ''

  // Filter sections by search query in real-time
  const filteredNavSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return navSections
      .map((section) => {
        const allowedItems = section.items.filter((item) => isNavItemAllowed(item.href))
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
  }, [navSections, searchQuery, isOwner, can])

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
              className="flex items-center gap-2.5 group"
            >
              <div className="grid grid-cols-2 gap-0.5 p-1 rounded-lg bg-slate-900 shadow-xs ring-1 ring-slate-800 group-hover:scale-105 transition-transform">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-slate-200" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-base text-slate-900 dark:text-white leading-tight">
                  Print<span className="text-blue-600">ERP</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  BD Print SaaS
                </span>
              </div>
            </Link>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Switch Language (English / বাংলা)"
            >
              <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{locale === 'en' ? 'বাংলা' : 'EN'}</span>
            </button>
          </div>
        </SheetHeader>

        <SheetContent className="pb-6">
          <div className="space-y-4 py-1">
            {/* Active Workspace & User Profile Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/80 dark:to-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    fallback={userName}
                    src={currentUser?.profile?.avatar_url || undefined}
                    className="h-8 w-8 text-xs font-bold shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20"
                  />
                  <div className="truncate">
                    <span className="block font-bold text-xs text-slate-900 dark:text-white truncate leading-tight">
                      {userName}
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {company?.name || 'PrintERP Workspace'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold py-0.5 px-1.5 h-4.5 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0"
                >
                  <Shield className="h-2.5 w-2.5 mr-1 text-blue-600" />
                  {currentRole || 'Staff'}
                </Badge>
              </div>

              {/* Status / Trial Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Building className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-[10px] truncate max-w-[140px]">
                    {currentBranch ? currentBranch.name.split('(')[0].trim() : currentPlan.name}
                  </span>
                </div>
                {isTrial ? (
                  <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[9px] font-bold border-amber-300 shrink-0">
                    {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d trial`}
                  </Badge>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {currentPlan.name}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Shortcuts Chips */}
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                href={`/${tenantSlug}/quotations`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-100 transition-colors min-h-[38px] bangla-text"
              >
                <Plus className="h-3 w-3 text-blue-600" />
                <span>{tBilingual('Quote', 'কোটেশন')}</span>
              </Link>
              <Link
                href={`/${tenantSlug}/orders`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 transition-colors min-h-[38px] bangla-text"
              >
                <Plus className="h-3 w-3 text-indigo-600" />
                <span>{tBilingual('Order', 'অর্ডার')}</span>
              </Link>
              <Link
                href={`/${tenantSlug}/mobile`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 p-2 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/40 border border-cyan-200/70 dark:border-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold hover:bg-cyan-100 transition-colors min-h-[38px] bangla-text"
              >
                <Zap className="h-3 w-3 text-cyan-600" />
                <span>{tBilingual('Mobile', 'মোবাইল')}</span>
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
              filteredNavSections.map((section, sIdx) => {
                const sectionTitle = tBilingual(section.title, section.titleBn)

                return (
                  <div key={sIdx} className="space-y-1">
                    <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 bangla-text">
                      {sectionTitle}
                    </h4>

                    <div className="space-y-0.5">
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
                              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all min-h-[44px] cursor-pointer bangla-text',
                              isActive
                                ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
                                : 'text-slate-700 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:bg-slate-800'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                                isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              )}
                            />
                            <span className="flex-1 truncate">{itemTitle}</span>
                            {item.badge && (
                              <Badge
                                variant={isActive ? 'secondary' : 'default'}
                                className={cn(
                                  'text-[9px] px-1.5 py-0 h-4 font-bold shrink-0',
                                  item.badge === 'Live'
                                    ? 'bg-rose-500 text-white'
                                    : item.badge === 'PWA'
                                    ? 'bg-indigo-500 text-white'
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
                  <Badge className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0 h-4">
                    {timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d left`}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight bangla-text">
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

        {/* Footer with Support Hotline and Sign Out Button */}
        <SheetFooter className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-2">
          <div className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
              <span>+880 1700-000000</span>
            </div>
            <span className="text-[10px] text-slate-400">PrintERP SaaS v2.5</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer min-h-[40px] bangla-text"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{tBilingual('Sign Out', 'লগ আউট')}</span>
          </button>
        </SheetFooter>
      </Sheet>
    </div>
  )
}
