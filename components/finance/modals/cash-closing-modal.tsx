'use client'

import React, { useState, useEffect } from 'react'
import {
 CheckCircle2,
 AlertCircle,
 Calculator,
 AlertTriangle,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'

interface CashClosingModalProps {
 isOpen: boolean
 onClose: () => void
 accounts: AccountRecord[]
 onSubmit: (data: {
 accountId: string
 closingDate: string
 countedCash: number
 varianceReason?: string
  }) => Promise<void>
}

export function CashClosingModal({
 isOpen,
 onClose,
 accounts,
 onSubmit,
}: CashClosingModalProps) {
 const { tBilingual } = useI18n()
 const cashAccounts = accounts.filter(
    (a) => a.account_subtype === 'CASH' || a.code.startsWith('101')
  )

 const [accountId, setAccountId] = useState(cashAccounts[0]?.id || '')
 const [countedCash, setCountedCash] = useState<string>('')
 const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0])
 const [varianceReason, setVarianceReason] = useState('')
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [error, setError] = useState<string | null>(null)

  // Auto-synchronize cash account when modal opens or accounts update
 useEffect(() => {
 if (isOpen && cashAccounts.length > 0) {
 if (!accountId || !cashAccounts.some((a) => a.id === accountId)) {
 setAccountId(cashAccounts[0].id)
      }
    }
  }, [isOpen, cashAccounts, accountId])

 const selectedAccount =
 accounts.find((a) => a.id === accountId) ||
 cashAccounts.find((a) => a.id === accountId) ||
 cashAccounts[0] ||
 accounts[0]
 const expectedCash = selectedAccount?.current_balance || 0
 const countedNum = parseFloat(countedCash || '0')
 const variance = !isNaN(countedNum) ? Number((countedNum - expectedCash).toFixed(2)) : 0

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setError(null)

 if (!selectedAccount) {
 setError(tBilingual('Please select a cash account', 'ক্যাশ হিসাব নির্বাচন করুন'))
 return
    }

 if (isNaN(countedNum) || countedCash.trim() === '') {
 setError(tBilingual('Please enter the physical counted cash in drawer', 'ড্রয়ারের গোনা ক্যাশ টাকার পরিমাণ লিখুন'))
 return
    }

 if (Math.abs(variance) > 0.01 && (!varianceReason || varianceReason.trim().length === 0)) {
 setError(tBilingual('Please enter an explanation for the cash discrepancy/variance', 'ক্যাশ অমিলের কারণ অবশ্যই লিখতে হবে'))
 return
    }

 try {
 setIsSubmitting(true)
 await onSubmit({
 accountId: selectedAccount.id,
 closingDate,
 countedCash: countedNum,
 varianceReason: varianceReason || undefined,
      })
 onClose()
 setCountedCash('')
 setVarianceReason('')
    } catch (err: any) {
 setError(err.message || 'Failed to submit cash closing')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 title={tBilingual('Daily Cash Closing & Drawer Check', 'দিনের ক্যাশ ড্রয়ার ক্লোজিং')}
 hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-danger-surface bg-danger-surface border border-danger-border border-danger-border rounded-xl text-destructive text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        {/* Cash Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Cash Account / Drawer', 'ক্যাশ ড্রয়ার হিসাব')} *
          </Label>
          <select
 value={accountId || cashAccounts[0]?.id || ''}
 onChange={(e) => setAccountId(e.target.value)}
 className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-card text-foreground">
            {cashAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.code})
              </option>
            ))}
          </select>
        </div>

        {/* Expected vs Counted Comparison Box */}
        <div className="p-4 bg-muted dark:bg-muted rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {tBilingual('System Expected Cash (Book)', 'সিস্টেমের হিসেবে ক্যাশ')}
            </span>
            <span className="text-base font-bold text-foreground">
              ৳{expectedCash.toLocaleString()}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-primary"/>
              <span>{tBilingual('Physical Cash Counted in Drawer', 'ড্রয়ারে গুনে পাওয়া নগদ টাকা')} *</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-lg pointer-events-none">
                ৳
              </span>
              <Input
 type="number"step="any"required
 placeholder="0.00"value={countedCash}
 onChange={(e) => setCountedCash(e.target.value)}
 className="pl-8 text-xl font-bold h-12 rounded-xl bg-card border-primary/20 border-border"/>
            </div>
          </div>

          {/* Variance Indicator */}
          {countedCash.trim() !== '' && (
            <div
 className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
 Math.abs(variance) <= 0.01
                  ? 'bg-success-surface bg-success-surface border-success-border text-success text-success'
                  : variance > 0
                  ? 'bg-primary/10 bg-primary/10 border-primary/20 text-primary text-primary'
                  : 'bg-danger-surface bg-danger-surface border-danger-border text-destructive text-destructive'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {Math.abs(variance) <= 0.01 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success"/>
                    <span>{tBilingual('Exact Match (100% Balanced)', 'ক্যাশ নিখুঁত ও মিল আছে')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-warning"/>
                    <span>
                      {variance > 0
                        ? tBilingual('Surplus Cash in Drawer', 'ক্যাশে অতিরিক্ত টাকা আছে')
                        : tBilingual('Cash Shortage in Drawer', 'ক্যাশে টাকা কম আছে')}
                    </span>
                  </>
                )}
              </div>
              <span className="font-bold text-sm">
                {variance > 0 ? `+৳${variance.toLocaleString()}` : `-৳${Math.abs(variance).toLocaleString()}`}
              </span>
            </div>
          )}
        </div>

        {/* Variance Explanation if non-zero */}
        {Math.abs(variance) > 0.01 && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-destructive text-destructive">
              {tBilingual('Reason for Variance (Required)', 'ক্যাশ কম/বেশির কারণ (বাধ্যতামূলক)')} *
            </Label>
            <Input
 required
 placeholder={tBilingual('e.g. Change return mistake / Pending petty expense', 'যেমন: খুচরা ফেরত দেওয়া ভুল হয়েছে / খরচের ভাউচার বাকি')}
 value={varianceReason}
 onChange={(e) => setVarianceReason(e.target.value)}
 className="h-10 text-sm rounded-xl border-danger-border border-danger-border"/>
          </div>
        )}

        {/* Closing Date */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {tBilingual('Closing Date', 'ক্লোজিং তারিখ')}
          </Label>
          <Input
 type="date"value={closingDate}
 onChange={(e) => setClosingDate(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button type="button"variant="outline"onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
 type="submit"disabled={isSubmitting}
 className="bg-primary hover:bg-primary text-white font-semibold rounded-xl px-5">
            {isSubmitting ? tBilingual('Closing...', 'ক্লোজ হচ্ছে...') : tBilingual('Submit Cash Closing', 'ক্যাশ ক্লোজিং সম্পন্ন করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
