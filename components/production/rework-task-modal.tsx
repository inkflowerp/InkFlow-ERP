'use client'

import React, { useState } from 'react'
import { RotateCcw, AlertTriangle, Layers } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ProductionTaskRecord,
  ReworkTaskInput,
} from '@/types/production.types'
import { reworkProductionTaskAction } from '@/actions/production-planning.actions'

interface ReworkTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
  onSuccess?: (reworkTask: ProductionTaskRecord) => void
}

export function ReworkTaskModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: ReworkTaskModalProps) {
  const { tBilingual } = useI18n()

  const [reason, setReason] = useState<string>('')
  const [reworkQuantity, setReworkQuantity] = useState<number>(1)
  const [scrapWastage, setScrapWastage] = useState<string>('')
  const [extraMinutes, setExtraMinutes] = useState<number>(30)
  const [notes, setNotes] = useState<string>('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  React.useEffect(() => {
    if (isOpen && task) {
      setReworkQuantity(task.quantity)
      setReason('')
      setScrapWastage('')
      setExtraMinutes(task.estimated_duration_minutes || 30)
      setNotes('')
      setErrorMessage(null)
    }
  }, [isOpen, task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for rework.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const input: ReworkTaskInput = {
        parent_task_id: task.id,
        reason: reason.trim(),
        rework_quantity: reworkQuantity,
        scrap_wastage: scrapWastage.trim() || null,
        extra_estimated_minutes: extraMinutes,
        notes: notes.trim() || undefined,
      }

      const res = await reworkProductionTaskAction(input)
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to create rework ticket.')
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
      title={tBilingual('Log Defect & Request Rework', 'ত্রুটি নথিভুক্ত ও রি-ওয়ার্ক আবেদন')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parent Task Card */}
        <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 space-y-1">
          <div className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4 text-rose-600" />
            <span>{task.task_name}</span>
          </div>
          <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
            Original task records are preserved for costing and audit purposes. A new linked high-priority rework task will be queued.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Defect Reason */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Defect / Rework Reason', 'ত্রুটি বা রি-ওয়ার্কের কারণ')} *
          </Label>
          <Input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Color mismatch / Wrinkled lamination / Misaligned die-cut..."
            className="text-xs"
          />
        </div>

        {/* Rework Quantity & Extra Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Rework Quantity', 'পুনরায় তৈরি পরিমাণ')} ({task.unit})
            </Label>
            <Input
              type="number"
              min={1}
              required
              value={reworkQuantity}
              onChange={(e) => setReworkQuantity(parseInt(e.target.value) || 1)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {tBilingual('Est. Time (Minutes)', 'আনুমানিক সময় (মিনিট)')}
            </Label>
            <Input
              type="number"
              min={5}
              step={5}
              required
              value={extraMinutes}
              onChange={(e) => setExtraMinutes(parseInt(e.target.value) || 15)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Material Scrap */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Scrap / Material Wastage', 'নষ্ট হওয়া মিডিয়া ও কাঁচামাল')}
          </Label>
          <Input
            value={scrapWastage}
            onChange={(e) => setScrapWastage(e.target.value)}
            placeholder="e.g. 50 sqft SAV Vinyl, 1 roll lamination film..."
            className="text-xs"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            disabled={isSubmitting}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            {isSubmitting ? tBilingual('Submitting...', 'আবেদন হচ্ছে...') : tBilingual('Queue Rework Task', 'রি-ওয়ার্ক কিউতে পাঠান')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
