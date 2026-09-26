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
    { id: 'urgent', label: 'অতি জরুরী (Urgent)', icon: Zap },
    { id: 'walk_in', label: 'দোকানে বসা (Walk-in)', icon: UserCheck },
    { id: 'due_today', label: 'আজকের ডেলিভারি (Today)', icon: Calendar },
    { id: 'design_needed', label: 'ডিজাইন প্রয়োজন', icon: Sparkles },
    { id: 'design_ok', label: 'ফাইল রেডি চেক', icon: Filter },
  ] as const

  return (
    <div className="space-y-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="কাস্টমার, মোবাইল, ইনভয়েস #, DSN # বা কাজের নাম..."
            className="pl-9 text-xs bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 h-9 rounded-xl focus-visible:ring-indigo-500"
          />
        </div>

        {/* Right Tools: Designer Dropdown, Refresh & View Mode Switcher */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Designer Filter */}
          <select
            value={filters.selectedDesigner}
            onChange={(e) => onFilterChange({ selectedDesigner: e.target.value })}
            className="text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/80 px-3 h-9 text-slate-700 dark:text-slate-300 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
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
            className="h-9 px-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </Button>

          {/* View Switcher */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'cards' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>কার্ড ভিউ</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'table' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all border cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50'
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
