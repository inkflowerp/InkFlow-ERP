'use client'

import React from 'react'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export type StandardStatusType =
  | 'draft'
  | 'quotation'
  | 'approved'
  | 'confirmed'
  | 'designing'
  | 'in_prepress'
  | 'queued_for_print'
  | 'in_production'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'delivered'
  | 'installed'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'unpaid'
  | 'partially_paid'
  | 'overdue'
  | 'low_stock'
  | 'active'
  | 'inactive'

interface StatusBadgeProps {
  status: StandardStatusType | string
  className?: string
  showDot?: boolean
}

interface StatusConfig {
  labelEn: string
  labelBn: string
  containerClasses: string
  dotClasses: string
}

const STATUS_DICTIONARY: Record<string, StatusConfig> = {
  draft: {
    labelEn: 'Draft',
    labelBn: 'খসড়া',
    containerClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dotClasses: 'bg-slate-500 dark:bg-slate-400',
  },
  quotation: {
    labelEn: 'Quotation',
    labelBn: 'কোটেশন',
    containerClasses: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotClasses: 'bg-blue-600 dark:bg-blue-400',
  },
  approved: {
    labelEn: 'Approved',
    labelBn: 'অনুমোদিত',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  confirmed: {
    labelEn: 'Confirmed',
    labelBn: 'নিশ্চিত',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  designing: {
    labelEn: 'Designing',
    labelBn: 'ডিজাইনিং',
    containerClasses: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    dotClasses: 'bg-purple-600 dark:bg-purple-400',
  },
  in_prepress: {
    labelEn: 'In Prepress',
    labelBn: 'প্রি-প্রেসে',
    containerClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    dotClasses: 'bg-indigo-600 dark:bg-indigo-400',
  },
  queued_for_print: {
    labelEn: 'Queued for Press',
    labelBn: 'প্রেসে অপেক্ষমাণ',
    containerClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    dotClasses: 'bg-indigo-600 dark:bg-indigo-400',
  },
  in_production: {
    labelEn: 'In Production',
    labelBn: 'প্রোডাকশনে',
    containerClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClasses: 'bg-amber-600 dark:bg-amber-400',
  },
  quality_check: {
    labelEn: 'Quality Check',
    labelBn: 'কিউসি চেক',
    containerClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClasses: 'bg-amber-600 dark:bg-amber-400',
  },
  ready_for_delivery: {
    labelEn: 'Ready for Delivery',
    labelBn: 'ডেলিভারির জন্য প্রস্তুত',
    containerClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    dotClasses: 'bg-indigo-600 dark:bg-indigo-400',
  },
  delivered: {
    labelEn: 'Delivered',
    labelBn: 'ডেলিভার্ড',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  installed: {
    labelEn: 'Installed',
    labelBn: 'ইন্সটল্ড',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  completed: {
    labelEn: 'Completed',
    labelBn: 'সম্পন্ন',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  cancelled: {
    labelEn: 'Cancelled',
    labelBn: 'বাতিল',
    containerClasses: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotClasses: 'bg-rose-600 dark:bg-rose-400',
  },
  paid: {
    labelEn: 'Paid',
    labelBn: 'পরিশোধিত',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  unpaid: {
    labelEn: 'Unpaid',
    labelBn: 'বকেয়া',
    containerClasses: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotClasses: 'bg-rose-600 dark:bg-rose-400',
  },
  partially_paid: {
    labelEn: 'Partially Paid',
    labelBn: 'আংশিক পরিশোধ',
    containerClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClasses: 'bg-amber-600 dark:bg-amber-400',
  },
  overdue: {
    labelEn: 'Overdue',
    labelBn: 'বিলম্বিত',
    containerClasses: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse',
    dotClasses: 'bg-rose-600 dark:bg-rose-400',
  },
  low_stock: {
    labelEn: 'Low Stock',
    labelBn: 'কম স্টক',
    containerClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClasses: 'bg-amber-600 dark:bg-amber-400',
  },
  active: {
    labelEn: 'Active',
    labelBn: 'সক্রিয়',
    containerClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClasses: 'bg-emerald-600 dark:bg-emerald-400',
  },
  inactive: {
    labelEn: 'Inactive',
    labelBn: 'নিষ্ক্রিয়',
    containerClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dotClasses: 'bg-slate-500 dark:bg-slate-400',
  },
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const { tBilingual } = useI18n()

  const normalized = (status || 'draft').toLowerCase()
  const config = STATUS_DICTIONARY[normalized] || {
    labelEn: status,
    labelBn: status,
    containerClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dotClasses: 'bg-slate-500 dark:bg-slate-400',
  }

  const label = tBilingual(config.labelEn, config.labelBn)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide transition-colors whitespace-nowrap',
        config.containerClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotClasses)} />
      )}
      <span className="bangla-text">{label}</span>
    </span>
  )
}
