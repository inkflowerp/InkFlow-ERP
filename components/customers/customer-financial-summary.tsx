'use client'

import React from 'react'
import {
 CreditCard,
 AlertCircle,
 CheckCircle2,
 ShoppingBag,
 TrendingUp,
} from 'lucide-react'
import { CustomerFinancialSummary } from '@/types/crm.types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'

interface CustomerFinancialSummaryProps {
 summary: CustomerFinancialSummary
 isLoading?: boolean
}

export function CustomerFinancialSummaryCards({
 summary,
 isLoading = false,
}: CustomerFinancialSummaryProps) {
 const { tBilingual } = useI18n()

 if (isLoading) {
 return (
      <KpiGrid columns={6}>
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCard key={i} isLoading={true} />
        ))}
      </KpiGrid>
    )
  }

 const hasDue = summary.totalDue > 0
 const hasOverdue = (summary.totalOverdue || 0) > 0
 const creditLimit = summary.creditLimit || 0
 const availableCredit = summary.availableCredit !== undefined ? summary.availableCredit : Math.max(0, creditLimit - summary.totalDue)

 return (
    <KpiGrid columns={6}>
      {/* 1. Total Billed */}
      <KpiCard
 titleEn="Total Billed"titleBn="মোট বিল"value={summary.totalInvoiceAmount}
 isCurrency
 icon={TrendingUp}
 colorVariant="blue"subtitleEn={`Across ${summary.totalInvoices} invoice${summary.totalInvoices === 1 ? '' : 's'}`}
 subtitleBn={`${summary.totalInvoices}টি চালানের মোট`}
      />

      {/* 2. Total Paid */}
      <KpiCard
 titleEn="Total Paid"titleBn="মোট পরিশোধ"value={summary.totalPaid}
 isCurrency
 icon={CheckCircle2}
 colorVariant="emerald"subtitleEn="Verified collections"subtitleBn="যাচাইকৃত আদায়"/>

      {/* 3. Current Due */}
      <KpiCard
 titleEn="Current Due"titleBn="চলতি বকেয়া"value={summary.totalDue}
 isCurrency
 icon={AlertCircle}
 colorVariant={hasDue ? 'amber' : 'slate'}
 subtitleEn={hasDue ? 'Outstanding balance' : 'All cleared'}
 subtitleBn={hasDue ? 'মোট পাওনা বাকি' : 'সকল বিল পরিশোধিত'}
      />

      {/* 4. Overdue (Past Deadline) */}
      <KpiCard
 titleEn="Overdue"titleBn="মেয়াদোত্তীর্ণ"value={summary.totalOverdue || 0}
 isCurrency
 icon={AlertCircle}
 colorVariant={hasOverdue ? 'danger' : 'slate'}
 badge={hasOverdue ? 'Overdue' : undefined}
 badgeColor="bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive border-danger-border"subtitleEn={hasOverdue ? 'Past payment deadline' : 'No overdue bills'}
 subtitleBn={hasOverdue ? 'সময়সীমা অতিক্রান্ত' : 'মেয়াদোত্তীর্ণ বিল নেই'}
      />

      {/* 5. Credit Limit & Available Credit */}
      <KpiCard
 titleEn="Available Credit"titleBn="উপলব্ধ ক্রেডিট"value={creditLimit > 0 ? availableCredit : (tBilingual('No Limit', 'লিমিটহীন'))}
 isCurrency={creditLimit > 0}
 icon={CreditCard}
 colorVariant={creditLimit > 0 && summary.totalDue > creditLimit ? 'danger' : 'cyan'}
 subtitle={creditLimit > 0 ? `Limit: ৳${creditLimit.toLocaleString('en-IN')}` : tBilingual('Pay per order', 'অর্ডারভিত্তিক বিল')}
 footer={
 creditLimit > 0 ? (
            <span
 className={cn(
                'text-xs font-bold',
 summary.totalDue > creditLimit
                  ? 'text-destructive text-destructive'
                  : 'text-muted-foreground '
              )}
            >
              {summary.totalDue > creditLimit
                ? `Over Limit (${Math.round((summary.totalDue / creditLimit) * 100)}%)`
                : `${Math.round((summary.totalDue / creditLimit) * 100)}% used`}
            </span>
          ) : undefined
        }
      />

      {/* 6. Last Activity (Order / Payment) */}
      <KpiCard
 titleEn="Last Activity"titleBn="সর্বশেষ লেনদেন"icon={ShoppingBag}
 colorVariant="purple"value={summary.lastPayment ? summary.lastPayment.amount : (summary.lastOrder ? summary.lastOrder.orderNumber : null)}
 isCurrency={Boolean(summary.lastPayment)}
 badge={summary.lastPayment ? 'Payment' : (summary.lastOrder ? 'Order' : undefined)}
 badgeColor={summary.lastPayment ? 'bg-success-surface text-success border-success-border' : 'bg-primary/10 text-primary border-primary/20'}
 subtitle={summary.lastPayment ? summary.lastPayment.date : (summary.lastOrder ? summary.lastOrder.date : tBilingual('No activity yet', 'কোন লেনদেন নেই'))}
      />
    </KpiGrid>
  )
}
