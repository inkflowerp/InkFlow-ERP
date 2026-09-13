'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MachineryRecord, MachineryStatus } from '@/types/machinery.types'
import { changeMachineryStatusAction } from '@/actions/machinery.actions'
import { AlertCircle } from 'lucide-react'

const STATUSES: { value: MachineryStatus; label: string }[] = [
  { value: 'available', label: 'Available (উন্মুক্ত ও প্রস্তুত)' },
  { value: 'in_use', label: 'In Use (প্রোডাকশন চলছে)' },
  { value: 'scheduled', label: 'Scheduled (শিডিউল্ড)' },
  { value: 'maintenance', label: 'Maintenance (রক্ষণাবেক্ষণ)' },
  { value: 'breakdown', label: 'Breakdown (নষ্ট / ত্রুটিপূর্ণ)' },
  { value: 'offline', label: 'Offline (বন্ধ)' },
  { value: 'retired', label: 'Retired / Archived (অবসরপ্রাপ্ত)' },
]

interface StatusChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine: MachineryRecord | null
  onSuccess?: () => void
}

export function StatusChangeModal({
  open,
  onOpenChange,
  machine,
  onSuccess,
}: StatusChangeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<MachineryStatus>(machine?.status || 'available')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machine) return

    setError(null)
    setLoading(true)

    try {
      const res = await changeMachineryStatusAction(machine.id, newStatus, notes.trim() || null)
      if (!res.success) {
        throw new Error(res.error || 'Failed to update machine status.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (!machine) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Change Status — ${machine.name}`}
      description={`Update operating state for ${machine.name} (${machine.code}). Current status: ${machine.status.toUpperCase()}`}
      size="md"
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
          <Label htmlFor="stSelect" required>Target Machine Status</Label>
          <select
            id="stSelect"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as MachineryStatus)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stNotes">Reason / Floor Notes</Label>
          <Input
            id="stNotes"
            placeholder="e.g. End of shift power down, ink changeover complete"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Update Status
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
