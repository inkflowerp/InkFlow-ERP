'use client'

import React, { useState } from 'react'
import {
  DollarSign,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  CreditCard,
  Receipt,
  Sparkles,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'

interface SpendMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  onSubmit: (data: {
    category: string
    amount: number
    paymentAccountId: string
    expenseAccountId?: string
    vendorName?: string
    description: string
    expenseDate: string
    attachmentUrl?: string
  }) => Promise<void>
}

const CATEGORY_PRESETS: { id: string; labelEn: string; labelBn: string; icon: string }[] = [
  { id: 'tea_snacks', labelEn: 'Tea & Snacks', labelBn: 'চা ও নাস্তা', icon: '☕' },
  { id: 'transport', labelEn: 'Transport / Fare', labelBn: 'ভাড়া ও যাতায়াত', icon: '🚗' },
  { id: 'maintenance', labelEn: 'Machine Repair', labelBn: 'মেরামত ও পার্টস', icon: '🔧' },
  { id: 'electricity', labelEn: 'Electricity', labelBn: 'বিদ্যুৎ বিল', icon: '⚡' },
  { id: 'fuel', labelEn: 'Fuel / Diesel', labelBn: 'জ্বালানি / ডিজেল', icon: '⛽' },
  { id: 'salary', labelEn: 'Daily Labor', labelBn: 'শ্রমিক মজুরি', icon: '👷' },
  { id: 'rent', labelEn: 'Factory Rent', labelBn: 'দোকান/ফ্যাক্টরি ভাড়া', icon: '🏢' },
  { id: 'office', labelEn: 'Office Stationary', labelBn: 'স্টেশনারি ও কাগজ', icon: '📝' },
]

export function SpendMoneyModal({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: SpendMoneyModalProps) {
  const { tBilingual } = useI18n()
  const [category, setCategory] = useState('tea_snacks')
  const [amount, setAmount] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState(
    accounts.find((a) => a.account_subtype === 'CASH')?.id || accounts[0]?.id || ''
  )
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paymentAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

  const handlePresetClick = (catId: string, labelBn: string) => {
    setCategory(catId)
    if (!description) {
      setDescription(labelBn)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const numAmt = parseFloat(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setError(tBilingual('Please enter a valid amount greater than 0', 'সঠিক টাকার পরিমাণ লিখুন'))
      return
    }

    if (!paymentAccountId) {
      setError(tBilingual('Please select a payment account', 'টাকা পরিশোধের হিসাব নির্বাচন করুন'))
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        category,
        amount: numAmt,
        paymentAccountId,
        vendorName: vendorName || undefined,
        description: description || category,
        expenseDate,
        attachmentUrl: attachmentUrl || undefined,
      })
      onClose()
      setAmount('')
      setDescription('')
      setVendorName('')
    } catch (err: any) {
      setError(err.message || 'Failed to record expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Spend Money / Record Expense', 'খরচ এন্ট্রি / টাকা প্রদান')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Quick Category Presets */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Quick Category', 'খরচের ধরন')}
          </Label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id, p.labelBn)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all ${
                  category === p.id
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-lg">{p.icon}</span>
                <span className="mt-0.5 text-[11px] truncate w-full text-center">{p.labelBn}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Amount Input (Large for touch keypad) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Expense Amount (৳ BDT)', 'টাকার পরিমাণ (৳)')} *
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

        {/* 3. Paid From Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {tBilingual('Paid From (Cash / Bank / MFS)', 'কোন তহবিল থেকে দেওয়া হলো?')} *
          </Label>
          <select
            value={paymentAccountId}
            onChange={(e) => setPaymentAccountId(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            {paymentAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.name_bn || acc.code}) — ব্যালেন্স: ৳{acc.current_balance.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Description & Vendor */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Description / Note', 'বিবরণ')}
            </Label>
            <Input
              placeholder="চা ও আপ্যায়ন বিল"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Vendor / Payee', 'কার কাছে দেওয়া হলো?')}
            </Label>
            <Input
              placeholder="দোকান বা ব্যক্তির নাম"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* 5. Date & Receipt Attachment */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Expense Date', 'তারিখ')}
            </Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="h-9 text-xs rounded-lg"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-600 dark:text-slate-400">
              {tBilingual('Receipt Photo / Slip URL', 'রশিদ বা স্লিপের লিঙ্ক')}
            </Label>
            <Input
              placeholder="https://... বা স্লিপ নং"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
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
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-5"
          >
            {isSubmitting ? tBilingual('Recording...', 'রেকর্ড হচ্ছে...') : tBilingual('Confirm Expense', 'খরচ কনফার্ম করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
