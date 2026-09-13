'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MachineryRecord, MaintenanceType } from '@/types/machinery.types'
import { scheduleMaintenanceAction } from '@/actions/machinery.actions'
import { AlertCircle } from 'lucide-react'

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'preventive', label: 'Preventive Routine Maintenance (রুটিন সার্ভিসিং)' },
  { value: 'cleaning', label: 'Head Cleaning & Wiper Maintenance (হেড ও নোজল ওয়াশ)' },
  { value: 'calibration', label: 'Color Calibration & Alignment (কালার ও হেড অ্যালাইনমেন্ট)' },
  { value: 'inspection', label: 'Scheduled Technical Inspection (কারিগরি পরীক্ষা)' },
  { value: 'corrective', label: 'Corrective Part Replacement (যন্ত্রাংশ পরিবর্তন)' },
  { value: 'emergency', label: 'Emergency Servicing (জরুরী মেরামত)' },
  { value: 'other', label: 'Other Servicing (অন্যান্য)' },
]

interface ScheduleMaintenanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine: MachineryRecord | null
  onSuccess?: () => void
}

export function ScheduleMaintenanceModal({
  open,
  onOpenChange,
  machine,
  onSuccess,
}: ScheduleMaintenanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('preventive')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [problemDescription, setProblemDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('0')
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!machine) return

    setError(null)
    setLoading(true)

    try {
      if (!scheduledDate) throw new Error('Scheduled date is required.')

      const res = await scheduleMaintenanceAction({
        machine_id: machine.id,
        maintenance_type: maintenanceType,
        scheduled_date: scheduledDate,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null,
        technician_name: technicianName.trim() || null,
        vendor_name: vendorName.trim() || null,
        problem_description: problemDescription.trim() || null,
        cost: Number(estimatedCost) || 0,
        next_maintenance_date: nextMaintenanceDate || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to schedule maintenance.')
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'An error occurred while scheduling maintenance.')
    } finally {
      setLoading(false)
    }
  }

  if (!machine) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Schedule Maintenance — ${machine.name}`}
      description={`Plan preventive or scheduled servicing for ${machine.name} (${machine.code}).`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="maintType" required>Maintenance Type</Label>
            <select
              id="maintType"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maintDate" required>Scheduled Date</Label>
            <Input
              id="maintDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="maintStart">Window Start Time (Optional)</Label>
            <Input
              id="maintStart"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maintEnd">Window End Time (Optional)</Label>
            <Input
              id="maintEnd"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="maintTech">Assigned Technician</Label>
            <Input
              id="maintTech"
              placeholder="e.g. Master Tech Jahangir, Flora Service Engineer"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maintVendor">Service Vendor / Agency</Label>
            <Input
              id="maintVendor"
              placeholder="e.g. ACI Care, DigiPrint Technical BD"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maintProb">Service Objective / Problem Statement</Label>
          <Input
            id="maintProb"
            placeholder="e.g. 500-hour head flush, encoder strip cleaning, belt tensioning"
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="maintCost">Estimated Cost (৳ BDT)</Label>
            <Input
              id="maintCost"
              type="number"
              step="100"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maintNext">Follow-up / Next Maintenance Date</Label>
            <Input
              id="maintNext"
              type="date"
              value={nextMaintenanceDate}
              onChange={(e) => setNextMaintenanceDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maintNotes">Additional Notes</Label>
          <Input
            id="maintNotes"
            placeholder="Special instructions or parts ordered"
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
            Schedule Service
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
