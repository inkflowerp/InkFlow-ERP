'use client'

import React from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  FilePlus2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface FinanceQuickActionsProps {
  onReceiveMoney: () => void
  onSpendMoney: () => void
  onTransferMoney: () => void
  onPaySupplier: () => void
  onCustomerRefund: () => void
  onCashClosing: () => void
  onRecordAdjustment?: () => void
  isSimpleMode?: boolean
}

export function FinanceQuickActions({
  onReceiveMoney,
  onSpendMoney,
  onTransferMoney,
  onPaySupplier,
  onCustomerRefund,
  onCashClosing,
  onRecordAdjustment,
  isSimpleMode = false,
}: FinanceQuickActionsProps) {
  const { tBilingual } = useI18n()

  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <Button
        onClick={onReceiveMoney}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl h-auto"
      >
        <ArrowDownLeft className="w-4 h-4 text-emerald-100 stroke-[2.5]" />
        <span>{tBilingual('+ Receive Money', '+ টাকা গ্রহণ')}</span>
      </Button>

      <Button
        onClick={onSpendMoney}
        variant="outline"
        className="border-rose-300 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl h-auto"
      >
        <ArrowUpRight className="w-4 h-4 text-rose-600 stroke-[2.5]" />
        <span>{tBilingual('+ Spend Money', '+ খরচ এন্ট্রি')}</span>
      </Button>

      <Button
        onClick={onTransferMoney}
        variant="outline"
        className="border-blue-300 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl h-auto"
      >
        <ArrowLeftRight className="w-4 h-4 text-blue-600 stroke-[2.5]" />
        <span>{tBilingual('+ Transfer', '+ টাকা ট্রান্সফার')}</span>
      </Button>

      <Button
        onClick={onPaySupplier}
        variant="outline"
        className="border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 font-semibold flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl h-auto"
      >
        <ShoppingBag className="w-4 h-4 text-amber-600 stroke-[2.5]" />
        <span>{tBilingual('+ Pay Supplier', '+ পাওনাদার পরিশোধ')}</span>
      </Button>

      <Button
        onClick={onCashClosing}
        variant="outline"
        className="border-purple-300 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl h-auto"
      >
        <CheckCircle2 className="w-4 h-4 text-purple-600 stroke-[2.5]" />
        <span>{tBilingual('Cash Closing', 'ক্যাশ ক্লোজিং')}</span>
      </Button>

      <Button
        onClick={onCustomerRefund}
        variant="ghost"
        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg h-auto"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{tBilingual('Refund', 'টাকা ফেরত')}</span>
      </Button>

      {!isSimpleMode && onRecordAdjustment && (
        <Button
          onClick={onRecordAdjustment}
          variant="ghost"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg h-auto"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>{tBilingual('Journal Entry', 'জার্নাল অ্যাডজাস্টমেন্ট')}</span>
        </Button>
      )}
    </div>
  )
}
