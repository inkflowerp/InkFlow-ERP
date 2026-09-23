'use client'

import React, { useState } from 'react'
import {
  RotateCcw,
  AlertCircle,
  Building,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'
import type { CustomerRecord } from '@/types/crm.types'

interface CustomerRefundModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  customers: CustomerRecord[]
  onSubmit: (data: {
    customerId: string
    customerName: string
    refundAccountId: string
    amount: number
    refundDate: string
    reason: string
  }) => Promise<void>
}

export function CustomerRefundModal({
  isOpen,
  onClose,
  accounts,
  customers,
  onSubmit,
}: CustomerRefundModalProps) {
  const { tBilingual } = useI18n()
  const liquidAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [refundAccountId, setRefundAccountId] = useState(liquidAccounts[0]?.id || '')
  const [amount, setAmount] = useState<string>('')
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const numAmt = parseFloat(amount)

    if (isNaN(numAmt) || numAmt <= 0) {
      setError(tBilingual('Please enter a valid refund amount', 'সঠিক রিফান্ড পরিমাণ লিখুন'))
      return
    }

    if (!reason || reason.trim().length === 0) {
      setError(tBilingual('Refund reason is required for audit verification', 'টাকা ফেরতের কারণ উল্লেখ করা বাধ্যতামূলক'))
      return
    }

    if (!selectedCustomer) {
      setError(tBilingual('Please select a customer', 'গ্রাহক নির্বাচন করুন'))
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        refundAccountId,
        amount: numAmt,
        refundDate,
        reason,
      })
      onClose()
      setAmount('')
      setReason('')
    } catch (err: any) {
      setError(err.message || 'Failed to process refund')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Customer Refund (Contra-Revenue)', 'গ্রাহককে টাকা ফেরত / রিফান্ড')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Customer', 'গ্রাহকের নাম')} *
          </Label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.mobile}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Refund Amount', 'ফেরতের পরিমাণ')} *
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
              ৳
            </span>
            <Input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-xl font-bold h-12 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        </div>

        {/* Refund From Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Refunded From (Account)', 'কোন হিসাব থেকে টাকা ফেরত দেওয়া হলো?')} *
          </Label>
          <select
            value={refundAccountId}
            onChange={(e) => setRefundAccountId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Balance: ', 'ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Refund Reason (Audit Required)', 'টাকা ফেরতের কারণ (বাধ্যতামূলক)')} *
          </Label>
          <Input
            required
            placeholder="যেমন: অর্ডার বাতিল / ভুল পেমেন্ট ফেরত"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 text-sm rounded-xl"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">
            {tBilingual('Refund Date', 'তারিখ')}
          </Label>
          <Input
            type="date"
            value={refundDate}
            onChange={(e) => setRefundDate(e.target.value)}
            className="h-9 text-xs rounded-lg"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl px-5"
          >
            {isSubmitting ? tBilingual('Processing...', 'প্রসেসিং হচ্ছে...') : tBilingual('Process Refund', 'টাকা ফেরত দিন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
