'use client'

import React, { useState } from 'react'
import {
  ArrowLeftRight,
  AlertCircle,
  Building,
  CreditCard,
  Wallet,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'

interface TransferMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  onSubmit: (data: {
    fromAccountId: string
    toAccountId: string
    amount: number
    feeAmount?: number
    transferDate: string
    notes?: string
  }) => Promise<void>
}

export function TransferMoneyModal({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: TransferMoneyModalProps) {
  const { tBilingual } = useI18n()
  const liquidAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

  const [fromAccountId, setFromAccountId] = useState(liquidAccounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(liquidAccounts[1]?.id || '')
  const [amount, setAmount] = useState<string>('')
  const [feeAmount, setFeeAmount] = useState<string>('0')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromAcc = accounts.find((a) => a.id === fromAccountId)
  const toAcc = accounts.find((a) => a.id === toAccountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const numAmt = parseFloat(amount)
    const fee = parseFloat(feeAmount || '0')

    if (isNaN(numAmt) || numAmt <= 0) {
      setError(tBilingual('Please enter a valid transfer amount', 'সঠিক ট্রান্সফার পরিমাণ লিখুন'))
      return
    }

    if (fromAccountId === toAccountId) {
      setError(tBilingual('Source and destination accounts cannot be identical', 'উৎস ও গন্তব্য হিসাব একই হতে পারে না'))
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        fromAccountId,
        toAccountId,
        amount: numAmt,
        feeAmount: isNaN(fee) ? 0 : fee,
        transferDate,
        notes: notes || undefined,
      })
      onClose()
      setAmount('')
      setNotes('')
    } catch (err: any) {
      setError(err.message || 'Failed to record transfer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Transfer Money (Cash / Bank / MFS)', 'তহবিল ট্রান্সফার (ক্যাশ ↔ ব্যাংক ↔ বিকাশ)')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Source Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Transfer From (Source)', 'কোথা থেকে পাঠাচ্ছেন?')} *
          </Label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Current Balance: ', 'বর্তমান ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Transfer To (Destination)', 'কোথায় জমা হবে?')} *
          </Label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Current Balance: ', 'বর্তমান ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount & Fee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Transfer Amount', 'স্থানান্তরের পরিমাণ')} *
            </Label>
            <Input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-base font-bold h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Processing Fee', 'চার্জ বা ফি')}
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="0.00"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              className="h-10 text-sm rounded-xl"
            />
          </div>
        </div>

        {/* Date & Note */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Transfer Date', 'তারিখ')}
            </Label>
            <Input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Reference / Note', 'নোট বা ট্রানজ্যাকশন আইডি')}
            </Label>
            <Input
              placeholder="যেমন: ব্যাংক ডিপোজিট স্লিপ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5"
          >
            {isSubmitting ? tBilingual('Transferring...', 'ট্রান্সফার হচ্ছে...') : tBilingual('Confirm Transfer', 'ট্রান্সফার সম্পন্ন করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
