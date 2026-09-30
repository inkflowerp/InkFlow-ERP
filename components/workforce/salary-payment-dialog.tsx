'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  Wallet,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { PayrollItemRecord, PaymentMethod } from '@/types/workforce.types'

export interface SalaryPaymentDialogProps {
  item: PayrollItemRecord | null
  periodId: string
  periodName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecordPayment: (params: {
    payrollPeriodId: string
    payrollItemId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
  }) => Promise<void>
}

export function SalaryPaymentDialog({
  item,
  periodId,
  periodName,
  open,
  onOpenChange,
  onRecordPayment,
}: SalaryPaymentDialogProps) {
  if (!item) return null

  const currentDue = Number(item.due_amount || (Number(item.net_salary || 0) - Number(item.paid_amount || 0)))
  const [amount, setAmount] = useState<number>(currentDue)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [refNum, setRefNum] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.')
      return
    }
    if (amount > currentDue) {
      setErrorMsg(`Amount cannot exceed the current due of ৳ ${currentDue.toLocaleString('en-IN')}`)
      return
    }

    setIsSubmitting(true)
    try {
      await onRecordPayment({
        payrollPeriodId: periodId,
        payrollItemId: item.id,
        employeeId: item.employee_id,
        amount,
        paymentMethod: method,
        referenceNumber: refNum,
        notes,
      })
      onOpenChange(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record salary payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white border-slate-200 shadow-xl rounded-2xl space-y-4">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>Disburse Salary Payment</span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {item.employee_name} • {periodName}
          </p>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Due Info Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Current Outstanding Due</span>
              <span className="text-lg font-bold text-rose-600 tabular-nums">
                ৳ {currentDue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Net Salary</span>
              <span className="text-xs font-semibold text-slate-800 tabular-nums">
                ৳ {Number(item.net_salary || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Payment Amount (৳) *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs font-bold tabular-nums"
                max={currentDue}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(currentDue)}
                className="h-9 text-xs border-slate-200 shrink-0"
              >
                Pay Full
              </Button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Payment Method</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1.5">
              {(['cash', 'bank', 'bkash', 'nagad', 'rocket'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`p-2 rounded-lg border text-center uppercase font-bold text-[11px] transition-all ${
                    method === m
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Transaction Reference / Voucher</Label>
            <Input
              placeholder="e.g. TrxID / Cheque # / Voucher #"
              value={refNum}
              onChange={(e) => setRefNum(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Payment Notes (Optional)</Label>
            <Input
              placeholder="e.g. Paid in cash at outlet counter"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[32px]"
            >
              {isSubmitting ? 'Recording...' : `Confirm ৳ ${amount.toLocaleString('en-IN')}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
