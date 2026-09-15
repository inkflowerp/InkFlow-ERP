'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuotationRecord } from '@/types/quotation.types'
import { applyQuotationNegotiationAction } from '@/actions/quotation.actions'
import { formatBDT } from '@/lib/formatters'

export interface NegotiationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: QuotationRecord | null
  onNegotiationApplied?: (quote: QuotationRecord) => void
  companyId?: string
}

export function NegotiationModal({
  open,
  onOpenChange,
  quotation,
  onNegotiationApplied,
  companyId = 'c-01',
}: NegotiationModalProps) {
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && quotation) {
      setDiscountAmount(quotation.discount_amount || 0)
      setNotes('')
      setError(null)
      setIsSubmitting(false)
    }
  }, [open, quotation])

  if (!quotation) return null

  const subtotal = quotation.subtotal || 0
  const totalCost = quotation.total_cost || Math.round(subtotal * 0.55)
  const vatRate = quotation.vat_rate || 7.5

  const calculated = useMemo(() => {
    const disc = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0))
    const subAfterDisc = Math.max(0, subtotal - disc)
    const vat = Math.round((subAfterDisc * vatRate) / 100)
    const grandTotal = subAfterDisc + vat
    const grossProfit = Math.round(subAfterDisc - totalCost)
    const marginPercent = subAfterDisc > 0 ? Math.round((grossProfit / subAfterDisc) * 100) : 0

    return {
      discount: disc,
      subAfterDisc,
      vat,
      grandTotal,
      grossProfit,
      marginPercent,
      isLowMargin: marginPercent < 25,
    }
  }, [subtotal, discountAmount, vatRate, totalCost])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await applyQuotationNegotiationAction(
        quotation.id,
        calculated.discount,
        notes.trim() || undefined,
        companyId
      )

      setIsSubmitting(false)
      if (res.success && res.data) {
        if (onNegotiationApplied) {
          onNegotiationApplied(res.data)
        }
        onOpenChange(false)
      } else {
        setError(res.error || 'Failed to apply negotiated concession.')
      }
    } catch (err: any) {
      setIsSubmitting(false)
      setError(err?.message || 'Unexpected error occurred.')
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Negotiation Margin Analyzer</h2>
            <p className="text-[11px] text-slate-500">
              Internal margin simulation • Strictly shielded from customer view & PDF
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Margin Simulation Metrics Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 text-xs shadow-md">
          <div className="flex justify-between items-center text-slate-400">
            <span>List Quoted Subtotal:</span>
            <span className="font-mono font-bold text-slate-200">{formatBDT(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1">
              Estimated Internal Cost:
              <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded text-slate-300">Staff Shielded</span>
            </span>
            <span className="font-mono font-bold text-amber-400">{formatBDT(totalCost)}</span>
          </div>

          <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">Projected Gross Profit</span>
              <span
                className={`text-base font-black font-mono ${
                  calculated.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatBDT(calculated.grossProfit)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Projected Margin</span>
              <span
                className={`text-base font-black font-mono ${
                  calculated.marginPercent >= 35
                    ? 'text-emerald-400'
                    : calculated.marginPercent >= 25
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {calculated.marginPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Low Margin Warning */}
        {calculated.isLowMargin && (
          <div className="p-3 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 rounded-xl border border-rose-200 dark:border-rose-900 text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Low Margin Warning</span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Gross margin is under 25%. This quotation may risk losses when account labor, machine wear, and delivery costs are factored in.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="discAmt" className="text-xs font-semibold mb-1 block">
              Negotiated Concession Discount (৳ BDT)
            </Label>
            <Input
              id="discAmt"
              type="number"
              min={0}
              max={subtotal}
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="text-xs h-9 font-mono"
              placeholder="Enter discount in Taka..."
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Maximum allowed: {formatBDT(subtotal)}
            </span>
          </div>

          <div>
            <Label htmlFor="negRemarks" className="text-xs font-semibold mb-1 block">
              Negotiation Rationale / Owner Remarks
            </Label>
            <Input
              id="negRemarks"
              placeholder="e.g. Client agreed to pay 70% advance in exchange for ৳1,500 concession."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Result Preview */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Revised Grand Total (with VAT):</span>
            <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {formatBDT(calculated.grandTotal)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Updating...
              </>
            ) : (
              'Apply Concession & Save'
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
