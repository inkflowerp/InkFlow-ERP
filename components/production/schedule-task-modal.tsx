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
  Sparkles,
  Check,
  ShieldAlert,
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
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

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
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [scheduledStart, setScheduledStart] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [notes, setNotes] = useState<string>('')

  const [loadingMachines, setLoadingMachines] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch registered users / operators from local data store or fallback
  const operators = React.useMemo(() => {
    try {
      const users = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.COMPANY_USERS) || PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || [])
      return users.filter((u) => u.role === 'operator' || u.role === 'worker' || u.role === 'designer' || u.role === 'manager' || !u.role)
    } catch {
      return []
    }
  }, [])

  // Initialize form when modal opens with task
  useEffect(() => {
    if (isOpen && task) {
      setSelectedMachineId(task.assigned_machine_id || '')
      setSelectedOperatorId(task.assigned_operator_id || '')
      setDurationMinutes(task.estimated_duration_minutes || 60)
      setNotes(task.notes || '')
      setErrorMessage(null)

      if (task.scheduled_start) {
        const d = new Date(task.scheduled_start)
        const formatted = d.toISOString().slice(0, 16)
        setScheduledStart(formatted)
      } else {
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

  const selectedMachine = machineries.find((m) => m.id === selectedMachineId)

  // Auto-calculate suggested duration if machine has speed spec
  const handleAutoEstimateDuration = () => {
    if (!task || !selectedMachine) return
    const widthIn = task.width || 0
    const heightIn = task.height || 0
    const areaSqFt = ((widthIn * heightIn) / 144) || 1
    const totalArea = areaSqFt * (task.quantity || 1)
    const speed = selectedMachine.estimated_speed || 80
    const setup = selectedMachine.setup_time_mins || 10
    const calculated = Math.max(10, Math.ceil((totalArea / speed) * 60) + setup)
    setDurationMinutes(calculated)
  }

  // Capability check
  const machineCompatibility = React.useMemo(() => {
    if (!task || !selectedMachine) return null
    const issues: string[] = []
    if (selectedMachine.status === 'breakdown') issues.push('Machine is broken down')
    if (selectedMachine.status === 'maintenance') issues.push('Under maintenance')
    if (task.width && selectedMachine.max_width && task.width > selectedMachine.max_width) {
      issues.push(`Task width (${task.width}) > Max width (${selectedMachine.max_width} ${selectedMachine.dimension_unit || 'in'})`)
    }
    if (task.height && selectedMachine.max_height && task.height > selectedMachine.max_height) {
      issues.push(`Task height (${task.height}) > Max height (${selectedMachine.max_height} ${selectedMachine.dimension_unit || 'in'})`)
    }
    return {
      isCompatible: issues.length === 0,
      issues,
    }
  }, [task, selectedMachine])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const input: ScheduleTaskInput = {
        task_id: task.id,
        assigned_machine_id: selectedMachineId || null,
        assigned_operator_id: selectedOperatorId || null,
        scheduled_start: new Date(scheduledStart).toISOString(),
        estimated_duration_minutes: durationMinutes,
        notes: notes.trim() || undefined,
      }

      const res = await scheduleProductionTaskAction(input, undefined, task)
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
          <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
            <span>Job #{task.job_number || 'N/A'}</span>
            <span>•</span>
            <span>Qty: {task.quantity} {task.unit}</span>
            {task.width && task.height && (
              <>
                <span>•</span>
                <span>Size: {task.width} × {task.height} in</span>
              </>
            )}
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
            {selectedMachine && selectedMachine.estimated_speed && (
              <button
                type="button"
                onClick={handleAutoEstimateDuration}
                className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                {tBilingual('Auto-calc Duration from Speed', 'গতি থেকে সময় হিসাব')}
              </button>
            )}
          </div>

          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            disabled={loadingMachines}
            className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">-- No Machine Required (Manual / Hand Work) --</option>
            {machineries.map((m) => {
              const isCompatible = (!task.width || !m.max_width || task.width <= m.max_width) && m.status !== 'breakdown'
              return (
                <option key={m.id} value={m.id}>
                  {isCompatible ? '✓' : '⚠'} {m.name} ({m.code}) - {m.machine_type.replace('_', ' ')} [{m.status.toUpperCase()}] {m.max_width ? `(Max ${m.max_width} in)` : ''}
                </option>
              )
            })}
          </select>

          {/* Machine Compatibility Banner */}
          {machineCompatibility && (
            <div className={`p-2.5 rounded text-[11px] flex items-start gap-2 border ${
              machineCompatibility.isCompatible
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}>
              {machineCompatibility.isCompatible ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Machine is compatible with task specifications. Speed: {selectedMachine?.estimated_speed || 80} {selectedMachine?.speed_unit || 'sqft/hr'}.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Compatibility Notice:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      {machineCompatibility.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Assigned Operator */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-600" />
            {tBilingual('Assigned Operator / Worker', 'দায়িত্বপ্রাপ্ত অপারেটর')}
          </Label>
          <select
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">-- Unassigned (Available for Any Floor Operator) --</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name || op.full_name || op.email} ({op.role || 'Operator'})
              </option>
            ))}
          </select>
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

