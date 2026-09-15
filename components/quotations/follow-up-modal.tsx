'use client'

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Phone,
  Mail,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { QuotationRecord, FollowUpMethod, FollowUpOutcome } from '@/types/quotation.types'
import { recordQuotationFollowUpAction } from '@/actions/quotation.actions'
import { formatBDT } from '@/lib/formatters'

export interface FollowUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: QuotationRecord | null
  onFollowUpRecorded?: (quote: QuotationRecord) => void
  companyId?: string
}

export function FollowUpModal({
  open,
  onOpenChange,
  quotation,
  onFollowUpRecorded,
  companyId = 'c-01',
}: FollowUpModalProps) {
  const [method, setMethod] = useState<FollowUpMethod>('whatsapp')
  const [outcome, setOutcome] = useState<FollowUpOutcome>('interested')
  const [note, setNote] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('')
  const [markResponded, setMarkResponded] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens or quotation changes
  useEffect(() => {
    if (open && quotation) {
      setMethod('whatsapp')
      setOutcome('interested')
      setNote('')
      setError(null)
      setIsSubmitting(false)
      setMarkResponded(true)

      // Default next follow up date to tomorrow
      const d = new Date()
      d.setDate(d.getDate() + 1)
      setNextFollowUpDate(d.toISOString().split('T')[0])
    }
  }, [open, quotation])

  if (!quotation) return null

  const handleQuickSchedule = (days: number) => {
    if (days === 0) {
      setNextFollowUpDate('')
      return
    }
    const d = new Date()
    d.setDate(d.getDate() + days)
    setNextFollowUpDate(d.toISOString().split('T')[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      setError('Please add a brief note about the customer conversation.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await recordQuotationFollowUpAction(
        {
          quotationId: quotation.id,
          method,
          note: note.trim(),
          outcome,
          nextFollowUpDate: nextFollowUpDate || null,
          markResponded,
        },
        companyId
      )

      setIsSubmitting(false)
      if (res.success && res.data) {
        if (onFollowUpRecorded) {
          onFollowUpRecorded(res.data)
        }
        onOpenChange(false)
      } else {
        setError(res.error || 'Failed to record follow-up.')
      }
    } catch (err: any) {
      setIsSubmitting(false)
      setError(err?.message || 'Encountered an unexpected error.')
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Quotation Follow-up</h2>
            <p className="text-[11px] text-slate-500">
              Log client conversation, update status, and schedule next contact
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Quotation Summary Card */}
        <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1.5 text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-cyan-300">
              #{quotation.quotation_number}
            </span>
            <span className="font-mono font-black text-sm text-emerald-400">
              ৳ {formatBDT(quotation.grand_total)}
            </span>
          </div>
          <div className="text-slate-300 font-semibold truncate">
            {quotation.customer_name} {quotation.customer_company && `(${quotation.customer_company})`}
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
            <span>📞 {quotation.customer_phone}</span>
            <span>•</span>
            <span>Valid Until: {quotation.valid_until}</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 border border-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contact Method */}
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Contact Method</Label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
              { id: 'phone', label: 'Phone', icon: Phone },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'in_person', label: 'In-person', icon: User },
              { id: 'other', label: 'Other', icon: Clock },
            ].map((m) => {
              const Icon = m.icon
              const isSelected = method === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as FollowUpMethod)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px]">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Customer Reaction / Outcome */}
        <div>
          <Label htmlFor="outcomeSelect" className="text-xs font-semibold mb-1 block">
            Customer Response / Current Stage
          </Label>
          <select
            id="outcomeSelect"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as FollowUpOutcome)}
            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
          >
            <option value="interested">Interested — Considering proposal</option>
            <option value="negotiating">Negotiating — Requested discount or revised scope</option>
            <option value="approved">Approved — Verbally confirmed / Ready for order</option>
            <option value="price_high">Price Concern — Found rate higher than expected</option>
            <option value="competitor_chosen">Lost — Chose another supplier</option>
            <option value="postponed">Postponed — Project on hold</option>
            <option value="no_response">No Response — Ringing / Message delivered</option>
          </select>
        </div>

        {/* Follow-up Note */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="followUpNote" className="text-xs font-semibold">
              Follow-Up Notes <span className="text-rose-500">*</span>
            </Label>
            <span className="text-[10px] text-slate-400">Internal only • Never shared with customer</span>
          </div>
          <textarea
            id="followUpNote"
            rows={3}
            placeholder="e.g. Spoke with Mr. Karim. He asked for 5% discount on installation. Will decide tomorrow morning."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Next Follow-up Date */}
        <div>
          <Label className="text-xs font-semibold mb-1 block">Schedule Next Follow-Up</Label>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => handleQuickSchedule(1)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSchedule(3)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              In 3 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickSchedule(7)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              In 1 Week
            </button>
            <button
              type="button"
              onClick={() => handleQuickSchedule(0)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500 font-medium cursor-pointer"
            >
              No Follow-Up
            </button>
          </div>
          <Input
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
            className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Follow-Up & Timeline'
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
