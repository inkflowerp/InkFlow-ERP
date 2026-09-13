'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  MachineryRecord,
  BreakdownSeverity,
  ProductionImpact,
} from '@/types/machinery.types'
import { reportBreakdownAction } from '@/actions/machinery.actions'
import { AlertTriangle, AlertOctagon } from 'lucide-react'

const SEVERITIES: { value: BreakdownSeverity; label: string }[] = [
  { value: 'low', label: 'Low — Minor glitch / reduced speed' },
  { value: 'medium', label: 'Medium — Single function / color channel failure' },
  { value: 'high', label: 'High — Machine stopped / immediate repair needed' },
  { value: 'critical', label: 'Critical — Major mechanical / electrical breakdown' },
]

const IMPACTS: { value: ProductionImpact; label: string }[] = [
  { value: 'none', label: 'No immediate job impact' },
  { value: 'minor_delay', label: 'Minor delay (< 2 hours)' },
  { value: 'job_stalled', label: 'Active Job Stalled / Requires Re-routing' },
  { value: 'facility_halt', label: 'Major production line bottleneck' },
]

interface ReportBreakdownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine: MachineryRecord | null
  onSuccess?: () => void
}

export function ReportBreakdownModal({
  open,
  onOpenChange,
  machine,
  onSuccess,
}: ReportBreakdownModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [problemTitle, setProblemTitle] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [severity, setSeverity] = useState<BreakdownSeverity>('high')
  const [productionImpact, setProductionImpact] = useState<ProductionImpact>('job_stalled')
  const [affectedJobOrder, setAffectedJobOrder] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machine) return

    setError(null)
    setLoading(true)

    try {
      if (!problemTitle.trim()) {
        throw new Error('Please enter a problem summary / headline.')
      }
      if (!problemDescription.trim()) {
        throw new Error('Please describe the breakdown in detail.')
      }

      const res = await reportBreakdownAction({
        machine_id: machine.id,
        problem_title: problemTitle.trim(),
        problem_description: problemDescription.trim(),
        severity,
        production_impact: productionImpact,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to report breakdown.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred while reporting breakdown.')
    } finally {
      setLoading(false)
    }
  }

  if (!machine) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`🚨 Report Machine Breakdown — ${machine.name}`}
      description={`Report an operational failure for ${machine.name} (${machine.code}). Status will immediately transition to Breakdown.`}
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

        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-900 dark:text-red-300">
          ⚠️ <strong>Immediate Floor Notice:</strong> Reporting a breakdown will immediately update the machine status to <strong>Breakdown</strong>, dispatch alerts to the Production Coordinator & Manager, and prevent new job allocations until resolved.
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rbTitle" required>Problem Headline</Label>
          <Input
            id="rbTitle"
            placeholder="e.g. Head Carriage Motor Error 038, Main Belt Snapped, UV Lamp Malfunction"
            value={problemTitle}
            onChange={(e) => setProblemTitle(e.target.value)}
            required
            className="font-semibold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rbSev" required>Severity Level</Label>
            <select
              id="rbSev"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BreakdownSeverity)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rbImp" required>Production Impact</Label>
            <select
              id="rbImp"
              value={productionImpact}
              onChange={(e) => setProductionImpact(e.target.value as ProductionImpact)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              {IMPACTS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rbDesc" required>Detailed Problem Description & Symptoms</Label>
          <textarea
            id="rbDesc"
            rows={3}
            placeholder="Describe what happened: error code displayed on screen, unusual noise, smell, print banding, or mechanical jam..."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            required
            className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rbJob">Affected Job Order / Ticket # (If active job was running)</Label>
          <Input
            id="rbJob"
            placeholder="e.g. JOB-1048 (500 pcs Star Flex)"
            value={affectedJobOrder}
            onChange={(e) => setAffectedJobOrder(e.target.value)}
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
            className="w-full sm:w-auto min-h-[40px] bg-red-600 hover:bg-red-700 text-white font-bold inline-flex items-center gap-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Submit Breakdown Report</span>
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
