'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Cpu,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Wrench,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ProductionTaskRecord,
  ScheduleTaskInput,
} from '@/types/production.types'
import { MachineryRecord } from '@/types/machinery.types'
import { getMachineriesAction } from '@/actions/machinery.actions'
import { scheduleProductionTaskAction } from '@/actions/production-planning.actions'

interface ScheduleTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: ProductionTaskRecord | null
  onSuccess?: (updatedTask: ProductionTaskRecord) => void
}

export function ScheduleTaskModal({
  isOpen,
  onClose,
  task,
  onSuccess,
}: ScheduleTaskModalProps) {
  const { tBilingual } = useI18n()

  const [machineries, setMachineries] = useState<MachineryRecord[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  const [scheduledStart, setScheduledStart] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [notes, setNotes] = useState<string>('')

  const [loadingMachines, setLoadingMachines] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize form when modal opens with task
  useEffect(() => {
    if (isOpen && task) {
      setSelectedMachineId(task.assigned_machine_id || '')
      setDurationMinutes(task.estimated_duration_minutes || 60)
      setNotes(task.notes || '')
      setErrorMessage(null)

      if (task.scheduled_start) {
        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const d = new Date(task.scheduled_start)
        const formatted = d.toISOString().slice(0, 16)
        setScheduledStart(formatted)
      } else {
        // Default to current time rounded up to next 15 min
        const now = new Date()
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
        setScheduledStart(now.toISOString().slice(0, 16))
      }

      loadMachineries()
    }
  }, [isOpen, task])

  const loadMachineries = async () => {
    setLoadingMachines(true)
    try {
      const res = await getMachineriesAction({ status: 'all' })
      if (res.success && res.data) {
        setMachineries(res.data)
      }
    } catch (_) {
    } finally {
      setLoadingMachines(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const input: ScheduleTaskInput = {
        task_id: task.id,
        assigned_machine_id: selectedMachineId || null,
        scheduled_start: new Date(scheduledStart).toISOString(),
        estimated_duration_minutes: durationMinutes,
        notes: notes.trim() || undefined,
      }

      const res = await scheduleProductionTaskAction(input)
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to schedule task.')
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

  const selectedMachine = machineries.find((m) => m.id === selectedMachineId)
  const isMachineUnavailable =
    selectedMachine &&
    (selectedMachine.status === 'breakdown' ||
      selectedMachine.status === 'maintenance' ||
      selectedMachine.status === 'retired')

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Schedule Production Task', 'প্রোডাকশন টাস্ক শিডিউলিং')}
      hideFooter={true}
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Task Summary Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {task.task_name}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              {task.task_number}
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-3">
            <span>Job #{task.job_number || 'N/A'}</span>
            <span>•</span>
            <span>Qty: {task.quantity} {task.unit}</span>
            <span>•</span>
            <span className="capitalize">{task.department}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-medium flex items-start gap-2 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Machine Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              {tBilingual('Target Machinery', 'বরাদ্দকৃত মেশিন')}
            </Label>
            {machineries.length === 0 && !loadingMachines && (
              <span className="text-[11px] text-amber-600 font-medium">
                (0 Machines - Manual Mode)
              </span>
            )}
          </div>

          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            disabled={loadingMachines}
            className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">-- No Machine Required (Manual / Hand Work) --</option>
            {machineries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code}) - {m.machine_type.replace('_', ' ')} [{m.status.toUpperCase()}]
              </option>
            ))}
          </select>

          {/* Machine Warning Banner if broken or maintenance */}
          {isMachineUnavailable && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                Warning: {selectedMachine?.name} is currently {selectedMachine?.status}. Scheduling may be blocked.
              </span>
            </div>
          )}
        </div>

        {/* Schedule Time & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-600" />
              {tBilingual('Start Date & Time', 'শুরুর সময়')}
            </Label>
            <Input
              type="datetime-local"
              required
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-600" />
              {tBilingual('Estimated Duration', 'আনুমানিক সময় (মিনিট)')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                step={5}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="text-xs"
              />
              <span className="text-xs text-slate-500 shrink-0">
                ({(durationMinutes / 60).toFixed(1)} hrs)
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {tBilingual('Planning Notes (Optional)', 'পরিকল্পনা মন্তব্য (ঐচ্ছিক)')}
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions for operator..."
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
            variant="default"
            size="sm"
            disabled={isSubmitting}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {isSubmitting ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Confirm Schedule', 'শিডিউল নিশ্চিত করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
