'use client'

import React from 'react'
import {
  TrendingUp,
  Printer,
  FileSpreadsheet,
  Truck,
  Plus,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Receipt,
  Users,
  CreditCard,
  Building,
  FileText,
  Percent,
  Sparkles,
  BarChart3,
  ShieldCheck,
  MoreHorizontal,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import type { QuickActionItem } from '@/lib/dashboard/dashboard-engine'

export const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Printer,
  FileSpreadsheet,
  Truck,
  Plus,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Receipt,
  Users,
  CreditCard,
  Building,
  FileText,
  Percent,
  Sparkles,
  BarChart3,
  ShieldCheck,
}

interface DashboardQuickActionsProps {
  primaryActions: QuickActionItem[]
  hasSecondaryActions: boolean
  onExecuteAction: (qa: QuickActionItem) => void
  onOpenMoreActions: () => void
}

export function DashboardQuickActions({
  primaryActions,
  hasSecondaryActions,
  onExecuteAction,
  onOpenMoreActions,
}: DashboardQuickActionsProps) {
  const { tBilingual } = useI18n()

  return (
    <Card className="p-4 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
            {tBilingual('Quick Operations', 'দ্রুত কাজ')}
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 bangla-text hidden sm:inline">
          {tBilingual('1-click direct shortcuts', '১ ক্লিকে দ্রুত কাজ')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {primaryActions.map((qa) => {
          const Icon = ICON_MAP[qa.icon] || Plus
          return (
            <Button
              key={qa.id}
              type="button"
              variant="outline"
              onClick={() => onExecuteAction(qa)}
              className="h-11 sm:h-12 px-2.5 flex items-center justify-start gap-2 text-xs font-bold border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px] text-left"
            >
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate bangla-text leading-tight">
                {tBilingual(qa.labelEn, qa.labelBn)}
              </span>
            </Button>
          )
        })}

        {hasSecondaryActions && (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenMoreActions}
            className="h-11 sm:h-12 px-2.5 flex items-center justify-center gap-2 text-xs font-bold border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
          >
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
            <span className="bangla-text">{tBilingual('More Actions', 'অন্যান্য কাজ')}</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
