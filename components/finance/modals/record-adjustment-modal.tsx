'use client'

import React, { useState } from 'react'
import {
  FilePlus2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'

interface RecordAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  onSubmit: (data: {
    lines: { accountId: string; debit: number; credit: number; memo?: string }[]
    narration: string
    reason: string
    adjustmentDate: string
  }) => Promise<void>
}

interface LineItem {
  accountId: string
  debit: string
  credit: string
  memo: string
}

export function RecordAdjustmentModal({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: RecordAdjustmentModalProps) {
  const { tBilingual } = useI18n()
  const [lines, setLines] = useState<LineItem[]>([
    { accountId: accounts[0]?.id || '', debit: '', credit: '', memo: '' },
    { accountId: accounts[1]?.id || '', debit: '', credit: '', memo: '' },
  ])
  const [narration, setNarration] = useState('')
  const [reason, setReason] = useState('')
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01 && totalDebit > 0

  const handleAddLine = () => {
    setLines([...lines, { accountId: accounts[0]?.id || '', debit: '', credit: '', memo: '' }])
  }

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return
    setLines(lines.filter((_, i) => i !== idx))
  }

  const updateLine = (idx: number, updates: Partial<LineItem>) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...updates } : l)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isBalanced) {
      setError(
        tBilingual(
          `Journal entry is unbalanced: Debit (${formatBDT(totalDebit)}) must equal Credit (${formatBDT(totalCredit)})`,
          `জার্নাল এন্ট্রি অসমান: ডেবিট ও ক্রেডিট টাকার পরিমাণ সমান হতে হবে`
        )
      )
      return
    }

    if (!reason || reason.trim().length === 0) {
      setError(tBilingual('Please provide an explicit adjustment reason', 'অ্যাডজাস্টমেন্টের কারণ অবশ্যই লিখতে হবে'))
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          memo: l.memo || undefined,
        })),
        narration: narration || 'Journal Adjustment Voucher',
        reason,
        adjustmentDate,
      })
      onClose()
      setNarration('')
      setReason('')
    } catch (err: any) {
      setError(err.message || 'Failed to record adjustment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Manual Journal Adjustment Voucher', 'ম্যানুয়াল জার্নাল ভাউচার এন্ট্রি')}
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Reason & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Reason (Required for Audit)', 'সংশোধনের কারণ')} *
            </Label>
            <Input
              required
              placeholder="যেমন: প্রারম্ভিক ব্যালেন্স সংশোধন"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Voucher Date', 'ভাউচার তারিখ')}
            </Label>
            <Input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Lines Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Journal Entry Lines (Debit = Credit)', 'জার্নাল লাইন')}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="h-7 text-xs flex items-center gap-1 rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>{tBilingual('Add Line', 'লাইন যোগ করুন')}</span>
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                  className="flex-1 h-8 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>

                <Input
                  type="number"
                  step="any"
                  placeholder="Debit (৳)"
                  value={line.debit}
                  onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })}
                  className="w-24 h-8 text-xs font-semibold"
                />

                <Input
                  type="number"
                  step="any"
                  placeholder="Credit (৳)"
                  value={line.credit}
                  onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })}
                  className="w-24 h-8 text-xs font-semibold"
                />

                {lines.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLine(idx)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Balance Status Footer */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <div className="flex items-center gap-4">
            <span>Debit: {formatBDT(totalDebit)}</span>
            <span>Credit: {formatBDT(totalCredit)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isBalanced ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{tBilingual('Balanced', 'সমান')}</span>
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>Diff: {formatBDT(Math.abs(totalDebit - totalCredit))}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isBalanced}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5"
          >
            {isSubmitting ? tBilingual('Posting...', 'পোস্ট হচ্ছে...') : tBilingual('Post Journal Entry', 'জার্নাল পোস্ট করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
