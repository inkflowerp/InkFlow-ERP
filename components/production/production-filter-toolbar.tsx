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
}: ProductionFilterToolbarProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const departments = [
    { id: 'all', labelEn: 'All Sectors', labelBn: 'সকল বিভাগ', icon: Layers },
    { id: 'printing', labelEn: 'Digital Wide-Format', labelBn: 'ডিজিটাল প্রিন্ট', icon: Printer },
    { id: 'offset', labelEn: 'Offset Press & Plates', labelBn: 'অফসেট প্রেস', icon: Printer },
    { id: 'finishing', labelEn: 'Lamination & Die-Cut', labelBn: 'ফিনিশিং ও বাইন্ডিং', icon: Scissors },
    { id: 'fabrication', labelEn: '3D Signage & Metal', labelBn: 'সাইনেজ ও মেটাল', icon: Wrench },
    { id: 'installation', labelEn: 'Site Rigging', labelBn: 'ইনস্টলেশন', icon: Truck },
  ]

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Top Row: View Mode Switcher + Auto-Generate Trigger */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* 4-Way View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'board'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>{isBn ? 'প্রোডাকশন বোর্ড' : 'Kanban Board'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('terminal')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'terminal'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isBn ? 'শপ ফ্লোর টার্মিনাল' : 'Floor Terminal'}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('machine_queues')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'machine_queues'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-purple-600" />
            <span>{isBn ? 'মেশিন কিউ (NOW/NEXT)' : 'Fleet Queues'}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>{isBn ? 'টাস্ক তালিকা' : 'Task List'}</span>
          </button>
        </div>

        {/* Right Action: Auto Generate Tasks button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoGenerateClick}
            className="text-xs h-8 gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>{isBn ? 'অর্ডার থেকে টাস্ক জেনারেট' : 'Auto-Generate Tasks'}</span>
          </Button>
        </div>
      </div>

      {/* Bottom Row: Sector / Department Chips + Priority Flag + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Department Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {departments.map((dept) => {
            const Icon = dept.icon
            const isSelected = selectedDept === dept.id
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => onSelectDept(dept.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{isBn ? dept.labelBn : dept.labelEn}</span>
              </button>
            )
          })}
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-2">
          {/* Urgent / Rush toggle */}
          <button
            type="button"
            onClick={() => onToggleUrgentOnly(!urgentOnly)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              urgentOnly
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-rose-600 border-rose-200 dark:bg-slate-900 dark:border-rose-900/60 hover:bg-rose-50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{isBn ? 'জরুরি কাজ' : 'Rush Only'}</span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isBn ? 'জব, কাস্টমার, মিডিয়া খুঁজুন...' : 'Search job, client, media...'}
              className="text-xs pl-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
