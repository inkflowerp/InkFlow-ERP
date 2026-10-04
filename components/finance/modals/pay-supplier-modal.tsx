'use client'

import React, { useState, useEffect } from 'react'
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

  // Auto-synchronize supplier and payment account when modal opens or lists update
 useEffect(() => {
 if (isOpen) {
 if (suppliers.length > 0 && (!supplierId || !suppliers.some((s) => s.id === supplierId))) {
 setSupplierId(suppliers[0].id)
      }
 if (liquidAccounts.length > 0 && (!paymentAccountId || !liquidAccounts.some((a) => a.id === paymentAccountId))) {
 setPaymentAccountId(liquidAccounts[0].id)
      }
    }
  }, [isOpen, suppliers, liquidAccounts, supplierId, paymentAccountId])

 const selectedSupplier = suppliers.find((s) => s.id === supplierId) || suppliers[0]

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setError(null)
 const numAmt = parseFloat(amount)

 if (isNaN(numAmt) || numAmt <= 0) {
 setError(tBilingual('Please enter a valid payment amount', 'সঠিক পেমেন্টের পরিমাণ লিখুন'))
 return
    }

 const activeSupplierId = supplierId || suppliers[0]?.id || ''
 const activeSupplier = suppliers.find((s) => s.id === activeSupplierId) || selectedSupplier
 const activePaymentAccountId = paymentAccountId || liquidAccounts[0]?.id || accounts[0]?.id || ''

 if (!activeSupplierId || !activeSupplier) {
 setError(tBilingual('Please select a supplier', 'সরবরাহকারী নির্বাচন করুন'))
 return
    }

 if (!activePaymentAccountId) {
 setError(tBilingual('Please select a payment account', 'টাকা পরিশোধের হিসাব নির্বাচন করুন'))
 return
    }

 try {
 setIsSubmitting(true)
 await onSubmit({
 supplierId: activeSupplier.id,
 supplierName: activeSupplier.supplier_name,
 paymentAccountId: activePaymentAccountId,
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
          <div className="p-3 bg-danger-surface bg-danger-surface border border-danger-border border-danger-border rounded-xl text-destructive text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        {/* Supplier Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Select Supplier', 'সরবরাহকারী')} *
          </Label>
          <select
 value={supplierId || suppliers[0]?.id || ''}
 onChange={(e) => setSupplierId(e.target.value)}
 className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-card text-foreground">
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplier_name} — {tBilingual('Mobile: ', 'মোবাইল: ')}{s.mobile}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Payment Amount', 'পরিশোধের পরিমাণ')} *
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-lg pointer-events-none">
              ৳
            </span>
            <Input
 type="number"step="any"required
 placeholder="0.00"value={amount}
 onChange={(e) => setAmount(e.target.value)}
 className="pl-8 text-xl font-bold h-12 rounded-xl bg-muted border-input focus:bg-card dark:focus:bg-surface-inset"/>
          </div>
        </div>

        {/* Payment Account */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Paid From (Account)', 'কোন তহবিল থেকে দেওয়া হলো?')} *
          </Label>
          <select
 value={paymentAccountId || liquidAccounts[0]?.id || ''}
 onChange={(e) => setPaymentAccountId(e.target.value)}
 className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-card text-foreground">
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
            <Label className="text-xs text-muted-foreground">
              {tBilingual('Payment Date', 'তারিখ')}
            </Label>
            <Input
 type="date"value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {tBilingual('Bill / Check / PO #', 'বিল বা চেক নম্বর')}
            </Label>
            <Input
 placeholder="যেমন: PO-2026-001"value={referenceNumber}
 onChange={(e) => setReferenceNumber(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {tBilingual('Payment Note', 'নোট')}
          </Label>
          <Input
 placeholder="পেমেন্ট বিবরণ"value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="h-9 text-xs rounded-lg"/>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button type="button"variant="outline"onClick={onClose} className="rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
 type="submit"disabled={isSubmitting}
 className="bg-warning hover:bg-warning/90 text-white font-semibold rounded-xl px-5">
            {isSubmitting ? tBilingual('Processing...', 'প্রসেসিং হচ্ছে...') : tBilingual('Pay Supplier', 'পাওনা পরিশোধ করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
