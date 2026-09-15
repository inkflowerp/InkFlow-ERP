'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Receipt,
  UserPlus,
  Package,
  DollarSign,
  Zap,
  Plus,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notifications/notification-bus'
import type { AccountRecord } from '@/types/finance.types'
import { getAccountsAction, recordExpenseAction } from '@/actions/finance.actions'

// Modal Components
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { NewPurchaseModal } from '@/components/purchases/new-purchase-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { SpendMoneyModal } from '@/components/finance/modals/spend-money-modal'

const DEFAULT_FALLBACK_ACCOUNTS: AccountRecord[] = [
  {
    id: 'acc-cash-1001',
    company_id: '',
    branch_id: null,
    code: '1001',
    name: 'Cash in Hand (প্রধান ক্যাশ)',
    name_bn: 'প্রধান ক্যাশ',
    account_type: 'ASSET',
    account_subtype: 'CASH',
    currency: 'BDT',
    opening_balance: 50000,
    current_balance: 50000,
    is_system: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-bank-1002',
    company_id: '',
    branch_id: null,
    code: '1002',
    name: 'City Bank Ltd (Current A/C)',
    name_bn: 'ব্যাংক হিসাব',
    account_type: 'ASSET',
    account_subtype: 'BANK',
    currency: 'BDT',
    opening_balance: 250000,
    current_balance: 250000,
    is_system: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-mfs-1003',
    company_id: '',
    branch_id: null,
    code: '1003',
    name: 'bKash Merchant Account',
    name_bn: 'বিকাশ মার্চেন্ট',
    account_type: 'ASSET',
    account_subtype: 'MFS',
    currency: 'BDT',
    opening_balance: 15000,
    current_balance: 15000,
    is_system: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export interface QuickActionsBarProps {
  onOpenPaymentModal?: (invoiceId?: string) => void
  onOpenNewWork?: () => void
  onRefresh?: () => void
  className?: string
}

export function QuickActionsBar({
  onOpenPaymentModal,
  onOpenNewWork,
  onRefresh,
  className,
}: QuickActionsBarProps) {
  const { tBilingual } = useI18n()
  const { company } = useTenant()
  const { can } = usePermissions()

  // Direct Modal Trigger States (Zero Page Navigations)
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)

  // Accounts state for SpendMoneyModal
  const [accounts, setAccounts] = useState<AccountRecord[]>(DEFAULT_FALLBACK_ACCOUNTS)

  const fetchAccounts = async () => {
    try {
      const res = await getAccountsAction()
      if (res.success && res.data && res.data.length > 0) {
        setAccounts(res.data)
      }
    } catch (err) {
      console.warn('[QuickActionsBar] Failed to load accounts:', err)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Authoritative Permission Checks
  const canQuotation = can('create', 'quotations') || can('manage', 'quotations')
  const canInvoice = can('create', 'invoices') || can('create', 'billing') || can('manage', 'billing')
  const canCustomer = can('create', 'crm') || can('create', 'customers') || can('manage', 'crm')
  const canPurchase = can('create', 'purchases') || can('create', 'inventory') || can('manage', 'inventory')
  const canExpense =
    can('create', 'accounting') ||
    can('manage', 'accounting') ||
    can('create', 'expenses') ||
    can('manage', 'finance') ||
    can('create', 'billing')
  const canPayment = can('create', 'billing') || can('create', 'payments') || can('manage', 'billing')

  // Handle Success Callbacks
  const handleQuotationCreated = () => {
    setIsQuotationModalOpen(false)
    notify({
      title: tBilingual('Quotation Created', 'কোটেশন তৈরি সম্পন্ন'),
      message: tBilingual('New quotation has been saved and dashboard updated.', 'নতুন কোটেশন সংরক্ষিত হয়েছে।'),
      type: 'order',
    })
    onRefresh?.()
  }

  const handleInvoiceCreated = () => {
    setIsInvoiceModalOpen(false)
    notify({
      title: tBilingual('Invoice Created', 'চালান তৈরি সম্পন্ন'),
      message: tBilingual('New invoice recorded and receivables updated.', 'নতুন ইনভয়েস তৈরি হয়েছে।'),
      type: 'order',
    })
    onRefresh?.()
  }

  const handleCustomerCreated = () => {
    setIsCustomerModalOpen(false)
    notify({
      title: tBilingual('Customer Registered', 'কাস্টমার যুক্ত সম্পন্ন'),
      message: tBilingual('New customer profile added to CRM directory.', 'নতুন কাস্টমার সফলভাবে যুক্ত হয়েছে।'),
      type: 'customer',
    })
    onRefresh?.()
  }

  const handlePurchaseCreated = () => {
    setIsPurchaseModalOpen(false)
    notify({
      title: tBilingual('Purchase Order Issued', 'ক্রয় আদেশ জারি সম্পন্ন'),
      message: tBilingual('New vendor purchase commitment registered.', 'নতুন ক্রয় আদেশ সংরক্ষিত হয়েছে।'),
      type: 'inventory',
    })
    onRefresh?.()
  }

  const handleExpenseSubmit = async (data: {
    category: string
    amount: number
    paymentAccountId: string
    expenseAccountId?: string
    vendorName?: string
    description: string
    expenseDate: string
    attachmentUrl?: string
  }) => {
    const res = await recordExpenseAction(data)
    if (res.success) {
      setIsExpenseModalOpen(false)
      notify({
        title: tBilingual('Expense Recorded', 'খরচ এন্ট্রি সম্পন্ন'),
        message: tBilingual(
          `Recorded expense voucher of ৳${data.amount.toLocaleString()}.`,
          `৳${data.amount.toLocaleString()} টাকার খরচ ভাউচার সংরক্ষিত হয়েছে।`
        ),
        type: 'payment',
      })
      onRefresh?.()
    } else {
      throw new Error(res.error || 'Failed to record expense')
    }
  }

  const handlePaymentRecorded = () => {
    setIsPaymentModalOpen(false)
    notify({
      title: tBilingual('Payment Recorded', 'পেমেন্ট গ্রহণ সম্পন্ন'),
      message: tBilingual('Money receipt issued and customer due balance updated.', 'টাকা জমা ও মানি রিসিট প্রস্তুত।'),
      type: 'payment',
    })
    onRefresh?.()
  }

  const actions = [
    {
      id: 'new-quotation',
      labelEn: 'New Quotation',
      labelBn: 'নতুন কোটেশন',
      subEn: 'Create quotation',
      subBn: 'দরপত্র ও প্রাক্কলন',
      icon: FileText,
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      allowed: canQuotation,
      onClick: () => setIsQuotationModalOpen(true),
    },
    {
      id: 'new-invoice',
      labelEn: 'New Invoice',
      labelBn: 'নতুন ইনভয়েস',
      subEn: 'Sales & Billing',
      subBn: 'বিক্রয় ও বিল তৈরি',
      icon: Receipt,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      allowed: canInvoice,
      onClick: () => setIsInvoiceModalOpen(true),
    },
    {
      id: 'new-customer',
      labelEn: 'New Customer',
      labelBn: 'নতুন কাস্টমার',
      subEn: 'CRM & Client Profile',
      subBn: 'ক্লায়েন্ট প্রোফাইল যুক্ত',
      icon: UserPlus,
      iconColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
      allowed: canCustomer,
      onClick: () => setIsCustomerModalOpen(true),
    },
    {
      id: 'new-purchase',
      labelEn: 'New Purchase',
      labelBn: 'নতুন ক্রয়',
      subEn: 'Vendor PO / Materials',
      subBn: 'কাঁচামাল ও সাপ্লায়ার PO',
      icon: Package,
      iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      allowed: canPurchase,
      onClick: () => setIsPurchaseModalOpen(true),
    },
    {
      id: 'new-expense',
      labelEn: 'New Expense',
      labelBn: 'নতুন খরচ',
      subEn: 'Spend Money / Expense',
      subBn: 'ভাউচার ও খরচ এন্ট্রি',
      icon: CreditCard,
      iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      allowed: canExpense,
      onClick: () => {
        fetchAccounts()
        setIsExpenseModalOpen(true)
      },
    },
    {
      id: 'record-payment',
      labelEn: 'Record Payment',
      labelBn: 'পেমেন্ট গ্রহণ',
      subEn: 'Money Receipt / Payment',
      subBn: 'নগদ বা ডিজিটাল আদায়',
      icon: DollarSign,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      allowed: canPayment,
      onClick: () => {
        if (onOpenPaymentModal) {
          onOpenPaymentModal()
        } else {
          setIsPaymentModalOpen(true)
        }
      },
    },
  ]

  const visibleActions = actions.filter((a) => a.allowed)

  return (
    <>
      <Card className={cn('p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col justify-between', className)}>
        {/* Header Label Row */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shrink-0">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 bangla-text">
              {tBilingual('Quick Actions', 'দ্রুত তৈরি ও এন্ট্রি')}
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline bangla-text">
            {tBilingual('1-click direct creation modals • No page change', '১-ক্লিকে সরাসরি তৈরি করুন • পেজ পরিবর্তনের প্রয়োজন নেই')}
          </span>
        </div>

        {/* 6-Action Clickable Cards Grid (Compact 3x2 on desktop) */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-2.5 flex-1">
          {visibleActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="group relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs active:scale-[0.98] transition-all duration-200 cursor-pointer text-left min-h-[56px] select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                {/* Visual Icon Container */}
                <div
                  className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs',
                    action.iconColor
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight bangla-text break-words">
                    {tBilingual(action.labelEn, action.labelBn)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate bangla-text mt-0.5 leading-tight">
                    {tBilingual(action.subEn, action.subBn)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* DIRECT CREATION MODALS (No Route Changes, Underlying Dashboard Preserved)  */}
      {/* ========================================================================= */}

      {/* 1. CREATE QUOTATION MODAL */}
      <NewQuotationModal
        open={isQuotationModalOpen}
        onOpenChange={setIsQuotationModalOpen}
        onQuotationCreated={handleQuotationCreated}
        companyId={company?.id}
      />

      {/* 2. CREATE INVOICE MODAL */}
      <NewInvoiceModal
        open={isInvoiceModalOpen}
        onOpenChange={setIsInvoiceModalOpen}
        onInvoiceCreated={handleInvoiceCreated}
      />

      {/* 3. CREATE CUSTOMER MODAL */}
      <NewCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onCustomerCreated={handleCustomerCreated}
        companyId={company?.id}
      />

      {/* 4. CREATE PURCHASE ORDER MODAL */}
      <NewPurchaseModal
        open={isPurchaseModalOpen}
        onOpenChange={setIsPurchaseModalOpen}
        onPurchaseCreated={handlePurchaseCreated}
      />

      {/* 5. SPEND MONEY / RECORD EXPENSE MODAL */}
      <SpendMoneyModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        accounts={accounts}
        onSubmit={handleExpenseSubmit}
      />

      {/* 6. RECORD PAYMENT MODAL (Fallback if not opened via parent) */}
      {!onOpenPaymentModal && (
        <RecordPaymentModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </>
  )
}

