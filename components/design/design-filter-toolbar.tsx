'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterState {
  searchQuery: string
  quickFilter: 'all' | 'urgent' | 'walk_in' | 'due_today' | 'design_needed' | 'design_ok'
  selectedDesigner: string
  selectedPriority?: string
  selectedDate?: string
  viewMode: 'cards' | 'table'
}

interface DesignFilterToolbarProps {
  filters: FilterState
  activeTab: string
  tabCounts: {
    all: number
    new_tasks: number
    completed: number
    design_running?: number
    waiting_approval?: number
    revision?: number
    in_production?: number
  }
  designers: string[]
  onTabChange: (tabId: string) => void
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export const DesignFilterToolbar = React.memo(function DesignFilterToolbar({
  filters,
  activeTab,
  tabCounts,
  designers,
  onTabChange,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
}: DesignFilterToolbarProps) {
  const tabs = [
    { id: 'new_tasks', label: 'New', count: tabCounts.new_tasks },
    { id: 'completed', label: 'Completed', count: tabCounts.completed },
    { id: 'all', label: 'All Jobs', count: tabCounts.all },
  ]

  return (
    <div className="space-y-3">
      {/* 1. Status Filter Tabs (Pill Row) */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs',
                isActive
                  ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-2xs px-2 py-0.5 rounded-full font-bold font-mono',
                  isActive
                    ? 'bg-white text-blue-600 dark:bg-white dark:text-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 2. Unified Search and Dropdown Filter Bar */}
      <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search invoice, customer, job, product..."
            className="pl-9 text-xs bg-transparent border-0 focus-visible:ring-0 shadow-none h-8 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>

        {/* Right Dropdowns & Refresh Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          {/* All Designers Dropdown */}
          <select
            value={filters.selectedDesigner}
            onChange={(e) => onFilterChange({ selectedDesigner: e.target.value })}
            className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 h-8 text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <option value="all">All Designers</option>
            {designers.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* All Priority Dropdown */}
          <select
            value={filters.selectedPriority || 'all'}
            onChange={(e) => onFilterChange({ selectedPriority: e.target.value })}
            className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 h-8 text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="very_urgent">Very Urgent</option>
            <option value="normal">Normal</option>
          </select>

          {/* All Dates Dropdown */}
          <select
            value={filters.selectedDate || 'all'}
            onChange={(e) => onFilterChange({ selectedDate: e.target.value })}
            className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 h-8 text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="2_days">Next 2 Days</option>
            <option value="this_week">This Week</option>
          </select>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer shadow-none"
            title="Refresh"
          >
            <RotateCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-blue-600')} />
          </Button>
        </div>
      </div>
    </div>
  )
})
