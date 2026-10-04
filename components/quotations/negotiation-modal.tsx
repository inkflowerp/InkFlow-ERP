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
 Sparkles,
 Percent,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuotationRecord } from '@/types/quotation.types'
import { applyQuotationNegotiationAction } from '@/actions/quotation.actions'
import { formatBDT } from '@/lib/formatters'
import { dispatchToast } from '@/components/shared/toast-feedback'

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

 useEffect(() => {
 if (open && quotation) {
 setDiscountAmount(quotation.discount_amount || 0)
 setNotes('')
 setIsSubmitting(false)
    }
  }, [open, quotation])

 const subtotal = quotation?.subtotal || 0
 const totalCost = quotation?.total_cost || Math.round(subtotal * 0.55)
 const vatRate = quotation?.vat_rate || 7.5

 const calculated = useMemo(() => {
 const disc = Math.max(0, Math.min(subtotal, Number(discountAmount) || 0))
 const subAfterDisc = Math.max(0, subtotal - disc)
 const vat = Math.round((subAfterDisc * vatRate) / 100)
 const grandTotal = subAfterDisc + vat
 const grossProfit = Math.round(subAfterDisc - totalCost)
 const marginPercent = subAfterDisc > 0 ? Math.round((grossProfit / subAfterDisc) * 100) : 0
 const breakEvenFloor = totalCost

 return {
 discount: disc,
 subAfterDisc,
 vat,
 grandTotal,
 grossProfit,
 marginPercent,
 breakEvenFloor,
 isLowMargin: marginPercent < 25,
 isCriticalLoss: grossProfit <= 0,
    }
  }, [subtotal, discountAmount, vatRate, totalCost])

 if (!quotation) return null

  // Helper to round grand total to nearest amount (e.g. 500, 100, 50)
 const handleRoundGrandTotal = (nearest: number) => {
 const fullGrandTotal = subtotal + Math.round((subtotal * vatRate) / 100)
 const targetGrandTotal = Math.floor(fullGrandTotal / nearest) * nearest
 const grandTotalReduction = Math.max(0, fullGrandTotal - targetGrandTotal)
 const neededDiscount = Math.round(grandTotalReduction / (1 + vatRate / 100))
 setDiscountAmount(Math.max(0, Math.min(subtotal, neededDiscount)))
  }

  // Helper for percentage concession
 const handleConcessionPercent = (pct: number) => {
 const disc = Math.round((subtotal * pct) / 100)
 setDiscountAmount(disc)
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsSubmitting(true)

 try {
 const res = await applyQuotationNegotiationAction(
 quotation.id,
 calculated.discount,
 notes.trim() || undefined,
 companyId
      )

 setIsSubmitting(false)
 if (res.success && res.data) {
 dispatchToast({
 type: 'success',
 title: 'Concession Applied',
 message: `Negotiated discount of ৳${calculated.discount.toLocaleString()} applied to quotation.`,
        })
 if (onNegotiationApplied) {
 onNegotiationApplied(res.data)
        }
 onOpenChange(false)
      } else {
 dispatchToast({
 type: 'error',
 title: 'Concession Failed',
 message: res.error || 'Failed to apply negotiated concession.',
        })
      }
    } catch (err: any) {
 setIsSubmitting(false)
 dispatchToast({
 type: 'error',
 title: 'Error Occurred',
 message: err?.message || 'Unexpected error occurred.',
      })
    }
  }

 return (
    <ModalDialog
 open={open}
 onOpenChange={onOpenChange}
 size="lg"title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-warning-surface text-warning bg-warning/60 text-warning flex items-center justify-center font-bold">
            <Sliders className="h-4 w-4"/>
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Commercial Margin & Negotiation Simulator</h2>
            <p className="text-xs text-muted-foreground">
 Internal margin simulation • Protects minimum floor price • Strictly shielded from customer PDF
            </p>
          </div>
        </div>
      }
 hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Margin Simulation Metrics Box */}
        <div className="p-4 rounded-xl bg-surface-inset text-foreground space-y-2.5 text-xs shadow-xs border border-border">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>List Quoted Subtotal:</span>
            <span className="tabular-nums font-bold text-foreground">{formatBDT(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-1">
 Internal Direct Cost Floor:
              <span className="text-xs bg-card/10 px-1.5 py-0.2 rounded text-muted-foreground">Materials + Print Labor</span>
            </span>
            <span className="tabular-nums font-bold text-warning">{formatBDT(totalCost)}</span>
          </div>

          <div className="border-t border-border pt-2 grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-muted-foreground block">Projected Gross Profit</span>
              <span
 className={`text-base font-black tabular-nums ${
 calculated.grossProfit >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {formatBDT(calculated.grossProfit)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Projected Margin</span>
              <span
 className={`text-base font-black tabular-nums ${
 calculated.marginPercent >= 35
                    ? 'text-success'
                    : calculated.marginPercent >= 25
                    ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {calculated.marginPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Low Margin & Critical Loss Warning */}
        {calculated.isCriticalLoss ? (
          <div className="p-3 bg-danger-surface text-destructive bg-danger-surface/80 text-destructive rounded-xl border border-danger-border border-danger-border text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold">Loss-Making Deal Alert!</span>
              <p className="text-xs text-destructive text-destructive mt-0.5">
 The discount reduces selling price below internal production cost ({formatBDT(totalCost)}). You will incur an operational loss.
              </p>
            </div>
          </div>
        ) : calculated.isLowMargin ? (
          <div className="p-3 bg-warning-surface text-warning bg-warning-surface text-warning rounded-xl border border-warning-border border-warning-border text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5"/>
            <div>
              <span className="font-bold">Low Margin Warning (&lt; 25%)</span>
              <p className="text-xs text-warning text-warning mt-0.5">
 Gross margin is under 25%. Overhead, machine depreciation, and delivery may erode net profit.
              </p>
            </div>
          </div>
        ) : null}

        {/* 1-Click Quick Concession Presets */}
        <div className="space-y-2 p-3 rounded-xl bg-muted border border-border text-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-warning"/>
 Quick Concession Helpers (ছাড় ও রাউন্ড অফ)
            </span>
            <span className="text-xs text-muted-foreground">1-Click Auto Adjust</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground font-semibold mr-1">Concession %:</span>
            {[3, 5, 8, 10, 15].map((pct) => (
              <button
 key={pct}
 type="button"onClick={() => handleConcessionPercent(pct)}
 className="px-2 py-1 rounded bg-card border border-border text-xs font-semibold text-foreground hover:border-warning-border hover:text-warning transition-colors cursor-pointer">
                {pct}% (৳{Math.round((subtotal * pct) / 100).toLocaleString()})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground font-semibold mr-1">Round Grand Total:</span>
            {[500, 100, 50].map((nearest) => (
              <button
 key={nearest}
 type="button"onClick={() => handleRoundGrandTotal(nearest)}
 className="px-2 py-1 rounded bg-card border border-border text-xs font-semibold text-foreground hover:border-border hover:text-primary transition-colors cursor-pointer">
 Round to ৳{nearest}
              </button>
            ))}
            <button
 type="button"onClick={() => setDiscountAmount(0)}
 className="px-2 py-1 rounded bg-danger-surface text-destructive bg-danger-surface text-destructive border border-danger-border border-danger-border text-xs font-semibold hover:bg-danger-surface transition-colors cursor-pointer ml-auto">
 Reset
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="discAmt"className="text-xs font-semibold mb-1 block">
 Negotiated Concession Discount (৳ BDT)
            </Label>
            <Input
 id="discAmt"type="number"min={0}
 max={subtotal}
 value={discountAmount || ''}
 onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
 className="text-xs h-9 tabular-nums"placeholder="Enter discount in Taka..."/>
            <span className="text-xs text-muted-foreground mt-1 block">
 Maximum allowed: {formatBDT(subtotal)} • Minimum Break-even Subtotal: {formatBDT(totalCost)}
            </span>
          </div>

          <div>
            <Label htmlFor="negRemarks"className="text-xs font-semibold mb-1 block">
 Negotiation Rationale / Owner Remarks
            </Label>
            <Input
 id="negRemarks"placeholder="e.g. Client agreed to pay 70% advance via bKash in exchange for ৳1,500 concession."value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="text-xs h-9"/>
          </div>

          {/* Result Preview */}
          <div className="p-3 rounded-lg bg-muted border border-border text-xs flex items-center justify-between">
            <span className="text-muted-foreground">Revised Grand Total (with VAT):</span>
            <span className="text-base font-black tabular-nums text-foreground">
              {formatBDT(calculated.grandTotal)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 className="text-xs h-9">
 Cancel
          </Button>
          <Button
 type="submit"disabled={isSubmitting}
 className="text-xs h-9 bg-warning hover:bg-warning/90 text-white font-bold px-4 cursor-pointer">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>
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
