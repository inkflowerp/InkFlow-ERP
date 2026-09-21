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
  Filter,
  RefreshCw,
} from 'lucide-react'

export interface FilterState {
  searchQuery: string
  quickFilter: 'all' | 'urgent' | 'walk_in' | 'due_today' | 'design_needed' | 'design_ok'
  selectedDesigner: string
  viewMode: 'cards' | 'table'
}

interface DesignFilterToolbarProps {
  filters: FilterState
  designers: string[]
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export const DesignFilterToolbar = React.memo(function DesignFilterToolbar({
  filters,
  designers,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: DesignFilterToolbarProps) {
  const filterChips = [
    { id: 'all', label: 'সব কাজ (All)', icon: Layers },
    { id: 'urgent', label: '🚨 অতি জরুরী (Urgent)', icon: Zap },
    { id: 'walk_in', label: '🏃 দোকানে বসা (Walk-in)', icon: UserCheck },
    { id: 'due_today', label: '📅 আজকের ডেলিভারি (Today)', icon: Calendar },
    { id: 'design_needed', label: '🎨 ডিজাইন প্রয়োজন', icon: Sparkles },
    { id: 'design_ok', label: '✓ ফাইল রেডি চেক', icon: Filter },
  ] as const

  return (
    <div className="space-y-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="কাস্টমার, মোবাইল, ইনভয়েস #, DSN # বা কাজের নাম খুঁজুন..."
            className="pl-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 h-9"
          />
        </div>

        {/* Right Tools: Designer Dropdown, Refresh & View Mode Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Designer Filter */}
          <select
            value={filters.selectedDesigner}
            onChange={(e) => onFilterChange({ selectedDesigner: e.target.value })}
            className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 h-9 text-slate-700 dark:text-slate-300"
          >
            <option value="all">সব ডিজাইনার (All Designers)</option>
            {designers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 px-2.5 text-xs text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>

          {/* View Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'cards' })}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                filters.viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>কার্ড ভিউ</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'table' })}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                filters.viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>টেবিল ভিউ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterChips.map((chip) => {
          const Icon = chip.icon
          const isActive = filters.quickFilter === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange({ quickFilter: chip.id })}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})
