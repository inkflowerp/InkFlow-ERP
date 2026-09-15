'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Receipt,
  UserPlus,
  Package,
  DollarSign,
  Zap,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface QuickActionsBarProps {
  onOpenPaymentModal: (invoiceId?: string) => void
  onOpenNewWork?: () => void
  className?: string
}

export function QuickActionsBar({
  onOpenPaymentModal,
  onOpenNewWork,
  className,
}: QuickActionsBarProps) {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const { can } = usePermissions()
  const router = useRouter()
  const slug = company?.slug || 'my-company'

  // Permission Checks (Authoritative)
  const canQuotation = can('create', 'quotations') || can('manage', 'quotations')
  const canInvoice = can('create', 'invoices') || can('create', 'billing') || can('manage', 'billing')
  const canCustomer = can('create', 'crm') || can('create', 'customers') || can('manage', 'crm')
  const canPurchase = can('create', 'purchases') || can('create', 'inventory') || can('manage', 'inventory')
  const canPayment = can('create', 'billing') || can('create', 'payments') || can('manage', 'billing')

  const actions = [
    {
      id: 'new-quotation',
      labelEn: 'New Quotation',
      labelBn: 'নতুন কোটেশন',
      subEn: 'Estimate & Pricing',
      subBn: 'দরপত্র ও প্রাক্কলন',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      allowed: canQuotation,
      onClick: () => router.push(`/${slug}/quotations?action=new`),
    },
    {
      id: 'new-invoice',
      labelEn: 'New Invoice',
      labelBn: 'নতুন ইনভয়েস',
      subEn: 'Sales & Billing',
      subBn: 'বিক্রয় ও বিল তৈরি',
      icon: Receipt,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
      allowed: canInvoice,
      onClick: () => router.push(`/${slug}/billing?tab=invoices&action=new`),
    },
    {
      id: 'new-customer',
      labelEn: 'New Customer',
      labelBn: 'নতুন কাস্টমার',
      subEn: 'CRM & Client Profile',
      subBn: 'ক্লায়েন্ট প্রোফাইল যুক্ত',
      icon: UserPlus,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200 dark:border-sky-900',
      allowed: canCustomer,
      onClick: () => router.push(`/${slug}/customers?action=new`),
    },
    {
      id: 'new-purchase',
      labelEn: 'New Purchase',
      labelBn: 'নতুন ক্রয়',
      subEn: 'Vendor PO / Materials',
      subBn: 'কাঁচামাল ও সাপ্লায়ার PO',
      icon: Package,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      allowed: canPurchase,
      onClick: () => router.push(`/${slug}/purchases?action=new`),
    },
    {
      id: 'record-payment',
      labelEn: 'Record Payment',
      labelBn: 'পেমেন্ট গ্রহণ',
      subEn: 'Money Receipt / Collection',
      subBn: 'নগদ বা ডিজিটাল আদায়',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      allowed: canPayment,
      onClick: () => onOpenPaymentModal(),
    },
  ]

  // Filter authorized actions
  const visibleActions = actions.filter((a) => a.allowed)

  return (
    <Card className={cn('p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs', className)}>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
            {tBilingual('Quick Actions', 'দ্রুত কাজ ও এন্ট্রি')}
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline bangla-text">
          {tBilingual('1-click operational shortcuts', '১-ক্লিকে দ্রুত অপারেশন শুরু করুন')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {visibleActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="group flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/90 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs active:scale-[0.99] transition-all duration-150 cursor-pointer text-left min-h-[48px] focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <div
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-xs',
                  action.color
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate bangla-text">
                  {tBilingual(action.labelEn, action.labelBn)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate bangla-text">
                  {tBilingual(action.subEn, action.subBn)}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
