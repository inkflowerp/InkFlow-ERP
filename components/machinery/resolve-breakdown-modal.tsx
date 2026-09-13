'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MachineryBreakdownRecord, MachineryStatus } from '@/types/machinery.types'
import { resolveBreakdownAction } from '@/actions/machinery.actions'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface ResolveBreakdownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  breakdown: MachineryBreakdownRecord | null
  machineId: string
  onSuccess?: () => void
}

export function ResolveBreakdownModal({
  open,
  onOpenChange,
  breakdown,
  machineId,
  onSuccess,
}: ResolveBreakdownModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [diagnosis, setDiagnosis] = useState('')
  const [repairAction, setRepairAction] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [partsReplaced, setPartsReplaced] = useState('')
  const [repairCost, setRepairCost] = useState('0')
  const [downtimeMinutes, setDowntimeMinutes] = useState<string>(() => {
    if (breakdown?.reported_at) {
      const diff = Math.max(0, Math.round((Date.now() - new Date(breakdown.reported_at).getTime()) / (60 * 1000)))
      return diff.toString()
    }
    return '60'
  })
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [targetStatus, setTargetStatus] = useState<MachineryStatus>('available')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!breakdown) return

    setError(null)
    setLoading(true)

    try {
      if (!diagnosis.trim()) {
        throw new Error('Please enter the technical root cause / diagnosis.')
      }
      if (!repairAction.trim()) {
        throw new Error('Please describe the repair action taken.')
      }

      const res = await resolveBreakdownAction(
        breakdown.id,
        machineId,
        {
          diagnosis: diagnosis.trim(),
          repair_action: repairAction.trim(),
          technician_name: technicianName.trim() || null,
          parts_replaced: partsReplaced.trim() || null,
          repair_cost: Number(repairCost) || 0,
          downtime_minutes: Number(downtimeMinutes) || 0,
          resolution_notes: resolutionNotes.trim() || null,
          targetStatus,
        }
      )

      if (!res.success) {
        throw new Error(res.error || 'Failed to resolve breakdown.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred while resolving breakdown.')
    } finally {
      setLoading(false)
    }
  }

  if (!breakdown) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resolve Machine Breakdown"
      description={`Record repair action, root-cause diagnosis, parts used, downtime duration, and restore machine to service.`}
      size="2xl"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
          <p className="font-bold">Original Problem: {breakdown.problem_title}</p>
          <p className="opacity-90">{breakdown.problem_description}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rvDiag" required>Technical Root Cause Diagnosis</Label>
          <textarea
            id="rvDiag"
            rows={2}
            placeholder="e.g. Raster encoder strip contaminated with ink mist; main carriage pulley bearing worn out."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            required
            className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rvAct" required>Repair Action Taken</Label>
          <textarea
            id="rvAct"
            rows={2}
            placeholder="e.g. Replaced encoder strip with new original part; lubricated carriage guide rails and reset optical sensor."
            value={repairAction}
            onChange={(e) => setRepairAction(e.target.value)}
            required
            className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rvTech">Technician / Engineer</Label>
            <Input
              id="rvTech"
              placeholder="e.g. Rafiqul Islam (Senior Tech)"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rvParts">Parts Replaced</Label>
            <Input
              id="rvParts"
              placeholder="e.g. 1x Optical Encoder Strip, 1x Carriage Bush"
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rvCost">Repair Cost (৳ BDT)</Label>
            <Input
              id="rvCost"
              type="number"
              step="100"
              value={repairCost}
              onChange={(e) => setRepairCost(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rvDown" required>Downtime (Minutes)</Label>
            <Input
              id="rvDown"
              type="number"
              step="1"
              value={downtimeMinutes}
              onChange={(e) => setDowntimeMinutes(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rvStatus">Restore Machine To</Label>
            <select
              id="rvStatus"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as MachineryStatus)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="available">Available (Floor Ready)</option>
              <option value="maintenance">Maintenance (Further Calibration)</option>
              <option value="offline">Offline (Awaiting Observation)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rvNotes">Resolution Notes / Operator Advice</Label>
          <Input
            id="rvNotes"
            placeholder="e.g. Test print executed: 100% nozzle pass verified."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
          />
        </div>

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
            isLoading={loading}
            className="w-full sm:w-auto min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mark Breakdown Resolved</span>
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
