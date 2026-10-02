'use client'

import React, { useState, useEffect } from 'react'
import {
 CreditCard,
 DollarSign,
 AlertCircle,
 Building,
 CheckCircle2,
 Calendar,
 Receipt,
 User,
 Hash,
 Wallet,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'
import type { CustomerRecord } from '@/types/crm.types'
import { recordCustomerPaymentAction } from '@/actions/finance.actions'

export interface CollectPaymentModalProps {
 isOpen: boolean
 onClose: () => void
 customers: CustomerRecord[]
 accounts: AccountRecord[]
 initialCustomerId?: string
 initialCustomerName?: string
 initialInvoiceId?: string
 initialDueAmount?: number
 onSuccess: () => void
 companyId?: string
}

export function CollectPaymentModal({
 isOpen,
 onClose,
 customers,
 accounts,
 initialCustomerId,
 initialCustomerName,
 initialInvoiceId,
 initialDueAmount = 0,
 onSuccess,
 companyId,
}: CollectPaymentModalProps) {
 const { tBilingual } = useI18n()

 const liquidAccounts = accounts.filter(
    (a) => a.account_type === 'ASSET' && (a.account_subtype === 'CASH' || a.account_subtype === 'BANK' || a.account_subtype === 'MFS')
  )

 const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '')
 const [selectedCustomerName, setSelectedCustomerName] = useState(initialCustomerName || '')
 const [invoiceId, setInvoiceId] = useState(initialInvoiceId || '')
 const [amount, setAmount] = useState(initialDueAmount > 0 ? String(initialDueAmount) : '')
 const [paymentAccountId, setPaymentAccountId] = useState(liquidAccounts[0]?.id || '')
 const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'bkash' | 'nagad' | 'cheque' | 'card'>('cash')
 const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
 const [referenceNumber, setReferenceNumber] = useState('')
 const [notes, setNotes] = useState('')

 const [isSubmitting, setIsSubmitting] = useState(false)
 const [error, setError] = useState<string | null>(null)

 useEffect(() => {
 if (initialCustomerId) {
 setSelectedCustomerId(initialCustomerId)
 setSelectedCustomerName(initialCustomerName || '')
    }
 if (initialInvoiceId) {
 setInvoiceId(initialInvoiceId)
    }
 if (initialDueAmount > 0) {
 setAmount(String(initialDueAmount))
    }
  }, [initialCustomerId, initialCustomerName, initialInvoiceId, initialDueAmount])

 useEffect(() => {
 if (liquidAccounts.length > 0 && !paymentAccountId) {
 setPaymentAccountId(liquidAccounts[0].id)
    }
  }, [liquidAccounts, paymentAccountId])

 const handleCustomerChange = (cid: string) => {
 setSelectedCustomerId(cid)
 const cust = customers.find((c) => c.id === cid)
 if (cust) {
 setSelectedCustomerName(cust.name)
    }
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setError(null)

 const payAmount = parseFloat(amount)
 if (isNaN(payAmount) || payAmount <= 0) {
 setError(tBilingual('Please enter a valid payment amount.', 'দয়া করে সঠিক জমার পরিমাণ লিখুন।'))
 return
    }

 if (!selectedCustomerId && !selectedCustomerName) {
 setError(tBilingual('Please select a customer.', 'দয়া করে একজন গ্রাহক নির্বাচন করুন।'))
 return
    }

 if (!paymentAccountId) {
 setError(tBilingual('Please select a receiving cash or bank account.', 'দয়া করে গ্রহণকারী ক্যাশ বা ব্যাংক হিসাব নির্বাচন করুন।'))
 return
    }

 try {
 setIsSubmitting(true)
 const res = await recordCustomerPaymentAction({
 companyId: companyId || liquidAccounts[0]?.company_id,
 customerId: selectedCustomerId || 'walk-in',
 customerName: selectedCustomerName || 'Walk-in Customer',
 invoiceId: invoiceId || null,
 paymentAccountId,
 amount: payAmount,
 paymentDate,
 paymentMethod,
 referenceNumber: referenceNumber.trim() || null,
 notes: notes.trim() || null,
      })

 if (res.success) {
 onSuccess()
 onClose()
 setAmount('')
 setReferenceNumber('')
 setNotes('')
      } else {
 setError(res.error || tBilingual('Failed to record payment.', 'জমা রেকর্ড করতে ব্যর্থ হয়েছে।'))
      }
    } catch (err: any) {
 setError(err.message || 'Error recording collection')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 title={tBilingual('Collect Customer Payment', 'কাস্টমার বাকি আদায় / জমা রসিদ')}
 description={tBilingual(
        'Record payment from customer into Cash, Bank, or MFS wallet.',
        'গ্রাহকের বকেয়া পরিশোধ বা অগ্রিম জমা ক্যাশ/ব্যাংক হিসেবে জমা করুন।'
      )}
 size="md"hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0"/>
            <span>{error}</span>
          </div>
        )}

        {/* Customer Select */}
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {tBilingual('Customer *', 'গ্রাহকের নাম *')}
          </Label>
          {initialCustomerName ? (
            <div className="p-2.5 rounded-xl bg-muted text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-blue-600"/>
                {selectedCustomerName}
              </span>
              {initialDueAmount > 0 && (
                <Badge variant="outline"className="text-rose-600 border-rose-200 tabular-nums">
 Due: ৳{initialDueAmount.toLocaleString()}
                </Badge>
              )}
            </div>
          ) : (
            <select
 value={selectedCustomerId}
 onChange={(e) => handleCustomerChange(e.target.value)}
 className="h-9 w-full text-xs rounded-xl bg-card border border-border px-3"required
            >
              <option value="">{tBilingual('-- Select Customer --', '-- কাস্টমার নির্বাচন করুন --')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.mobile ? `(${c.mobile})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Optional Invoice ID */}
        {initialInvoiceId ? (
          <div>
            <Label className="text-2xs font-semibold text-muted-foreground mb-1 block">
              {tBilingual('Invoice Reference', 'ইনভয়েস নম্বর')}
            </Label>
            <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-xs tabular-nums font-medium text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
              #{invoiceId}
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-xs font-semibold text-foreground mb-1 block">
              {tBilingual('Invoice # (Optional)', 'ইনভয়েস নং (ঐচ্ছিক)')}
            </Label>
            <Input
 value={invoiceId}
 onChange={(e) => setInvoiceId(e.target.value)}
 placeholder="e.g. INV-2026-00012"className="h-9 text-xs rounded-xl"/>
          </div>
        )}

        {/* Amount to collect */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs font-semibold text-foreground">
              {tBilingual('Collection Amount (৳) *', 'আদায়ের পরিমাণ (৳) *')}
            </Label>
            {initialDueAmount > 0 && (
              <button
 type="button"onClick={() => setAmount(String(initialDueAmount))}
 className="text-2xs text-blue-600 hover:underline font-semibold cursor-pointer">
                {tBilingual('Full Due: ৳', 'সম্পূর্ণ বাকি: ৳')}
                {initialDueAmount.toLocaleString()}
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold pointer-events-none">৳</span>
            <Input
 type="number"min="1"step="any"value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="0.00"className="h-9 pl-7 text-xs rounded-xl tabular-nums font-bold text-foreground"required
            />
          </div>
        </div>

        {/* Receiving Account */}
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1 block">
            {tBilingual('Deposit Into Account *', 'যে অ্যাকাউন্টে জমা হবে *')}
          </Label>
          <select
 value={paymentAccountId}
 onChange={(e) => {
 setPaymentAccountId(e.target.value)
 const acc = accounts.find((a) => a.id === e.target.value)
 if (acc) {
 if (acc.account_subtype === 'CASH') setPaymentMethod('cash')
 else if (acc.account_subtype === 'BANK') setPaymentMethod('bank_transfer')
 else if (acc.account_subtype === 'MFS') {
 const m = (acc.name || '').toLowerCase()
 if (m.includes('nagad')) setPaymentMethod('nagad')
 else setPaymentMethod('bkash')
                }
              }
            }}
 className="h-9 w-full text-xs rounded-xl bg-card border border-border px-3 font-medium"required
          >
            {liquidAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.account_subtype}) — ৳{a.current_balance.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Date & Reference */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-2xs font-semibold text-muted-foreground mb-1 block">
              {tBilingual('Payment Date', 'জমার তারিখ')}
            </Label>
            <Input
 type="date"value={paymentDate}
 onChange={(e) => setPaymentDate(e.target.value)}
 className="h-8 text-xs rounded-lg bg-card"required
            />
          </div>
          <div>
            <Label className="text-2xs font-semibold text-muted-foreground mb-1 block">
              {tBilingual('Receipt / TrxID #', 'রসিদ / ট্রানজেকশন আইডি')}
            </Label>
            <Input
 value={referenceNumber}
 onChange={(e) => setReferenceNumber(e.target.value)}
 placeholder="e.g. TRX-9041 / Chq 458"className="h-8 text-xs rounded-lg bg-card"/>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-2xs font-semibold text-muted-foreground mb-1 block">
            {tBilingual('Narration / Note', 'মন্তব্য / নোট')}
          </Label>
          <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="e.g. Received advance for banner printing"className="h-8 text-xs rounded-lg"/>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
 type="button"variant="outline"size="sm"onClick={onClose}
 disabled={isSubmitting}
 className="text-xs h-8 rounded-xl">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-xl font-semibold shadow-xs">
            {isSubmitting ? tBilingual('Recording...', 'রেকর্ড হচ্ছে...') : tBilingual('Record Collection', 'টাকা জমা নিন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
