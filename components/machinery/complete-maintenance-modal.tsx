'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MachineryMaintenanceRecord } from '@/types/machinery.types'
import { completeMaintenanceAction } from '@/actions/machinery.actions'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface CompleteMaintenanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maintenance: MachineryMaintenanceRecord | null
  machineId: string
  onSuccess?: () => void
}

export function CompleteMaintenanceModal({
  open,
  onOpenChange,
  maintenance,
  machineId,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [workPerformed, setWorkPerformed] = useState('')
  const [partsUsed, setPartsUsed] = useState('')
  const [cost, setCost] = useState(maintenance?.cost ? maintenance.cost.toString() : '0')
  const [technicianName, setTechnicianName] = useState(maintenance?.technician_name || '')
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintenance) return

    setError(null)
    setLoading(true)

    try {
      if (!workPerformed.trim()) {
        throw new Error('Please describe the work performed during servicing.')
      }

      const res = await completeMaintenanceAction(
        maintenance.id,
        machineId,
        {
          work_performed: workPerformed.trim(),
          parts_used: partsUsed.trim() || null,
          cost: Number(cost) || 0,
          technician_name: technicianName.trim() || null,
          next_maintenance_date: nextMaintenanceDate || null,
          notes: notes.trim() || null,
        }
      )

      if (!res.success) {
        throw new Error(res.error || 'Failed to complete maintenance.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred while completing maintenance.')
    } finally {
      setLoading(false)
    }
  }

  if (!maintenance) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Complete Maintenance Record"
      description="Document technical work performed, parts replaced, actual costs, and return machine to Available."
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

        <div className="space-y-1.5">
          <Label htmlFor="cmWork" required>Work Performed Summary</Label>
          <textarea
            id="cmWork"
            rows={3}
            placeholder="e.g. Cleared nozzle clog on Head 2 & 4 with flush solution; replaced pump capping assembly; aligned bi-directional pass."
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            required
            className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cmParts">Parts Replaced / Materials Consumed</Label>
          <Input
            id="cmParts"
            placeholder="e.g. 1x Capping Top, 2x Damper, 500ml Flushing Solvent"
            value={partsUsed}
            onChange={(e) => setPartsUsed(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cmCost">Actual Maintenance Cost (৳ BDT)</Label>
            <Input
              id="cmCost"
              type="number"
              step="100"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmTech">Lead Technician / Engineer</Label>
            <Input
              id="cmTech"
              placeholder="e.g. Engr. Saiful Islam"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cmNext">Next Scheduled Maintenance Date</Label>
            <Input
              id="cmNext"
              type="date"
              value={nextMaintenanceDate}
              onChange={(e) => setNextMaintenanceDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmNotes">Follow-up Notes / Advice</Label>
            <Input
              id="cmNotes"
              placeholder="e.g. Keep room temperature between 22-26°C"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
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
            <span>Mark Maintenance Complete</span>
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
