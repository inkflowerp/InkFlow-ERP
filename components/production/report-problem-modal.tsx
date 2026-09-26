'use client'

import React, { useState } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle2,
  X,
  Mic,
  Cpu,
  Layers,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ProductionTaskRecord } from '@/types/production.types'
import { reportProductionProblemAction } from '@/actions/production-planning.actions'

export type ProblemReasonCode =
  | 'machine_problem'
  | 'material_problem'
  | 'design_problem'
  | 'print_quality'
  | 'customer_change'
  | 'missing_material'
  | 'other'

interface ProblemReasonOption {
  code: ProblemReasonCode
  labelEn: string
  labelBn: string
  icon: React.ElementType
}

const PROBLEM_REASONS: ProblemReasonOption[] = [
  { code: 'machine_problem', labelEn: 'Machine Breakdown / Head Strike', labelBn: 'মেশিন নষ্ট / হেড স্ট্রাইক', icon: Cpu },
  { code: 'material_problem', labelEn: 'Defective / Damaged Material', labelBn: 'কাঁচামাল নষ্ট / ছেঁড়া মিডিয়া', icon: Layers },
  { code: 'design_problem', labelEn: 'File / Artwork / Dimension Issue', labelBn: 'ডিজাইন বা সাইজে ভুল', icon: FileSpreadsheet },
  { code: 'print_quality', labelEn: 'Color Mismatch / Banding Lines', labelBn: 'কালার মিসম্যাচ / প্রিন্ট দাগ', icon: AlertTriangle },
  { code: 'customer_change', labelEn: 'Customer Requested Revision', labelBn: 'কাস্টমার পরিবর্তন চেয়েছে', icon: HelpCircle },
  { code: 'missing_material', labelEn: 'Out of Stock / Media Shortage', labelBn: 'স্টকে মাল নেই / রোল শেষ', icon: AlertOctagon },
  { code: 'other', labelEn: 'Other Operational Issue', labelBn: 'অন্যান্য সমস্যা', icon: AlertOctagon },
]

interface ReportProblemModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
  onSuccess?: (result: any) => void
}

export function ReportProblemModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: ReportProblemModalProps) {
  const { tBilingual } = useI18n()

  const [selectedReason, setSelectedReason] = useState<ProblemReasonCode>('machine_problem')
  const [notes, setNotes] = useState<string>('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Handle Photo Capture / File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const res = await reportProductionProblemAction({
        task_id: task.id,
        reason: selectedReason,
        notes: notes.trim() || undefined,
        photo_url: photoPreview || undefined,
        taskPayload: task,
      })

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit problem report.')
        return
      }

      onSuccess?.(res.data)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Report Floor Issue', 'সমস্যা রিপোর্ট করুন')}
      hideFooter={true}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Summary Banner */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-600 text-white text-2xs font-bold">
                {tBilingual(`Job #${task.job_number || 'N/A'}`, `কাজ #${task.job_number || 'N/A'}`)}
              </Badge>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {task.task_name}
              </span>
            </div>
            <p className="text-2xs text-slate-500">
              {task.customer_name} • {task.quantity} {task.unit}
            </p>
          </div>
          <AlertOctagon className="h-6 w-6 text-rose-600 shrink-0" />
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium flex items-center gap-2 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Reason Picker Cards */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">
            {tBilingual('Select Problem Reason', 'সমস্যার কারণ নির্বাচন করুন')} <span className="text-rose-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {PROBLEM_REASONS.map((r) => {
              const isSelected = selectedReason === r.code
              const IconComp = r.icon
              return (
                <div
                  key={r.code}
                  onClick={() => setSelectedReason(r.code)}
                  className={`p-2.5 rounded-xl border-2 text-xs cursor-pointer transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/70 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <IconComp className={`h-4 w-4 shrink-0 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{tBilingual(r.labelEn, r.labelBn)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Photo Upload / Camera Capture */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">
            {tBilingual('Add Photo of Problem', 'সমস্যার ছবি যুক্ত করুন')}
          </Label>

          {photoPreview ? (
            <div className="relative rounded-xl border-2 border-slate-200 overflow-hidden max-h-36 flex items-center justify-center bg-slate-900">
              <img src={photoPreview} alt="Problem preview" className="max-h-36 object-contain" />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all text-center">
              <Camera className="h-6 w-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tBilingual('Take Photo or Upload Image', 'ক্যামেরা দিয়ে ছবি তুলুন বা আপলোড করুন')}
              </span>
              <span className="text-2xs text-slate-500">JPG, PNG up to 10MB</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Detailed Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Additional Notes', 'বিস্তারিত বিবরণ')}
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tBilingual('e.g. Media slipped after 10 feet / Need technician', 'যেমন: ১০ ফিট চলার পর মিডিয়া বাঁকা হয়ে গেছে')}
            className="h-10 text-xs"
          />
        </div>

        {/* Warning Explanation */}
        <p className="text-2xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg">
          {tBilingual(
            'Submitting this will pause this job, mark it as blocked, and immediately alert the Production Floor Manager.',
            'এটি জমা দিলে কাজ সাময়িকভাবে স্থগিত হবে এবং প্রোডাকশন ম্যানেজারের কাছে তাৎক্ষণিক সতর্কতা চলে যাবে।'
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="text-xs">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-10 px-5 shadow-sm"
          >
            {isSubmitting ? (
              <span>{tBilingual('Submitting...', 'জমা হচ্ছে...')}</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4" />
                {tBilingual('Confirm & Pause Job', 'স্থগিত নিশ্চিত করুন')}
              </span>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
