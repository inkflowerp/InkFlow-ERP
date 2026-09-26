'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MachineryRecord,
  ConflictCheckResult,
  EligibleMachineSummary,
  EligibleMachineItem,
} from '@/types/machinery.types'
import {
  assignMachineryAction,
  checkMachineryConflictAction,
  getEligibleMachineriesAction,
} from '@/actions/machinery.actions'
import { MachineryStatusBadge } from './machinery-status-badge'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Sparkles,
  Cpu,
  Layers,
  Info,
} from 'lucide-react'

export interface JobOrderAssignmentContext {
  id?: string
  jobNumber?: string
  customerName?: string
  taskType?: string
  taskName?: string
  department?: string
  branchId?: string
  material?: string
  width?: number
  height?: number
}

interface AssignMachineryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine?: MachineryRecord | null
  jobOrderContext?: JobOrderAssignmentContext | null
  onSuccess?: () => void
}

const PRODUCTION_TASK_OPTIONS = [
  { value: 'printing', label: 'Printing (Digital / Offset / Flatbed / Eco-Solvent)' },
  { value: 'lamination', label: 'Lamination (Thermal / Cold Roll)' },
  { value: 'cutting', label: 'Cutting / Plotter / Laser / CNC' },
  { value: 'fabrication', label: 'Fabrication / Acrylic / Metal / Welding' },
  { value: 'finishing', label: 'Finishing / Eyeleting / Hemming / Binding' },
  { value: 'installation', label: 'Installation / Fitting (No Machine Required)' },
  { value: 'manual_production', label: 'Manual Handwork (No Machine Required)' },
  { value: 'other', label: 'Other Custom Task' },
]

export function AssignMachineryModal({
  open,
  onOpenChange,
  machine: initialMachine,
  jobOrderContext,
  onSuccess,
}: AssignMachineryModalProps) {
  const [loading, setLoading] = useState(false)
  const [checkingConflict, setCheckingConflict] = useState(false)
  const [loadingEligibility, setLoadingEligibility] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictCheckResult | null>(null)

  // Selected Machine & Eligibility State
  const [selectedMachine, setSelectedMachine] = useState<MachineryRecord | null>(initialMachine || null)
  const [eligibilitySummary, setEligibilitySummary] = useState<EligibleMachineSummary | null>(null)

  // Task & Job Form State
  const [taskType, setTaskType] = useState<string>(jobOrderContext?.taskType || 'printing')
  const [taskName, setTaskName] = useState<string>(jobOrderContext?.taskName || '')
  const [jobNumber, setJobNumber] = useState(jobOrderContext?.jobNumber || '')
  const [customerName, setCustomerName] = useState(jobOrderContext?.customerName || '')
  const [operatorName, setOperatorName] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [notes, setNotes] = useState('')

  const isNoMachineTask = taskType === 'installation' || taskType === 'manual_production'

  // Initialize schedule window and reset form on modal open
  useEffect(() => {
    if (open) {
      const now = new Date()
      const startIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      const endIso = new Date(now.getTime() + 2 * 60 * 60000 - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setScheduledStart(startIso)
      setScheduledEnd(endIso)
      setJobNumber(jobOrderContext?.jobNumber || '')
      setCustomerName(jobOrderContext?.customerName || '')
      setTaskType(jobOrderContext?.taskType || 'printing')
      setTaskName(jobOrderContext?.taskName || '')
      setSelectedMachine(initialMachine || null)
      setOperatorName(
        initialMachine?.default_operator_requirement || 'Nurul Amin (Print Operator)'
      )
      setNotes('')
      setError(null)
      setConflict(null)
    }
  }, [open, initialMachine, jobOrderContext])

  // Load eligible machines whenever task type, dimensions or context changes (if no fixed initial machine)
  const fetchEligibility = useCallback(async () => {
    if (!open || isNoMachineTask) return

    setLoadingEligibility(true)
    try {
      const res = await getEligibleMachineriesAction({
        task_type: taskType,
        department: jobOrderContext?.department || null,
        branch_id: jobOrderContext?.branchId || null,
        material: jobOrderContext?.material || null,
        width: jobOrderContext?.width || null,
        height: jobOrderContext?.height || null,
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      })

      if (res.success && res.data) {
        setEligibilitySummary(res.data)

        // Single-Machine Smart UX: auto-select if exactly 1 available eligible machine and none selected yet
        if (!initialMachine) {
          if (res.data.smartPreselection) {
            setSelectedMachine(res.data.smartPreselection)
            if (res.data.smartPreselection.default_operator_requirement) {
              setOperatorName(res.data.smartPreselection.default_operator_requirement)
            }
          } else if (res.data.eligibleCount === 0 || !res.data.machines.some((m) => m.isAvailable)) {
            setSelectedMachine(null)
          }
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingEligibility(false)
    }
  }, [open, isNoMachineTask, taskType, jobOrderContext, scheduledStart, scheduledEnd, initialMachine])

  useEffect(() => {
    fetchEligibility()
  }, [fetchEligibility])

  // Trigger conflict check when selected machine or start/end changes
  useEffect(() => {
    let active = true

    async function runCheck() {
      if (!selectedMachine?.id || !scheduledStart || !scheduledEnd || isNoMachineTask) {
        setConflict(null)
        return
      }

      const s = new Date(scheduledStart).toISOString()
      const e = new Date(scheduledEnd).toISOString()

      setCheckingConflict(true)
      try {
        const res = await checkMachineryConflictAction(selectedMachine.id, s, e)
        if (active && res.success && res.data) {
          setConflict(res.data)
        }
      } catch {
        // Non-blocking
      } finally {
        if (active) setCheckingConflict(false)
      }
    }

    const timer = setTimeout(runCheck, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [selectedMachine?.id, scheduledStart, scheduledEnd, isNoMachineTask])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isNoMachineTask) {
        // Manual / outsourced workflow does not require machine allocation
        onOpenChange(false)
        if (onSuccess) onSuccess()
        return
      }

      if (!selectedMachine) {
        throw new Error('Please select an eligible machine for this production task.')
      }

      if (!scheduledStart || !scheduledEnd) {
        throw new Error('Please specify both scheduled start and end times.')
      }

      if (conflict?.hasConflict) {
        throw new Error(
          conflict.reason || 'Assignment conflict detected. Please adjust time window.'
        )
      }

      const res = await assignMachineryAction({
        machine_id: selectedMachine.id,
        job_order_id: jobOrderContext?.id || null,
        task_type: taskType,
        task_name: taskName || taskType,
        branch_id: selectedMachine.branch_id || jobOrderContext?.branchId || null,
        operator_name: operatorName.trim() || 'Assigned Operator',
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        notes: `Job #${jobNumber || 'Direct'} (${customerName || 'Walk-in'}) [Task: ${taskType}]: ${
          notes || 'Machine Allocation'
        }`,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to allocate machine.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred during assignment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        initialMachine
          ? `Assign Machine — ${initialMachine.name}`
          : `Assign Production Task Machine`
      }
      description={`Allocate machinery to Job #${
        jobNumber || jobOrderContext?.jobNumber || 'General'
      } with smart conflict prevention.`}
      size="2xl"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertOctagon className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Task Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="asTaskType" required>
            Production Task Stage
          </Label>
          <select
            id="asTaskType"
            value={taskType}
            onChange={(e) => {
              setTaskType(e.target.value)
              if (e.target.value === 'installation' || e.target.value === 'manual_production') {
                setSelectedMachine(null)
              }
            }}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
          >
            {PRODUCTION_TASK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Manual / No-Machine Banner */}
        {isNoMachineTask ? (
          <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Manual / Outsourced Production Step</p>
              <p className="text-2xs opacity-90">
                This task does not require physical machinery fleet allocation. You can proceed with
                manual team scheduling or outsourced service tracking.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Single-Machine Smart UX Recommendation / Notice */}
            {eligibilitySummary?.singleMachineNotice && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  eligibilitySummary.singleMachineNotice.isAvailable
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                {eligibilitySummary.singleMachineNotice.isAvailable ? (
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {eligibilitySummary.singleMachineNotice.isAvailable
                      ? 'Smart Preselection:'
                      : 'Notice:'}
                  </p>
                  <p className="text-2xs">
                    {eligibilitySummary.singleMachineNotice.message}
                  </p>
                </div>
              </div>
            )}

            {/* Empty Fleet State Check */}
            {eligibilitySummary && eligibilitySummary.totalFleetCount === 0 && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-800 dark:text-slate-200">No registered machinery</p>
                <p className="text-2xs mt-0.5">
                  Your company currently operates with 0 machines registered. Work orders will continue seamlessly as manual fabrication or outsourced workflows.
                </p>
              </div>
            )}

            {/* Machine Selection Dropdown (When multiple machines exist or choosing alternative) */}
            {!initialMachine && eligibilitySummary && eligibilitySummary.machines.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="asMachSelect" required>
                  Select Production Machine ({eligibilitySummary.availableCount} Available of {eligibilitySummary.eligibleCount} Eligible)
                </Label>
                <select
                  id="asMachSelect"
                  value={selectedMachine?.id || ''}
                  onChange={(e) => {
                    const found =
                      eligibilitySummary.machines.find(
                        (m) => m.machine.id === e.target.value
                      )?.machine || null
                    setSelectedMachine(found)
                    if (found?.default_operator_requirement) {
                      setOperatorName(found.default_operator_requirement)
                    }
                  }}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Choose Machine --</option>
                  {eligibilitySummary.machines.map((item: EligibleMachineItem) => (
                    <option
                      key={item.machine.id}
                      value={item.machine.id}
                      disabled={!item.isAvailable}
                    >
                      {item.machine.name} ({item.machine.code}) — {item.machine.status.toUpperCase()}
                      {!item.isAvailable ? ' [Unavailable]' : ''}
                      {!item.isEligible ? ` [Incompatible: ${item.ineligibilityReasons[0]}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected Machine Status Bar */}
            {selectedMachine && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {selectedMachine.name}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {selectedMachine.code}
                  </span>
                </div>
                <MachineryStatusBadge status={selectedMachine.status} />
              </div>
            )}

            {/* Conflict Alert Banner */}
            {conflict?.hasConflict ? (
              <Alert
                variant="destructive"
                className="py-2.5 border-red-300 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300"
              >
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-xs space-y-1">
                  <p className="font-bold">⚠️ Schedule Conflict Detected:</p>
                  <p>{conflict.reason}</p>
                  {conflict.suggestions && conflict.suggestions.length > 0 && (
                    <ul className="list-disc pl-4 text-xs opacity-90">
                      {conflict.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            ) : selectedMachine && scheduledStart && scheduledEnd && !checkingConflict ? (
              <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Schedule Slot is Open & Available for Allocation.</span>
              </div>
            ) : null}
          </>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="asJob">Job Order # / Ticket Number</Label>
            <Input
              id="asJob"
              placeholder="e.g. JOB-1048, ORD-5029"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asCust">Customer / Organization Name</Label>
            <Input
              id="asCust"
              placeholder="e.g. Acme Corp, Grameenphone"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>

        {!isNoMachineTask && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="asOp" required>
                Designated Machine Operator
              </Label>
              <Input
                id="asOp"
                placeholder="e.g. Nurul Amin, Karim Sheikh"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asStart" required>
                  Scheduled Start Time
                </Label>
                <Input
                  id="asStart"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asEnd" required>
                  Expected Completion Time
                </Label>
                <Input
                  id="asEnd"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="asNotes">Production Instructions / Notes</Label>
          <Input
            id="asNotes"
            placeholder="e.g. High pass mode 720x1440dpi, use 440gsm Star flex roll"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px]"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={(!isNoMachineTask && (Boolean(conflict?.hasConflict) || !selectedMachine)) || loading}
            isLoading={loading}
            className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isNoMachineTask ? 'Confirm Manual Task' : 'Confirm Machine Assignment'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
