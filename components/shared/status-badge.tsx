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
    containerClasses: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dotClasses: 'bg-slate-400',
  },
  quotation: {
    labelEn: 'Quotation',
    labelBn: 'কোটেশন',
    containerClasses: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dotClasses: 'bg-blue-400',
  },
  approved: {
    labelEn: 'Approved',
    labelBn: 'অনুমোদিত',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  confirmed: {
    labelEn: 'Confirmed',
    labelBn: 'নিশ্চিত',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  designing: {
    labelEn: 'Designing',
    labelBn: 'ডিজাইনিং',
    containerClasses: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    dotClasses: 'bg-purple-400',
  },
  in_prepress: {
    labelEn: 'In Prepress',
    labelBn: 'প্রি-প্রেসে',
    containerClasses: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    dotClasses: 'bg-indigo-400',
  },
  queued_for_print: {
    labelEn: 'Queued for Press',
    labelBn: 'প্রেসে অপেক্ষমাণ',
    containerClasses: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    dotClasses: 'bg-indigo-400',
  },
  in_production: {
    labelEn: 'In Production',
    labelBn: 'প্রোডাকশনে',
    containerClasses: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClasses: 'bg-amber-400',
  },
  quality_check: {
    labelEn: 'Quality Check',
    labelBn: 'কিউসি চেক',
    containerClasses: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClasses: 'bg-amber-400',
  },
  ready_for_delivery: {
    labelEn: 'Ready for Delivery',
    labelBn: 'ডেলিভারির জন্য প্রস্তুত',
    containerClasses: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    dotClasses: 'bg-indigo-400',
  },
  delivered: {
    labelEn: 'Delivered',
    labelBn: 'ডেলিভার্ড',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  installed: {
    labelEn: 'Installed',
    labelBn: 'ইন্সটল্ড',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  completed: {
    labelEn: 'Completed',
    labelBn: 'সম্পন্ন',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  cancelled: {
    labelEn: 'Cancelled',
    labelBn: 'বাতিল',
    containerClasses: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dotClasses: 'bg-rose-400',
  },
  paid: {
    labelEn: 'Paid',
    labelBn: 'পরিশোধিত',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  unpaid: {
    labelEn: 'Unpaid',
    labelBn: 'বকেয়া',
    containerClasses: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dotClasses: 'bg-rose-400',
  },
  partially_paid: {
    labelEn: 'Partially Paid',
    labelBn: 'আংশিক পরিশোধ',
    containerClasses: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClasses: 'bg-amber-400',
  },
  overdue: {
    labelEn: 'Overdue',
    labelBn: 'বিলম্বিত',
    containerClasses: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse',
    dotClasses: 'bg-rose-400',
  },
  low_stock: {
    labelEn: 'Low Stock',
    labelBn: 'কম স্টক',
    containerClasses: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClasses: 'bg-amber-400',
  },
  active: {
    labelEn: 'Active',
    labelBn: 'সক্রিয়',
    containerClasses: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dotClasses: 'bg-emerald-400',
  },
  inactive: {
    labelEn: 'Inactive',
    labelBn: 'নিষ্ক্রিয়',
    containerClasses: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dotClasses: 'bg-slate-400',
  },
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const { tBilingual } = useI18n()

  const normalized = (status || 'draft').toLowerCase()
  const config = STATUS_DICTIONARY[normalized] || {
    labelEn: status,
    labelBn: status,
    containerClasses: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dotClasses: 'bg-slate-400',
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
