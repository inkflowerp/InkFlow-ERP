'use client'

import React from 'react'
import {
  LayoutGrid,
  Printer,
  Cpu,
  Table as TableIcon,
  Search,
  Flame,
  ShieldAlert,
  Layers,
  Wrench,
  Truck,
  Sparkles,
  Scissors,
  X,
  Clock,
  UserCheck,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'

export type ProductionViewMode = 'board' | 'terminal' | 'machine_queues' | 'table'

export interface ProductionFilterToolbarProps {
  viewMode: ProductionViewMode
  onViewModeChange: (mode: ProductionViewMode) => void
  selectedDept: string
  onSelectDept: (dept: string) => void
  search: string
  onSearchChange: (search: string) => void
  urgentOnly: boolean
  onToggleUrgentOnly: (val: boolean) => void
  onAutoGenerateClick: () => void
  quickFilter?: string
  onSelectQuickFilter?: (qf: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function ProductionFilterToolbar({
  viewMode,
  onViewModeChange,
  selectedDept,
  onSelectDept,
  search,
  onSearchChange,
  urgentOnly,
  onToggleUrgentOnly,
  onAutoGenerateClick,
  quickFilter = 'all',
  onSelectQuickFilter,
  onRefresh,
  isRefreshing = false,
}: ProductionFilterToolbarProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const departments = [
    { id: 'all', labelEn: 'All Sectors', labelBn: 'সকল বিভাগ', icon: Layers },
    { id: 'printing', labelEn: 'Digital Wide-Format', labelBn: 'ডিজিটাল প্রিন্ট', icon: Printer },
    { id: 'offset', labelEn: 'Offset Press', labelBn: 'অফসেট প্রেস', icon: Printer },
    { id: 'finishing', labelEn: 'Finishing & Binding', labelBn: 'ফিনিশিং ও বাইন্ডিং', icon: Scissors },
    { id: 'fabrication', labelEn: 'Signage & Metal', labelBn: 'সাইনেজ ও মেটাল', icon: Wrench },
    { id: 'installation', labelEn: 'Site Rigging', labelBn: 'ইনস্টলেশন', icon: Truck },
  ]

  const quickFilterChips = [
    { id: 'all', labelEn: 'All Jobs', labelBn: 'সকল কাজ', icon: Layers },
    { id: 'urgent', labelEn: 'Urgent Only', labelBn: 'জরুরি ডেলিভারি', icon: ShieldAlert, color: 'text-rose-600' },
    { id: 'due_today', labelEn: 'Due Today', labelBn: 'আজকের ডেলিভারি', icon: Clock, color: 'text-amber-600' },
    { id: 'running', labelEn: 'Running Floor', labelBn: 'মেশিনে রানিং', icon: Flame, color: 'text-blue-600' },
    { id: 'walk_in', labelEn: 'Walk-in Clients', labelBn: 'দোকানে বসা', icon: UserCheck, color: 'text-orange-600' },
    { id: 'on_hold', labelEn: 'On Hold', labelBn: 'স্থগিতাদেশ', icon: AlertOctagon, color: 'text-amber-600' },
  ]

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
      {/* Top Row: Search + Quick Chips + View Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              isBn
                ? 'জব নম্বর, ইনভয়েস #, অর্ডার #, কাস্টমার বা মেশিন খুঁজুন...'
                : 'Search job #, invoice #, order #, client, or machine...'
            }
            className="text-xs pl-9 pr-8 h-9 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 4-Way View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'board'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>{isBn ? 'কার্ড ভিউ' : 'Cards View'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('terminal')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'terminal'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isBn ? 'শপ ফ্লোর টার্মিনাল' : 'Floor Terminal'}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('machine_queues')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'machine_queues'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-purple-600" />
            <span>{isBn ? 'মেশিন কিউ' : 'Fleet Queues'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>{isBn ? 'টাস্ক তালিকা' : 'Task Table'}</span>
          </button>
        </div>

        {/* Action: Auto Generate Tasks */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoGenerateClick}
            className="text-xs h-9 gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40 rounded-xl cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>{isBn ? 'অর্ডার থেকে টাস্ক জেনারেট' : 'Auto-Generate Tasks'}</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Quick Filter Chips (No duplicate emojis) + Sector Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
          {quickFilterChips.map((chip) => {
            const Icon = chip.icon
            const isSelected =
              chip.id === 'urgent' ? urgentOnly : (quickFilter === chip.id && !urgentOnly)

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  if (chip.id === 'urgent') {
                    onToggleUrgentOnly(!urgentOnly)
                  } else {
                    if (urgentOnly) onToggleUrgentOnly(false)
                    if (onSelectQuickFilter) onSelectQuickFilter(chip.id)
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${chip.color || ''}`} />
                <span>{isBn ? chip.labelBn : chip.labelEn}</span>
              </button>
            )
          })}
        </div>

        {/* Sector / Department Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            {isBn ? 'বিভাগ:' : 'Sector:'}
          </span>
          <select
            value={selectedDept}
            onChange={(e) => onSelectDept(e.target.value)}
            className="text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 font-medium shadow-xs focus:outline-hidden"
          >
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {isBn ? dept.labelBn : dept.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
