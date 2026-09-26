'use client'

import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Building,
  CreditCard,
  Landmark,
  Coins,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Smartphone,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { SupplierRecord } from '@/types/crm.types'
import { formatBDT } from '@/lib/formatters'
import { BANGLADESH_BANKS } from './supplier-types'
import { cn } from '@/lib/utils'
import { dispatchToast } from '@/components/shared/toast-feedback'

interface PaySupplierVoucherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierRecord | null
  onPaymentRecorded: (amount: number, paymentDetails: any) => void
}

type PaymentMethodType = 'cheque' | 'bank_transfer' | 'cash' | 'mfs'

export function PaySupplierVoucherModal({
  open,
  onOpenChange,
  supplier,
  onPaymentRecorded,
}: PaySupplierVoucherModalProps) {
  const { tBilingual } = useI18n()

  const currentBalance = supplier?.outstanding_balance || 0

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethodType>('cheque')
  const [bankName, setBankName] = useState('The City Bank PLC')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionRef, setTransactionRef] = useState('')
  const [mfsNumber, setMfsNumber] = useState('')
  const [voucherNumber, setVoucherNumber] = useState('')
  const [authorizedBy, setAuthorizedBy] = useState('Accounts Officer')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && supplier) {
      setAmount('')
      setMethod('cheque')
      setBankName(supplier.bank_name || 'The City Bank PLC')
      setChequeNumber('')
      setChequeDate(new Date().toISOString().split('T')[0])
      setTransactionRef('')
      setMfsNumber(supplier.mobile || '')
      setVoucherNumber(`PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
      setRemarks(`Payment against outstanding balance for ${supplier.supplier_name}`)
      setFieldErrors({})
    }
  }, [open, supplier])

  const handleSetPresetPercentage = (pct: number) => {
    if (currentBalance > 0) {
      const calculated = Math.round((currentBalance * pct) / 100)
      setAmount(calculated.toString())
      if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      errors.amount = tBilingual('Please enter a valid disbursement amount greater than 0.', 'অনুগ্রহ করে ০ এর বেশি সঠিক পেমেন্ট পরিমাণ লিখুন।')
    }

    if (method === 'cheque' && !chequeNumber.trim()) {
      errors.chequeNumber = tBilingual('Cheque Number is required for Bank Cheque disbursements.', 'ব্যাংক চেকের ক্ষেত্রে চেক নম্বর দেওয়া আবশ্যক।')
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstMsg = Object.values(errors)[0]
      dispatchToast({
        type: 'warning',
        title: tBilingual('Validation Warning', 'সতর্কতা'),
        message: firstMsg,
      })
      return
    }

    setLoading(true)

    try {
      const paymentDetails = {
        voucherNumber,
        method,
        bankName: method === 'cheque' || method === 'bank_transfer' ? bankName : null,
        chequeNumber: method === 'cheque' ? chequeNumber : null,
        chequeDate: method === 'cheque' ? chequeDate : null,
        transactionRef: method === 'bank_transfer' ? transactionRef : null,
        mfsNumber: method === 'mfs' ? mfsNumber : null,
        authorizedBy,
        remarks,
        paidAt: new Date().toISOString(),
      }

      onPaymentRecorded(numAmount, paymentDetails)
      dispatchToast({
        type: 'success',
        title: 'Payment Recorded',
        message: `Payment voucher ${voucherNumber} recorded successfully.`,
      })
      onOpenChange(false)
    } catch (err: any) {
      dispatchToast({
        type: 'error',
        title: 'Payment Failed',
        message: err.message || 'Failed to record payment voucher.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) return null

  const numAmount = Number(amount) || 0
  const remainingBalance = Math.max(0, currentBalance - numAmount)

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 font-bold shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Issue Payment Voucher to Supplier', 'মহাজনকে বিল পরিশোধ / পেমেন্ট ভাউচার')}
              </span>
              <Badge variant="outline" className="text-2xs font-mono py-0.5 px-2 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                {voucherNumber || 'PV-NEW'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                `Clear outstanding payable due for ${supplier.supplier_name} (${supplier.name_bn || 'মহাজন'})`,
                `${supplier.supplier_name} এর বকেয়া বিল পরিশোধের ভাউচার তৈরি করুন`
              )}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* VENDOR BALANCE SUMMARY BANNER */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-slate-50 dark:from-teal-950/40 dark:to-slate-900/60 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-2xs uppercase font-bold text-teal-700 dark:text-teal-300 tracking-wider">
              {tBilingual('Current Payable Balance', 'বর্তমান বকেয়া পাওনা')}
            </span>
            <div className="text-2xl font-black text-teal-900 dark:text-teal-100 font-mono mt-0.5">
              {formatBDT(currentBalance)}
            </div>
            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
              Terms: <strong className="text-slate-700 dark:text-slate-300">{supplier.payment_terms.replace('_', ' ').toUpperCase()}</strong>
              {supplier.market_hub && ` • 📍 ${supplier.market_hub}`}
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-teal-200 dark:border-teal-800 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-2xs uppercase font-bold text-slate-400">
              {tBilingual('Balance After Payment', 'পেমেন্ট পরবর্তী অবশিষ্ট')}
            </span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              {formatBDT(remainingBalance)}
            </div>
            {numAmount > 0 && numAmount >= currentBalance && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-2xs mt-1 border-0">
                {tBilingual('Full Due Settled', 'সম্পূর্ণ পরিশোধিত')}
              </Badge>
            )}
          </div>
        </div>

        {/* AMOUNT & QUICK PERCENTAGE PRESETS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              {tBilingual('Disbursement Amount', 'প্রদেয় টাকার পরিমাণ')} <span className="text-rose-500">*</span>
            </Label>
            <div className="flex items-center gap-1.5">
              {[
                { pct: 25, label: '25%' },
                { pct: 50, label: '50%' },
                { pct: 75, label: '75%' },
                { pct: 100, label: '100% Full Due' },
              ].map((p) => (
                <button
                  key={p.pct}
                  type="button"
                  onClick={() => handleSetPresetPercentage(p.pct)}
                  className="text-2xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">৳</span>
            <Input
              type="number"
              step="1"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }))
              }}
              className={cn(
                "text-base h-11 pl-9 font-mono font-black text-slate-900 dark:text-white",
                fieldErrors.amount && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20"
              )}
              required
            />
          </div>
          {fieldErrors.amount && (
            <p className="text-2xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fieldErrors.amount}</span>
            </p>
          )}
        </div>

        {/* PAYMENT METHOD SELECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <Label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            {tBilingual('Disbursement Channel & Method', 'বিল পরিশোধের মাধ্যম')}
          </Label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'cheque', labelEn: 'Bank Cheque', labelBn: 'ব্যাংক চেক', icon: Landmark },
              { id: 'bank_transfer', labelEn: 'RTGS / BEFTN', labelBn: 'ব্যাংক ট্রান্সফার', icon: CreditCard },
              { id: 'cash', labelEn: 'Cash Counter', labelBn: 'ক্যাশ কাউন্টার', icon: Coins },
              { id: 'mfs', labelEn: 'bKash / Nagad', labelBn: 'বিকাশ / নগদ', icon: Smartphone },
            ].map((m) => {
              const Icon = m.icon
              const isSelected = method === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as PaymentMethodType)}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 ring-1 ring-teal-500 text-teal-800 dark:text-teal-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-xs font-bold">{m.labelEn}</div>
                  <div className="text-2xs text-slate-400">{m.labelBn}</div>
                </button>
              )
            })}
          </div>

          {/* METHOD-SPECIFIC INPUTS */}
          {method === 'cheque' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Drawn Bank Name', 'ব্যাংকের নাম')}
                </Label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  {BANGLADESH_BANKS.map((b, idx) => (
                    <option key={idx} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Cheque Number', 'চেক নম্বর')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 9821043"
                  value={chequeNumber}
                  onChange={(e) => {
                    setChequeNumber(e.target.value)
                    if (fieldErrors.chequeNumber) setFieldErrors((prev) => ({ ...prev, chequeNumber: '' }))
                  }}
                  className={cn(
                    "text-xs h-9 font-mono",
                    fieldErrors.chequeNumber && "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30 dark:bg-rose-950/20"
                  )}
                  required
                />
                {fieldErrors.chequeNumber && (
                  <p className="text-2xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.chequeNumber}</span>
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Cheque Clearance Date', 'চেকের তারিখ')}
                </Label>
                <Input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          )}

          {method === 'bank_transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Disbursement Bank Account', 'প্রেরক ব্যাংক')}
                </Label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  {BANGLADESH_BANKS.map((b, idx) => (
                    <option key={idx} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('RTGS / BEFTN Transaction ID / Ref #', 'ট্রানজেকশন আইডি / রেফারেন্স')}
                </Label>
                <Input
                  placeholder="e.g. BEFTN-20240828-9812"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          )}

          {method === 'mfs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Vendor bKash / Nagad Number', 'ভেন্ডরের বিকাশ বা নগদ নম্বর')}
                </Label>
                <Input
                  placeholder="017XXXXXXXX"
                  value={mfsNumber}
                  onChange={(e) => setMfsNumber(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('MFS TrxID / Reference', 'লেনদেন আইডি বা রেফারেন্স')}
                </Label>
                <Input
                  placeholder="e.g. 9B27X8KL9"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="text-xs h-9 font-mono uppercase"
                />
              </div>
            </div>
          )}

          {method === 'cash' && (
            <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              💵 This transaction will automatically create a <strong>Cash-Out Entry</strong> in the Petty Cash & Cash Book ledger.
            </div>
          )}
        </div>

        {/* REMARKS & AUTHORIZATION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Authorized / Prepared By', 'অনুমোদনকারী')}
              </Label>
              <Input
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Payment Voucher Remarks / Inward PO Ref', 'ভাউচার মন্তব্য / বিল নম্বর')}
              </Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Partial clearance for PO-0034"
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm px-6"
          >
            {loading
              ? tBilingual('Processing...', 'প্রক্রিয়াধীন...')
              : tBilingual('Disburse Payment Voucher', 'পেমেন্ট ভাউচার নিশ্চিত করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
