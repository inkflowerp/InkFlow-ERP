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
  Sparkles,
  Smartphone,
  Workflow,
} from 'lucide-react'
import { getNavigationConfig } from '@/config/navigation.config'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Sheet, SheetHeader, SheetContent } from '@/components/ui/sheet'
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
  Smartphone,
  Workflow,
}

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()

  const tenantSlug = company?.slug || 'padma-digital'
  const navSections = getNavigationConfig(tenantSlug)

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
        aria-label="Open Navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen} side="left">
        <SheetHeader onClose={() => setOpen(false)}>
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 gap-0.5 p-1 rounded-md bg-slate-900 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="h-2 w-2 rounded-full bg-slate-200" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">
              Print<span className="text-blue-600">ERP</span>
            </span>
          </div>
        </SheetHeader>

        <SheetContent>
          <div className="space-y-6 py-2">
            {navSections.map((section, sIdx) => {
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
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                          isActive
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{itemTitle}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
