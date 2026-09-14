'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Scissors, Sparkles } from 'lucide-react'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { ProductionTaskRecord } from '@/types/production.types'
import { logProductionConsumptionAction } from '@/actions/inventory.actions'

interface LogConsumptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  tasks?: ProductionTaskRecord[]
  selectedTaskId?: string
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export function LogConsumptionModal({
  open,
  onOpenChange,
  materials,
  locations,
  tasks = [],
  selectedTaskId,
  selectedMaterialId,
  onSuccess,
  companyId,
}: LogConsumptionModalProps) {
  const [taskId, setTaskId] = useState(selectedTaskId || (tasks[0]?.id || ''))
  const [materialId, setMaterialId] = useState(selectedMaterialId || (materials[0]?.id || ''))
  const [consumedQty, setConsumedQty] = useState<number>(1)
  const [returnedQty, setReturnedQty] = useState<number>(0)
  const [returnLocationId, setReturnLocationId] = useState(locations[0]?.id || '')
  const [wastageQty, setWastageQty] = useState<number>(0)
  const [wastageReason, setWastageReason] = useState('')

  // Discrete Remnants List
  const [remnants, setRemnants] = useState<
    Array<{
      width: number
      length: number
      dimension_unit: string
      location_id: string
      condition: 'excellent' | 'usable' | 'minor_defect'
      notes: string
    }>
  >([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMat = materials.find((m) => m.id === materialId)

  const handleAddRemnant = () => {
    const remLocation = locations.find((l) => l.location_type === 'remnant_rack') || locations[0]
    setRemnants([
      ...remnants,
      {
        width: 10,
        length: 5,
        dimension_unit: 'ft',
        location_id: remLocation?.id || '',
        condition: 'usable',
        notes: '',
      },
    ])
  }

  const handleRemoveRemnant = (idx: number) => {
    setRemnants(remnants.filter((_, i) => i !== idx))
  }

  const handleRemnantChange = (idx: number, field: string, val: any) => {
    const updated = [...remnants]
    updated[idx] = { ...updated[idx], [field]: val }
    setRemnants(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskId) {
      setError('Please select a production task.')
      return
    }
    if (!materialId) {
      setError('Please select a material.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await logProductionConsumptionAction(
        {
          production_task_id: taskId,
          material_id: materialId,
          consumed_quantity: Number(consumedQty) || 0,
          unit: activeMat?.unit || 'pcs',
          returned_quantity: Number(returnedQty) || 0,
          return_location_id: returnedQty > 0 ? returnLocationId : null,
          wastage_quantity: Number(wastageQty) || 0,
          wastage_reason: wastageQty > 0 ? wastageReason.trim() : null,
          remnants: remnants.map((r) => ({
            width: Number(r.width),
            length: Number(r.length),
            dimension_unit: r.dimension_unit,
            quantity: 1,
            location_id: r.location_id,
            condition: r.condition,
            notes: r.notes.trim() || null,
          })),
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to log production consumption.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setRemnants([])
      setWastageQty(0)
      setReturnedQty(0)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Production Consumption & Scrap Sign-Off"
      description="Record actual substrate used, return unused stock, log scrap reasons, and register reusable remnants."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cTask" required>
              Production Task
            </Label>
            <select
              id="cTask"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              <option value="">-- Choose Task --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.task_number || t.id.slice(0, 8)} - {t.task_name || 'Task'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cMat" required>
              Material Substrate
            </Label>
            <select
              id="cMat"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              <option value="">-- Choose Material --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.sku} - {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Consumption & Return Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs">
          <div className="space-y-1">
            <Label required>Actual Consumed ({activeMat?.unit || 'unit'})</Label>
            <Input
              type="number"
              step="0.1"
              value={consumedQty}
              onChange={(e) => setConsumedQty(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1">
            <Label>Return Unused ({activeMat?.unit || 'unit'})</Label>
            <Input
              type="number"
              step="0.1"
              value={returnedQty}
              onChange={(e) => setReturnedQty(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label>Scrap / Wastage ({activeMat?.unit || 'unit'})</Label>
            <Input
              type="number"
              step="0.1"
              value={wastageQty}
              onChange={(e) => setWastageQty(Number(e.target.value))}
            />
          </div>
        </div>

        {returnedQty > 0 && (
          <div className="space-y-1.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs">
            <Label required className="text-emerald-900 dark:text-emerald-200">
              Return Store Location
            </Label>
            <select
              value={returnLocationId}
              onChange={(e) => setReturnLocationId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code})
                </option>
              ))}
            </select>
          </div>
        )}

        {wastageQty > 0 && (
          <div className="space-y-1.5 p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 text-xs">
            <Label required className="text-red-900 dark:text-red-200">
              Wastage Root Cause Reason
            </Label>
            <select
              value={wastageReason}
              onChange={(e) => setWastageReason(e.target.value)}
              className="w-full h-9 px-2 rounded border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-xs font-semibold mb-1"
              required
            >
              <option value="">-- Select Root Cause --</option>
              <option value="Cutting & Border Loss">Cutting & Margin Loss</option>
              <option value="Print Head Banding / Error">Print Head Banding / Machine Error</option>
              <option value="Color Calibration Test Strips">Color Calibration Strips</option>
              <option value="Substrate Wrinkle / Feed Error">Substrate Wrinkle / Feed Jam</option>
              <option value="Artwork / Layout Discrepancy">Artwork / Layout Discrepancy</option>
              <option value="Lamination Bubble / Damage">Lamination Bubble / Crease</option>
              <option value="Installation Handling Loss">Installation Handling Damage</option>
            </select>
            <Input
              placeholder="Additional details / machine notes..."
              value={wastageReason}
              onChange={(e) => setWastageReason(e.target.value)}
            />
          </div>
        )}

        {/* Reusable Remnants Section */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-purple-600" />
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Discrete Reusable Remnants ({remnants.length})
              </span>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddRemnant} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Remnant
            </Button>
          </div>

          {remnants.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              No usable offcuts. Click &quot;Add Remnant&quot; to catalog usable roll/sheet leftovers for future small jobs.
            </p>
          ) : (
            <div className="space-y-2">
              {remnants.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-300">
                      Remnant #{idx + 1} ({r.width} × {r.length} {r.dimension_unit} ={' '}
                      <strong>{r.width * r.length} SFT</strong>)
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveRemnant(idx)}
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <Label>Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.width}
                        onChange={(e) => handleRemnantChange(idx, 'width', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label>Length</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.length}
                        onChange={(e) => handleRemnantChange(idx, 'length', Number(e.target.value))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label>Location Rack</Label>
                      <select
                        value={r.location_id}
                        onChange={(e) => handleRemnantChange(idx, 'location_id', e.target.value)}
                        className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.location_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <select
                        value={r.condition}
                        onChange={(e) => handleRemnantChange(idx, 'condition', e.target.value)}
                        className="w-full h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="usable">Usable</option>
                        <option value="minor_defect">Minor Defect</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {loading ? 'Submitting...' : 'Sign-Off Consumption & Remnants'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
