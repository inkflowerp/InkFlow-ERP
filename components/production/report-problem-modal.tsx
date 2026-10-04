'use client'

import React, { useState, useRef } from 'react'
import { AlertOctagon, Camera, Image as ImageIcon, X, Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { reportProductionProblemAction } from '@/actions/production-planning.actions'
import type { ProductionTaskRecord } from '@/types/production.types'

interface ReportProblemModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
  onSuccess?: (updatedTask: ProductionTaskRecord) => void
}

const PROBLEM_REASONS = [
  { code: 'machine_breakdown', labelEn: 'Machine Breakdown', labelBn: 'মেশিন নষ্ট / বিকল' },
  { code: 'material_defect', labelEn: 'Material Defect / Shortage', labelBn: 'কাঁচামাল সমস্যা / ঘাটতি' },
  { code: 'artwork_issue', labelEn: 'Artwork / Color Issue', labelBn: 'ডিজাইন বা রঙের ত্রুটি' },
  { code: 'power_outage', labelEn: 'Power / Electricity Outage', labelBn: 'বিদ্যুৎ বিভ্রাট' },
  { code: 'quality_issue', labelEn: 'Print Quality Issue', labelBn: 'ছাপার মান খারাপ' },
  { code: 'other', labelEn: 'Other Emergency', labelBn: 'অন্যান্য জরুরি সমস্যা' },
]

export function ReportProblemModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: ReportProblemModalProps) {
  const { tBilingual } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [reason, setReason] = useState<string>('machine_breakdown')
  const [notes, setNotes] = useState<string>('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(tBilingual('Photo size must be under 10MB', 'ছবির সাইজ ১০ মেগাবাইটের কম হতে হবে'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string)
      setErrorMessage(null)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const res = await reportProductionProblemAction({
        task_id: task.id,
        reason,
        notes: notes.trim() || undefined,
        photo_url: photoDataUrl || undefined,
        taskPayload: task,
      })

      if (!res.success || !res.data) {
        setErrorMessage(res.error || tBilingual('Failed to report problem', 'সমস্যা রিপোর্ট ব্যর্থ হয়েছে'))
        return
      }

      onSuccess?.(res.data.task || { ...task, status: 'on_hold' })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || tBilingual('An unexpected error occurred', 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Report Production Problem', 'উৎপাদন সমস্যা রিপোর্ট (জরুরি)')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Context Card */}
        <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 space-y-1">
          <div className="text-xs font-bold text-destructive flex items-center gap-1.5">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span className="truncate">{task.task_name} ({task.task_number})</span>
          </div>
          <p className="text-xs text-muted-foreground bangla-text">
            {tBilingual(
              'Reporting a problem atomically pauses this task and notifies the production manager.',
              'সমস্যা রিপোর্ট করলে কাজটি সাথে সাথে স্থগিত হবে এবং সুপারভাইজার নোটিফিকেশন পাবেন।'
            )}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-destructive/15 text-destructive rounded-xl text-xs font-semibold border border-destructive/30">
            {errorMessage}
          </div>
        )}

        {/* Reason Selector (Glove friendly touch buttons) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold bangla-text text-foreground">
            {tBilingual('Problem Category', 'সমস্যার ধরন নির্বাচন করুন')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {PROBLEM_REASONS.map((r) => {
              const isSelected = reason === r.code
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReason(r.code)}
                  className={`min-h-[48px] p-2 rounded-xl text-left text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-destructive text-destructive-foreground border-destructive shadow-xs'
                      : 'bg-card text-foreground border-border hover:bg-muted active:scale-95'
                  }`}
                >
                  <div className="truncate">{r.labelBn}</div>
                  <div className="text-xs opacity-80 font-normal truncate">{r.labelEn}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold bangla-text text-foreground">
            {tBilingual('Problem Details / Notes', 'সমস্যার বিস্তারিত বিবরণ')}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={tBilingual('Explain the issue clearly...', 'কী সমস্যা হয়েছে সংক্ষেপে লিখুন...')}
            className="text-sm rounded-xl border-border bg-background"
          />
        </div>

        {/* Photo Attachment (Camera Capture) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold bangla-text text-foreground">
            {tBilingual('Attach Photo (Optional)', 'সমস্যার ছবি তুলুন (ঐচ্ছিক)')}
          </Label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {photoDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted max-h-48 flex items-center justify-center">
              <img
                src={photoDataUrl}
                alt="Problem preview"
                className="max-h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-card cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[52px] rounded-xl border-2 border-dashed border-border bg-card hover:bg-muted active:scale-98 flex items-center justify-center gap-2 text-sm font-bold text-foreground bangla-text transition-colors cursor-pointer"
            >
              <Camera className="h-5 w-5 text-primary" />
              <span>{tBilingual('Take Photo with Camera', 'ক্যামেরা দিয়ে ছবি তুলুন')}</span>
            </button>
          )}
        </div>

        {/* Action Buttons (min-h-[48px]) */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[48px] text-sm font-bold bangla-text border-border"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[48px] text-sm font-bold bangla-text bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                {tBilingual('Reporting...', 'রিপোর্ট হচ্ছে...')}
              </>
            ) : (
              <>
                <AlertOctagon className="h-4 w-4 mr-1.5" />
                {tBilingual('Submit Report', 'রিপোর্ট জমা দিন')}
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
