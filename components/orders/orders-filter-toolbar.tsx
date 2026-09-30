'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  UserCheck,
  Calendar,
  Layers,
  RefreshCw,
  Wallet,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export interface OrderFilterState {
  searchQuery: string
  quickFilter: 'all' | 'due_today' | 'blocked' | 'overdue' | 'payment_due' | 'urgent' | 'walk_in' | 'unpaid_due'
  selectedPriority: string
  viewMode: 'cards' | 'table'
}

interface OrdersFilterToolbarProps {
  filters: OrderFilterState
  onFilterChange: (newFilters: Partial<OrderFilterState>) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export const OrdersFilterToolbar = React.memo(function OrdersFilterToolbar({
  filters,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: OrdersFilterToolbarProps) {
  const { tBilingual } = useI18n()

  const filterChips = [
    { id: 'all', label: tBilingual('All', 'সব'), icon: Layers },
    { id: 'due_today', label: tBilingual('Due Today', 'আজকের ডেলিভারি'), icon: Calendar },
    { id: 'blocked', label: tBilingual('Blocked', 'স্থগিত'), icon: AlertTriangle },
    { id: 'overdue', label: tBilingual('Overdue', 'বিলম্বিত'), icon: AlertOctagon },
    { id: 'payment_due', label: tBilingual('Payment Due', 'বকেয়া বাকি'), icon: Wallet },
    { id: 'urgent', label: tBilingual('Urgent', 'জরুরী'), icon: Zap },
  ] as const

  return (
    <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input: Order #, Job #, Customer, Phone, Invoice #, Product, Operator, Machine */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder={tBilingual(
              'Search order #, job #, customer, phone, invoice #, product, operator, machine...',
              'অর্ডার #, জব #, কাস্টমার, ফোন, ইনভয়েস #, পণ্য, অপারেটর, মেশিন খুঁজুন...'
            )}
            className="pl-9 text-xs bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl h-8 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Right Tools: Priority Dropdown, Refresh & View Mode Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Priority Filter */}
          <select
            value={filters.selectedPriority}
            onChange={(e) => onFilterChange({ selectedPriority: e.target.value })}
            className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 h-8 text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <option value="all">{tBilingual('All Priority', 'সকল প্রায়োরিটি')}</option>
            <option value="normal">{tBilingual('Normal', 'সাধারণ')}</option>
            <option value="urgent">{tBilingual('Urgent', 'জরুরী')}</option>
            <option value="very_urgent">{tBilingual('Very Urgent', 'খুবই জরুরী')}</option>
          </select>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={tBilingual('Refresh Orders', 'অর্ডার রিফ্রেশ করুন')}
            className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>

          {/* View Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'cards' })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{tBilingual('Cards', 'কার্ড')}</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'table' })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>{tBilingual('Table', 'টেবিল')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
        {filterChips.map((chip) => {
          const Icon = chip.icon
          const isActive = filters.quickFilter === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange({ quickFilter: chip.id })}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})
