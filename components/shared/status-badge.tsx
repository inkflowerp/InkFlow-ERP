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
 containerClasses: 'bg-muted text-foreground border-border ',
 dotClasses: 'bg-muted-foreground 0',
  },
 quotation: {
 labelEn: 'Quotation',
 labelBn: 'কোটেশন',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 approved: {
 labelEn: 'Approved',
 labelBn: 'অনুমোদিত',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 confirmed: {
 labelEn: 'Confirmed',
 labelBn: 'নিশ্চিত',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 designing: {
 labelEn: 'Designing',
 labelBn: 'ডিজাইনিং',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 in_prepress: {
 labelEn: 'In Prepress',
 labelBn: 'প্রি-প্রেসে',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 queued_for_print: {
 labelEn: 'Queued for Press',
 labelBn: 'প্রেসে অপেক্ষমাণ',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 in_production: {
 labelEn: 'In Production',
 labelBn: 'প্রোডাকশনে',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 quality_check: {
 labelEn: 'Quality Check',
 labelBn: 'কিউসি চেক',
 containerClasses: 'bg-warning-surface text-warning border-warning-border bg-warning-surface/60 text-warning border-warning-border',
 dotClasses: 'bg-warning bg-warning',
  },
 ready_for_delivery: {
 labelEn: 'Ready for Delivery',
 labelBn: 'ডেলিভারির জন্য প্রস্তুত',
 containerClasses: 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border',
 dotClasses: 'bg-primary bg-primary',
  },
 delivered: {
 labelEn: 'Delivered',
 labelBn: 'ডেলিভার্ড',
 containerClasses: 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success border-success-border',
 dotClasses: 'bg-success bg-success',
  },
 installed: {
 labelEn: 'Installed',
 labelBn: 'ইন্সটল্ড',
 containerClasses: 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success border-success-border',
 dotClasses: 'bg-success bg-success',
  },
 completed: {
 labelEn: 'Completed',
 labelBn: 'সম্পন্ন',
 containerClasses: 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success border-success-border',
 dotClasses: 'bg-success bg-success',
  },
 cancelled: {
 labelEn: 'Cancelled',
 labelBn: 'বাতিল',
 containerClasses: 'bg-danger-surface text-destructive border-danger-border bg-danger-surface/60 text-destructive border-danger-border',
 dotClasses: 'bg-destructive bg-destructive',
  },
 paid: {
 labelEn: 'Paid',
 labelBn: 'পরিশোধিত',
 containerClasses: 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success border-success-border',
 dotClasses: 'bg-success bg-success',
  },
 unpaid: {
 labelEn: 'Unpaid',
 labelBn: 'বকেয়া',
 containerClasses: 'bg-danger-surface text-destructive border-danger-border bg-danger-surface/60 text-destructive border-danger-border',
 dotClasses: 'bg-destructive bg-destructive',
  },
 partially_paid: {
 labelEn: 'Partially Paid',
 labelBn: 'আংশিক পরিশোধ',
 containerClasses: 'bg-warning-surface text-warning border-warning-border bg-warning-surface/60 text-warning border-warning-border',
 dotClasses: 'bg-warning bg-warning',
  },
 overdue: {
 labelEn: 'Overdue',
 labelBn: 'বিলম্বিত',
 containerClasses: 'bg-danger-surface text-destructive border-danger-border bg-danger-surface/60 text-destructive border-danger-border',
 dotClasses: 'bg-destructive bg-destructive',
  },
 low_stock: {
 labelEn: 'Low Stock',
 labelBn: 'কম স্টক',
 containerClasses: 'bg-warning-surface text-warning border-warning-border bg-warning-surface/60 text-warning border-warning-border',
 dotClasses: 'bg-warning bg-warning',
  },
 active: {
 labelEn: 'Active',
 labelBn: 'সক্রিয়',
 containerClasses: 'bg-success-surface text-success border-success-border bg-success-surface/60 text-success border-success-border',
 dotClasses: 'bg-success bg-success',
  },
 inactive: {
 labelEn: 'Inactive',
 labelBn: 'নিষ্ক্রিয়',
 containerClasses: 'bg-muted text-foreground border-border ',
 dotClasses: 'bg-muted-foreground 0',
  },
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
 const { tBilingual } = useI18n()

 const normalized = (status || 'draft').toLowerCase()
 const config = STATUS_DICTIONARY[normalized] || {
 labelEn: status,
 labelBn: status,
 containerClasses: 'bg-muted text-muted-foreground border-border',
 dotClasses: 'bg-muted-foreground',
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
