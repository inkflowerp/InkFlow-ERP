'use client'

import React from 'react'
import { Badge, type BadgeProps } from './badge'
import { cn } from '@/lib/utils'

export type DomainStatus =
  // Orders & Production
  | 'pending'
  | 'in_design'
  | 'waiting_approval'
  | 'approved'
  | 'in_production'
  | 'printing'
  | 'finishing'
  | 'finishing_pending'
  | 'ready'
  | 'ready_delivery'
  | 'ready_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  // Invoices & Billing
  | 'draft'
  | 'unpaid'
  | 'partially_paid'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'refunded'
  // Quotations
  | 'sent'
  | 'rejected'
  | 'expired'
  // Subscriptions & Platform
  | 'active'
  | 'trial'
  | 'trialing'
  | 'past_due'
  | 'suspended'
  // Inventory
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  // HR & Attendance
  | 'present'
  | 'late'
  | 'absent'
  | 'half_day'
  | 'on_leave'
  | 'leave'
  // Support & Incidents
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'critical'
  | string

interface StatusConfig {
  variant: NonNullable<BadgeProps['variant']>
  labelEn: string
  labelBn: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Positive / Success
  paid: { variant: 'success', labelEn: 'Paid', labelBn: 'পরিশোধিত' },
  completed: { variant: 'success', labelEn: 'Completed', labelBn: 'সম্পন্ন' },
  delivered: { variant: 'success', labelEn: 'Delivered', labelBn: 'ডেলিভার্ড' },
  approved: { variant: 'success', labelEn: 'Approved', labelBn: 'অনুমোদিত' },
  active: { variant: 'success', labelEn: 'Active', labelBn: 'সক্রিয়' },
  in_stock: { variant: 'success', labelEn: 'In Stock', labelBn: 'মজুদ আছে' },
  present: { variant: 'success', labelEn: 'Present', labelBn: 'উপস্থিত' },
  resolved: { variant: 'success', labelEn: 'Resolved', labelBn: 'সমাধানকৃত' },

  // Attention / Progress (Info or Primary)
  in_production: { variant: 'default', labelEn: 'In Production', labelBn: 'উৎপাদনে' },
  printing: { variant: 'default', labelEn: 'Printing', labelBn: 'প্রিন্টিং' },
  finishing: { variant: 'default', labelEn: 'Finishing', labelBn: 'ফিনিশিং' },
  in_design: { variant: 'info', labelEn: 'In Design', labelBn: 'ডিজাইনে' },
  in_progress: { variant: 'info', labelEn: 'In Progress', labelBn: 'চলমান' },
  ready: { variant: 'info', labelEn: 'Ready', labelBn: 'প্রস্তুত' },
  ready_delivery: { variant: 'info', labelEn: 'Ready for Delivery', labelBn: 'ডেলিভারির জন্য প্রস্তুত' },
  ready_for_delivery: { variant: 'info', labelEn: 'Ready for Delivery', labelBn: 'ডেলিভারির জন্য প্রস্তুত' },
  sent: { variant: 'info', labelEn: 'Sent', labelBn: 'প্রেরিত' },
  trial: { variant: 'info', labelEn: 'Trial', labelBn: 'ট্রায়াল' },
  trialing: { variant: 'info', labelEn: 'Trialing', labelBn: 'ট্রায়াল চলছে' },

  // Warning
  pending: { variant: 'warning', labelEn: 'Pending', labelBn: 'অপেক্ষমাণ' },
  waiting_approval: { variant: 'warning', labelEn: 'Waiting Approval', labelBn: 'অনুমোদনের অপেক্ষায়' },
  finishing_pending: { variant: 'warning', labelEn: 'Finishing Queue', labelBn: 'ফিনিশিং অপেক্ষমাণ' },
  partially_paid: { variant: 'warning', labelEn: 'Partially Paid', labelBn: 'আংশিক পরিশোধ' },
  partial: { variant: 'warning', labelEn: 'Partial', labelBn: 'আংশিক' },
  low_stock: { variant: 'warning', labelEn: 'Low Stock', labelBn: 'স্বল্প স্টক' },
  late: { variant: 'warning', labelEn: 'Late', labelBn: 'বিলম্ব' },
  half_day: { variant: 'warning', labelEn: 'Half Day', labelBn: 'অর্ধ দিবস' },
  past_due: { variant: 'warning', labelEn: 'Past Due', labelBn: 'বকেয়া পড়েছে' },
  open: { variant: 'warning', labelEn: 'Open', labelBn: 'উন্মুক্ত' },

  // Danger / Destructive
  unpaid: { variant: 'destructive', labelEn: 'Unpaid', labelBn: 'অপরিশোধিত' },
  overdue: { variant: 'destructive', labelEn: 'Overdue', labelBn: 'মেয়াদোত্তীর্ণ বকেয়া' },
  cancelled: { variant: 'destructive', labelEn: 'Cancelled', labelBn: 'বাতিল' },
  rejected: { variant: 'destructive', labelEn: 'Rejected', labelBn: 'প্রত্যাখ্যাত' },
  out_of_stock: { variant: 'destructive', labelEn: 'Out of Stock', labelBn: 'স্টক শেষ' },
  absent: { variant: 'destructive', labelEn: 'Absent', labelBn: 'অনুপস্থিত' },
  suspended: { variant: 'destructive', labelEn: 'Suspended', labelBn: 'স্থগিত' },
  critical: { variant: 'destructive', labelEn: 'Critical', labelBn: 'জরুরি' },

  // Neutral / Secondary
  draft: { variant: 'secondary', labelEn: 'Draft', labelBn: 'খসড়া' },
  void: { variant: 'secondary', labelEn: 'Void', labelBn: 'বাতিলকৃত' },
  expired: { variant: 'secondary', labelEn: 'Expired', labelBn: 'মেয়াদোত্তীর্ণ' },
  closed: { variant: 'secondary', labelEn: 'Closed', labelBn: 'বন্ধ' },
  on_leave: { variant: 'secondary', labelEn: 'On Leave', labelBn: 'ছুটিতে' },
  leave: { variant: 'secondary', labelEn: 'Leave', labelBn: 'ছুটি' },
}

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: DomainStatus
  locale?: 'en' | 'bn'
  showDot?: boolean
}

export function StatusBadge({
  status,
  locale = 'bn',
  showDot = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = String(status || '').toLowerCase().replace(/[-\s]/g, '_')
  const config = STATUS_MAP[normalizedKey] || {
    variant: 'secondary' as const,
    labelEn: status,
    labelBn: status,
  }

  const label = children || (locale === 'bn' ? config.labelBn : config.labelEn)

  return (
    <Badge variant={config.variant} className={cn('capitalize', className)} {...props}>
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full mr-1 shrink-0',
            config.variant === 'success' && 'bg-success',
            config.variant === 'warning' && 'bg-warning',
            config.variant === 'destructive' && 'bg-danger',
            config.variant === 'info' && 'bg-info',
            config.variant === 'default' && 'bg-primary',
            config.variant === 'secondary' && 'bg-muted-foreground'
          )}
        />
      )}
      <span>{label}</span>
    </Badge>
  )
}
