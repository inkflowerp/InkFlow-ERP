'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Layers,
  Package,
  Disc,
  Send,
  Scissors,
  MapPin,
  ShoppingBag,
  Truck,
  FileText,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export type InventoryViewTab =
  | 'materials'
  | 'ready_products'
  | 'rolls'
  | 'requests'
  | 'remnants'
  | 'locations'
  | 'purchases'
  | 'receiving'
  | 'ledger'

export interface TabConfig {
  id: InventoryViewTab
  labelEn: string
  labelBn: string
  groupEn: string
  groupBn: string
  icon: React.ElementType
  count?: number
  alert?: boolean
}

export interface InventoryTabsNavigationProps {
  currentView: InventoryViewTab
  onSelectTab: (tab: InventoryViewTab) => void
  materialsCount: number
  readyProductsCount: number
  rollsCount: number
  requestsCount: number
  pendingRequestsCount: number
  remnantsCount: number
  locationsCount: number
  ordersCount: number
  pendingInwardCount: number
  ledgerCount: number
}

export function InventoryTabsNavigation({
  currentView,
  onSelectTab,
  materialsCount,
  readyProductsCount,
  rollsCount,
  requestsCount,
  pendingRequestsCount,
  remnantsCount,
  locationsCount,
  ordersCount,
  pendingInwardCount,
  ledgerCount,
}: InventoryTabsNavigationProps) {
  const { tBilingual } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const tabs: TabConfig[] = [
    {
      id: 'materials',
      labelEn: 'Raw Materials',
      labelBn: 'কাঁচামাল ও রোল মিডিয়া',
      groupEn: 'Physical Stock & Materials',
      groupBn: 'ফিজিক্যাল স্টক ও কাঁচামাল',
      icon: Layers,
      count: materialsCount,
    },
    {
      id: 'ready_products',
      labelEn: 'Ready Products',
      labelBn: 'রেডি প্রোডাক্ট স্টক',
      groupEn: 'Physical Stock & Materials',
      groupBn: 'ফিজিক্যাল স্টক ও কাঁচামাল',
      icon: Package,
      count: readyProductsCount,
    },
    {
      id: 'rolls',
      labelEn: 'Physical Rolls',
      labelBn: 'রোল তালিকা ও প্রেস',
      groupEn: 'Physical Stock & Materials',
      groupBn: 'ফিজিক্যাল স্টক ও কাঁচামাল',
      icon: Disc,
      count: rollsCount,
    },
    {
      id: 'remnants',
      labelEn: 'Off-Cuts & Remnants',
      labelBn: 'অফ-কাট ও অবশিষ্টাংশ',
      groupEn: 'Physical Stock & Materials',
      groupBn: 'ফিজিক্যাল স্টক ও কাঁচামাল',
      icon: Scissors,
      count: remnantsCount,
    },
    {
      id: 'requests',
      labelEn: 'Material Requests',
      labelBn: 'ফ্লোর রিকুইজিশন',
      groupEn: 'Floor Movements & Stores',
      groupBn: 'ফ্লোর মুভমেন্ট ও স্টোর',
      icon: Send,
      count: requestsCount,
      alert: pendingRequestsCount > 0,
    },
    {
      id: 'locations',
      labelEn: 'Locations & Stores',
      labelBn: 'স্টোর ও ওয়্যারহাউস',
      groupEn: 'Floor Movements & Stores',
      groupBn: 'ফ্লোর মুভমেন্ট ও স্টোর',
      icon: MapPin,
      count: locationsCount,
    },
    {
      id: 'purchases',
      labelEn: 'Purchase Orders',
      labelBn: 'ক্রয়াদেশ সমূহ (PO)',
      groupEn: 'Procurement & Ledger',
      groupBn: 'প্রকিউরমেন্ট ও লেজার',
      icon: ShoppingBag,
      count: ordersCount,
    },
    {
      id: 'receiving',
      labelEn: 'Goods Receiving',
      labelBn: 'পণ্য গ্রহণ (GRN)',
      groupEn: 'Procurement & Ledger',
      groupBn: 'প্রকিউরমেন্ট ও লেজার',
      icon: Truck,
      count: pendingInwardCount,
      alert: pendingInwardCount > 0,
    },
    {
      id: 'ledger',
      labelEn: 'Stock Ledger',
      labelBn: 'স্টক খতিয়ান',
      groupEn: 'Procurement & Ledger',
      groupBn: 'প্রকিউরমেন্ট ও লেজার',
      icon: FileText,
      count: ledgerCount,
    },
  ]

  const activeTab = tabs.find((t) => t.id === currentView) || tabs[0]
  const ActiveIcon = activeTab.icon

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Group tabs by category for clean dropdown layout
  const groupedTabs = tabs.reduce((acc, tab) => {
    const key = tab.groupEn
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(tab)
    return acc
  }, {} as Record<string, TabConfig[]>)

  return (
    <div className="relative z-30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-2 rounded-xl border border-border bg-card shadow-xs">
        {/* Left: View Label & Interactive Dropdown Trigger */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0" ref={dropdownRef}>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 hidden sm:inline-block">
            {tBilingual('Operations View:', 'অপারেশনস ভিউ:')}
          </span>

          <div className="relative flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isOpen}
              className={cn(
                'w-full sm:w-auto min-w-[240px] flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer',
                isOpen
                  ? 'bg-muted border-primary/40 text-foreground ring-2 ring-primary/10'
                  : 'bg-background hover:bg-muted border-border text-foreground shadow-2xs'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <ActiveIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{tBilingual(activeTab.labelEn, activeTab.labelBn)}</span>
                {activeTab.alert && (
                  <span className="h-2 w-2 rounded-full bg-warning animate-pulse shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {activeTab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-xs tabular-nums font-bold bg-primary/10 text-primary border border-primary/20">
                    {activeTab.count.toLocaleString()}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180 text-foreground'
                  )}
                />
              </div>
            </button>

            {/* Dropdown Menu Container */}
            {isOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 z-50 w-full sm:w-80 max-h-[380px] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-md animate-in fade-in-0 zoom-in-95 scrollbar-thin"
                role="menu"
                aria-label="Inventory View Selection"
              >
                <div className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                  {tBilingual('Select Inventory Module (9 Views)', 'ইনভেন্টরি মডিউল নির্বাচন করুন (৯টি ভিউ)')}
                </div>

                {Object.entries(groupedTabs).map(([groupName, groupTabs], groupIdx) => (
                  <div key={groupName} className={cn(groupIdx > 0 && 'mt-1.5 pt-1.5 border-t border-border')}>
                    <div className="px-2.5 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {tBilingual(groupName, groupTabs[0]?.groupBn || groupName)}
                    </div>

                    <div className="space-y-0.5">
                      {groupTabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = currentView === tab.id

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              onSelectTab(tab.id)
                              setIsOpen(false)
                            }}
                            className={cn(
                              'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                              isActive
                                ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                                : 'text-foreground hover:bg-muted font-medium'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 truncate">
                              <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                              <span className="truncate">{tBilingual(tab.labelEn, tab.labelBn)}</span>
                              {tab.alert && (
                                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {tab.count !== undefined && (
                                <span
                                  className={cn(
                                    'px-1.5 py-0.2 rounded-full text-xs tabular-nums font-bold',
                                    isActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {tab.count.toLocaleString()}
                                </span>
                              )}
                              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active View Meta & Quick Indicators */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
          <span className="hidden md:inline-block">
            {tBilingual('Active Module:', 'সক্রিয় মডিউল:')}
          </span>
          <span className="font-bold text-foreground">
            {tBilingual(activeTab.labelEn, activeTab.labelBn)}
          </span>
          {activeTab.count !== undefined && (
            <span className="tabular-nums font-bold text-primary">
              ({activeTab.count.toLocaleString()})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
