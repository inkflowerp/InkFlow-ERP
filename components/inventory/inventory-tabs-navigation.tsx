'use client'

import React from 'react'
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
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const tabs: TabConfig[] = [
    {
      id: 'materials',
      labelEn: 'Raw Materials',
      labelBn: 'কাঁচামাল ও রোল মিডিয়া',
      icon: Layers,
      count: materialsCount,
    },
    {
      id: 'ready_products',
      labelEn: 'Ready Products',
      labelBn: 'রেডি প্রোডাক্ট স্টক',
      icon: Package,
      count: readyProductsCount,
    },
    {
      id: 'rolls',
      labelEn: 'Physical Rolls',
      labelBn: 'রোল তালিকা ও প্রেস',
      icon: Disc,
      count: rollsCount,
    },
    {
      id: 'requests',
      labelEn: 'Material Requests',
      labelBn: 'রিকুইজিশন',
      icon: Send,
      count: requestsCount,
      alert: pendingRequestsCount > 0,
    },
    {
      id: 'remnants',
      labelEn: 'Off-Cuts & Remnants',
      labelBn: 'অফ-কাট ও অবশিষ্টাংশ',
      icon: Scissors,
      count: remnantsCount,
    },
    {
      id: 'locations',
      labelEn: 'Locations & Stores',
      labelBn: 'স্টোর ও ওয়্যারহাউস',
      icon: MapPin,
      count: locationsCount,
    },
    {
      id: 'purchases',
      labelEn: 'Purchase Orders',
      labelBn: 'কেনাকাটা (PO)',
      icon: ShoppingBag,
      count: ordersCount,
    },
    {
      id: 'receiving',
      labelEn: 'Receiving (GRN)',
      labelBn: 'রিসিভিং (GRN)',
      icon: Truck,
      count: pendingInwardCount,
      alert: pendingInwardCount > 0,
    },
    {
      id: 'ledger',
      labelEn: 'Stock Ledger',
      labelBn: 'স্টক খতিয়ান',
      icon: FileText,
      count: ledgerCount,
    },
  ]

  return (
    <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = currentView === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shrink-0',
              isActive
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5',
                isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400'
              )}
            />
            <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold',
                  tab.alert
                    ? 'bg-amber-500 text-white animate-pulse'
                    : isActive
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
