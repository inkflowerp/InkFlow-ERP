'use client'

import React from 'react'
import {
  Truck,
  Wrench,
  Calendar,
  Search,
  SlidersHorizontal,
  X,
  DollarSign,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { DeliveryMethod } from '@/types/logistics.types'
import { cn } from '@/lib/utils'

export interface DeliveryFilterToolbarProps {
  viewMode: 'challans' | 'installations' | 'calendar'
  onViewModeChange: (mode: 'challans' | 'installations' | 'calendar') => void
  selectedMethod: 'all' | DeliveryMethod
  onMethodChange: (method: 'all' | DeliveryMethod) => void
  search: string
  onSearchChange: (search: string) => void
  dueOnly: boolean
  onDueOnlyChange: (dueOnly: boolean) => void
  totalCount: number
}

export function DeliveryFilterToolbar({
  viewMode,
  onViewModeChange,
  selectedMethod,
  onMethodChange,
  search,
  onSearchChange,
  dueOnly,
  onDueOnlyChange,
  totalCount,
}: DeliveryFilterToolbarProps) {
  const { tBilingual } = useI18n()

  const methodTabs: Array<{ id: 'all' | DeliveryMethod; labelEn: string; labelBn: string }> = [
    { id: 'all', labelEn: 'All Methods', labelBn: 'সব মাধ্যম' },
    { id: 'company_vehicle', labelEn: 'Company Vehicle', labelBn: 'কোম্পানির গাড়ি/পিকআপ' },
    { id: 'courier', labelEn: 'Courier (Steadfast/SA/Pathao)', labelBn: 'কুরিয়ার' },
    { id: 'local_transport', labelEn: 'Local Transport (CNG/Van)', labelBn: 'লোকাল ভ্যান/সিএনজি' },
    { id: 'customer_pickup', labelEn: 'Customer Pickup', labelBn: 'দোকান/কাউন্টার ডেলিভারি' },
  ]

  return (
    <div className="space-y-2.5">
      {/* Top Bar: View Mode Switcher + Live Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-muted border border-border shadow-2xs">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={viewMode === 'challans' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('challans')}
            className={cn(
              'text-xs h-8 px-3.5 rounded-xl font-bold transition-all shrink-0',
              viewMode === 'challans'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
            )}
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            <span>{tBilingual('Challan Deliveries', 'চালান ডেলিভারি')}</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'installations' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('installations')}
            className={cn(
              'text-xs h-8 px-3.5 rounded-xl font-bold transition-all shrink-0',
              viewMode === 'installations'
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
            )}
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            <span>{tBilingual('On-Site Installations', 'সাইনেজ ফিটিং')}</span>
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('calendar')}
            className={cn(
              'text-xs h-8 px-3.5 rounded-xl font-bold transition-all shrink-0',
              viewMode === 'calendar'
                ? 'bg-secondary hover:bg-foreground text-white shadow-xs dark:bg-muted'
                : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
            )}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <span>{tBilingual('Dispatch Calendar', 'ক্যালেন্ডার')}</span>
          </Button>
        </div>

        {/* Search Input & Due Filter Toggle */}
        <div className="flex items-center gap-2">
          {viewMode === 'challans' && (
            <Button
              size="sm"
              variant={dueOnly ? 'default' : 'outline'}
              onClick={() => onDueOnlyChange(!dueOnly)}
              className={cn(
                'h-8 text-xs font-bold rounded-xl border shrink-0',
                dueOnly
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                  : 'bg-card text-foreground border-border hover:border-rose-300'
              )}
            >
              <DollarSign className="h-3 w-3 mr-1 text-rose-500" />
              <span>{tBilingual('Unpaid Due Only', 'বকেয়া চালান')}</span>
            </Button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={tBilingual('Search challan, customer, vehicle...', 'চালান নং, কাস্টমার, গাড়ি...')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-card rounded-xl border-border dark:border-border"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Method Filters (For Challans View) */}
      {viewMode === 'challans' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-2xs font-semibold text-muted-foreground shrink-0 mr-1 bangla-text">
            {tBilingual('Method:', 'মাধ্যম:')}
          </span>
          {methodTabs.map((tab) => {
            const isSelected = selectedMethod === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onMethodChange(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 border cursor-pointer',
                  isSelected
                    ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted dark:hover:bg-muted/60'
                )}
              >
                {tBilingual(tab.labelEn, tab.labelBn)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
