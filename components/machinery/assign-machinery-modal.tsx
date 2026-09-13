'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MachineryRecord, ConflictCheckResult } from '@/types/machinery.types'
import {
  assignMachineryAction,
  checkMachineryConflictAction,
} from '@/actions/machinery.actions'
import { MachineryStatusBadge } from './machinery-status-badge'
import { AlertTriangle, CheckCircle2, Clock, AlertOctagon } from 'lucide-react'

interface AssignMachineryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine: MachineryRecord | null
  onSuccess?: () => void
}

export function AssignMachineryModal({
  open,
  onOpenChange,
  machine,
  onSuccess,
}: AssignMachineryModalProps) {
  const [loading, setLoading] = useState(false)
  const [checkingConflict, setCheckingConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictCheckResult | null>(null)

  // Form State
  const [jobNumber, setJobNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize schedule window (default: now to +2 hours)
  useEffect(() => {
    if (open && machine) {
      const now = new Date()
      const startIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      const endIso = new Date(now.getTime() + 2 * 60 * 60000 - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)

      setScheduledStart(startIso)
      setScheduledEnd(endIso)
      setJobNumber('')
      setCustomerName('')
      setOperatorName(machine.default_operator_requirement || 'Nurul Amin (Print Operator)')
      setNotes('')
      setError(null)
      setConflict(null)
    }
  }, [open, machine])

  // Trigger conflict check when start/end changes
  useEffect(() => {
    let active = true

    async function runCheck() {
      if (!machine?.id || !scheduledStart || !scheduledEnd) return
      const s = new Date(scheduledStart).toISOString()
      const e = new Date(scheduledEnd).toISOString()

      setCheckingConflict(true)
      try {
        const res = await checkMachineryConflictAction(machine.id, s, e)
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
  }, [machine?.id, scheduledStart, scheduledEnd])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machine) return

    setError(null)
    setLoading(true)

    try {
      if (!scheduledStart || !scheduledEnd) {
        throw new Error('Please specify both scheduled start and end times.')
      }

      if (conflict?.hasConflict) {
        throw new Error(conflict.reason || 'Assignment conflict detected. Please adjust time window.')
      }

      const res = await assignMachineryAction({
        machine_id: machine.id,
        operator_name: operatorName.trim() || 'Assigned Operator',
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        notes: `Job #${jobNumber || 'Direct'} (${customerName || 'Walk-in'}): ${notes || 'Machine Allocation'}`,
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

  if (!machine) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Assign Machine — ${machine.name}`}
      description={`Allocate ${machine.name} (${machine.code}) to a production job order with conflict prevention.`}
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

        {/* Machine Status Bar */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{machine.name}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">{machine.code}</span>
          </div>
          <MachineryStatusBadge status={machine.status} />
        </div>

        {/* Conflict Alert Banner */}
        {conflict?.hasConflict ? (
          <Alert variant="destructive" className="py-2.5 border-red-300 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-300">
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
        ) : scheduledStart && scheduledEnd && !checkingConflict ? (
          <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Schedule Slot is Open & Available for Allocation.</span>
          </div>
        ) : null}

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

        <div className="space-y-1.5">
          <Label htmlFor="asOp" required>Designated Machine Operator</Label>
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
            <Label htmlFor="asStart" required>Scheduled Start Time</Label>
            <Input
              id="asStart"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asEnd" required>Expected Completion Time</Label>
            <Input
              id="asEnd"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              required
            />
          </div>
        </div>

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
            disabled={Boolean(conflict?.hasConflict) || loading}
            isLoading={loading}
            className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Confirm Machine Assignment
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
