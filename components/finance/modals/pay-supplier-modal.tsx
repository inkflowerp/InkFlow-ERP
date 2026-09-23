'use client'

import React, { useState } from 'react'
import {
  ShoppingBag,
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
import type { SupplierRecord } from '@/types/crm.types'

interface PaySupplierModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  suppliers: SupplierRecord[]
  onSubmit: (data: {
    supplierId: string
    supplierName: string
    paymentAccountId: string
    amount: number
    paymentDate: string
    referenceNumber?: string
    notes?: string
  }) => Promise<void>
}

export function PaySupplierModal({
  isOpen,
  onClose,
  accounts,
  suppliers,
  onSubmit,
}: PaySupplierModalProps) {
  const { tBilingual } = useI18n()
  const liquidAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '')
  const [paymentAccountId, setPaymentAccountId] = useState(liquidAccounts[0]?.id || '')
  const [amount, setAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSupplier = suppliers.find((s) => s.id === supplierId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const numAmt = parseFloat(amount)

    if (isNaN(numAmt) || numAmt <= 0) {
      setError(tBilingual('Please enter a valid payment amount', 'সঠিক পেমেন্টের পরিমাণ লিখুন'))
      return
    }

    if (!supplierId || !selectedSupplier) {
      setError(tBilingual('Please select a supplier', 'সরবরাহকারী নির্বাচন করুন'))
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        supplierId,
        supplierName: selectedSupplier.supplier_name,
        paymentAccountId,
        amount: numAmt,
        paymentDate,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      })
      onClose()
      setAmount('')
      setNotes('')
      setReferenceNumber('')
    } catch (err: any) {
      setError(err.message || 'Failed to record supplier payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Pay Supplier Bill (Accounts Payable)', 'সরবরাহকারীর পাওনা পরিশোধ')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Supplier Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Select Supplier', 'সরবরাহকারী')} *
          </Label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplier_name} — {tBilingual('Mobile: ', 'মোবাইল: ')}{s.mobile}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Payment Amount', 'পরিশোধের পরিমাণ')} *
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

        {/* Payment Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Paid From (Account)', 'কোন তহবিল থেকে দেওয়া হলো?')} *
          </Label>
          <select
            value={paymentAccountId}
            onChange={(e) => setPaymentAccountId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {liquidAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_subtype}) — {tBilingual('Balance: ', 'ব্যালেন্স: ')}{formatBDT(acc.current_balance)}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Reference */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Payment Date', 'তারিখ')}
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Bill / Check / PO #', 'বিল বা চেক নম্বর')}
            </Label>
            <Input
              placeholder="যেমন: PO-2026-001"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-600 dark:text-slate-400">
            {tBilingual('Payment Note', 'নোট')}
          </Label>
          <Input
            placeholder="পেমেন্ট বিবরণ"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl px-5"
          >
            {isSubmitting ? tBilingual('Processing...', 'প্রসেসিং হচ্ছে...') : tBilingual('Pay Supplier', 'পাওনা পরিশোধ করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
