'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { formatBDT } from '@/lib/formatters'
import type { QuotationRecord } from '@/types/quotation.types'

export interface ConvertToOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: QuotationRecord | null
  onConfirm: (data: {
    advanceAmount: number
    paymentMethod: string
    transactionReference?: string
    notes?: string
  }) => Promise<void>
  isSubmitting?: boolean
}

export function ConvertToOrderModal({
  open,
  onOpenChange,
  quotation,
  onConfirm,
  isSubmitting = false,
}: ConvertToOrderModalProps) {
  if (!quotation) return null

  const grandTotal = Number(quotation.grand_total) || 0
  const defaultAdvancePct = quotation.advance_percentage !== undefined && quotation.advance_percentage !== null ? quotation.advance_percentage : 50
  const initialAdvanceAmt = quotation.advance_amount !== undefined && quotation.advance_amount !== null
    ? quotation.advance_amount
    : Math.round((grandTotal * defaultAdvancePct) / 100)

  const [advanceAmount, setAdvanceAmount] = useState<number>(initialAdvanceAmt)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(defaultAdvancePct)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [transactionRef, setTransactionRef] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Re-sync on modal open or quotation change
  useEffect(() => {
    if (open && quotation) {
      const gTotal = Number(quotation.grand_total) || 0
      const advPct = quotation.advance_percentage !== undefined && quotation.advance_percentage !== null ? quotation.advance_percentage : 50
      const initAdv = quotation.advance_amount !== undefined && quotation.advance_amount !== null
        ? quotation.advance_amount
        : Math.round((gTotal * advPct) / 100)
      setAdvanceAmount(initAdv)
      setSelectedPercentage(advPct)
      setPaymentMethod('cash')
      setTransactionRef('')
      setNotes('')
      setError(null)
    }
  }, [open, quotation])

  const handlePercentageClick = (pct: number) => {
    setSelectedPercentage(pct)
    const calc = Math.round((grandTotal * pct) / 100)
    setAdvanceAmount(calc)
    setError(null)
  }

  const handleAmountChange = (valStr: string) => {
    setSelectedPercentage(null)
    const num = Math.max(0, Math.min(grandTotal, Number(valStr) || 0))
    setAdvanceAmount(num)
    setError(null)
  }

  const balanceDue = Math.max(0, grandTotal - advanceAmount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (advanceAmount > grandTotal) {
      setError('Advance amount cannot exceed the total quoted value.')
      return
    }

    try {
      await onConfirm({
        advanceAmount,
        paymentMethod: advanceAmount > 0 ? paymentMethod : 'none',
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to convert quotation to order.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-xl">
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-xl p-0 gap-0 overflow-hidden bg-card text-foreground border-border">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-surface-inset text-foreground">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Convert to Production Job Order
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Quotation #{quotation.quotation_number} • Confirm advance payment to initialize production routing
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quotation & Customer Summary Card */}
          <div className="p-3.5 rounded-xl bg-muted/60 border border-border grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-xs uppercase font-semibold">Customer</span>
              <span className="font-bold text-foreground text-sm block truncate">
                {quotation.customer_name}
              </span>
              {quotation.customer_company && (
                <span className="text-muted-foreground text-xs block truncate">
                  {quotation.customer_company}
                </span>
              )}
              <span className="text-muted-foreground text-xs block">
                {quotation.customer_phone}
              </span>
            </div>

            <div className="text-right">
              <span className="text-muted-foreground block text-xs uppercase font-semibold">Total Quoted Value</span>
              <span className="font-black text-foreground text-base tabular-nums block">
                {formatBDT(grandTotal)}
              </span>
              <Badge variant="outline" className="mt-1 text-xs uppercase font-bold bg-secondary text-secondary-foreground border-border">
                {quotation.customer_type || 'Retail'} Tier
              </Badge>
            </div>
          </div>

          {/* Advance Collection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wide">
                Advance Payment (অগ্রিম গ্রহণ)
              </Label>
              <span className="text-xs text-muted-foreground">
                Recommended: {defaultAdvancePct}% ({formatBDT(Math.round((grandTotal * defaultAdvancePct) / 100))})
              </span>
            </div>

            {/* Percentage Presets */}
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 30, 50, 70, 100].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  size="sm"
                  variant={selectedPercentage === pct ? 'default' : 'outline'}
                  onClick={() => handlePercentageClick(pct)}
                  className={`h-8 text-xs font-bold ${
                    selectedPercentage === pct
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-foreground border-border'
                  }`}
                >
                  {pct === 0 ? 'No Adv' : `${pct}%`}
                </Button>
              ))}
            </div>

            {/* Custom Amount Input & Calculation HUD */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="advanceAmount" className="text-xs text-muted-foreground">
                  Advance Amount (৳)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">
                    ৳
                  </span>
                  <Input
                    id="advanceAmount"
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="1"
                    value={advanceAmount || ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-7 h-9 text-xs font-bold tabular-nums bg-background border-border text-foreground"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Remaining Balance on Delivery
                </Label>
                <div className="h-9 px-3 rounded-md bg-muted border border-border flex items-center justify-between text-xs font-bold tabular-nums text-foreground">
                  <span>Due:</span>
                  <span className={balanceDue > 0 ? 'text-warning font-black' : 'text-success font-black'}>
                    {formatBDT(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Details (When Advance > 0) */}
          {advanceAmount > 0 && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 animate-in fade-in-0">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wide block">
                Payment Collection Details
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash (নগদ)', icon: Banknote },
                  { id: 'bkash', label: 'bKash (বিকাশ)', icon: Smartphone },
                  { id: 'nagad', label: 'Nagad (নগদ)', icon: Smartphone },
                  { id: 'bank', label: 'Bank Transfer', icon: Building },
                ].map((pm) => {
                  const Icon = pm.icon
                  const isSelected = paymentMethod === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-center ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{pm.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="trxRef" className="text-xs text-muted-foreground">
                    TrxID / Cheque No. / Slip Reference
                  </Label>
                  <Input
                    id="trxRef"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 9K284JLZ or Slip #1042"
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="payNotes" className="text-xs text-muted-foreground">
                    Payment Note (Optional)
                  </Label>
                  <Input
                    id="payNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Received at shop counter"
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 text-xs border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Converting Order...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Confirm & Convert to Job Order</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
