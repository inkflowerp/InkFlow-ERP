'use client'

import React, { useState } from 'react'
import { AlertOctagon, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
 ProductionTaskRecord,
 HoldReason,
 HOLD_REASON_LABELS,
 HoldTaskInput,
} from '@/types/production.types'
import { holdProductionTaskAction } from '@/actions/production-planning.actions'

interface HoldTaskModalProps {
 isOpen: boolean
 onClose: () => void
 task: ProductionTaskRecord | null
 onSuccess?: (updatedTask: ProductionTaskRecord) => void
}

export function HoldTaskModal({
 isOpen,
 onClose,
 task,
 onSuccess,
}: HoldTaskModalProps) {
 const { tBilingual } = useI18n()

 const [holdReason, setHoldReason] = useState<HoldReason>('customer_approval')
 const [holdNotes, setHoldNotes] = useState<string>('')
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [errorMessage, setErrorMessage] = useState<string | null>(null)

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!task) return

 setErrorMessage(null)
 setIsSubmitting(true)

 try {
 const input: HoldTaskInput = {
 task_id: task.id,
 hold_reason: holdReason,
 hold_notes: holdNotes.trim() || undefined,
      }

 const res = await holdProductionTaskAction(input, undefined, task)
 if (!res.success || !res.data) {
 setErrorMessage(res.error || 'Failed to place task on hold.')
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
 title={tBilingual('Place Task On Hold', 'কাজ সাময়িক স্থগিত করুন')}
 hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Summary */}
        <div className="p-3 bg-warning-surface/60 bg-warning-surface rounded-lg border border-warning-border border-warning-border space-y-1">
          <div className="text-xs font-bold text-warning text-warning flex items-center gap-1.5">
            <AlertOctagon className="h-4 w-4 text-warning"/>
            <span>{task.task_name}</span>
          </div>
          <p className="text-xs text-warning/80 text-warning/80">
 Placing this task on hold will mark it as blocked on the production board and notify the assigned operator.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-danger-surface text-destructive rounded-lg text-xs font-medium flex items-center gap-2 border border-danger-border bg-danger-surface text-destructive border-danger-border">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0"/>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hold Reason Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Blocking Reason', 'স্থগিতাদেশের কারণ')}
          </Label>
          <select
 value={holdReason}
 onChange={(e) => setHoldReason(e.target.value as HoldReason)}
 className="w-full text-xs rounded-md border border-input bg-card px-3 py-2 text-foreground shadow-xs focus:border-warning-border focus:outline-hidden">
            {Object.entries(HOLD_REASON_LABELS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.labelEn} ({item.labelBn})
              </option>
            ))}
          </select>
        </div>

        {/* Additional Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Detailed Blocker Description', 'বিস্তারিত বিবরণ')}
          </Label>
          <Input
 value={holdNotes}
 onChange={(e) => setHoldNotes(e.target.value)}
 placeholder="e.g. Waiting for client color proof approval / Awaiting 3M Vinyl shipment..."className="text-xs"/>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
 type="button"variant="outline"size="sm"onClick={onClose}
 disabled={isSubmitting}
 className="text-xs">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
 type="submit"variant="destructive"size="sm"disabled={isSubmitting}
 className="text-xs bg-warning hover:bg-warning/90 text-white font-semibold">
            {isSubmitting ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Confirm Hold', 'স্থগিত নিশ্চিত করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
