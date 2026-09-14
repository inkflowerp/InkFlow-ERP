'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { adjustStockAction } from '@/actions/inventory.actions'

interface StockAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  selectedMaterial?: MaterialRecord | null
  onSuccess?: () => void
  companyId?: string
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  materials,
  locations,
  selectedMaterial,
  onSuccess,
  companyId,
}: StockAdjustmentModalProps) {
  const [materialId, setMaterialId] = useState(selectedMaterial?.id || (materials[0]?.id || ''))
  const [locationId, setLocationId] = useState(locations[0]?.id || '')
  const [physicalCount, setPhysicalCount] = useState<number>(selectedMaterial?.current_stock || 0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMaterial = materials.find((m) => m.id === (materialId || selectedMaterial?.id))
  const currentSysStock = activeMaterial ? Number(activeMaterial.current_stock) : 0
  const variance = physicalCount - currentSysStock

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      setError('Please select a material.')
      return
    }
    if (!reason || reason.trim().length < 3) {
      setError('A valid audit reason is required for stock adjustment.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await adjustStockAction(
        {
          material_id: materialId,
          location_id: locationId || undefined,
          new_quantity: Number(physicalCount),
          reason: reason.trim(),
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to record stock adjustment.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setReason('')
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
      title="Physical Count Reconciliation / Adjustment"
      description="Reconcile system balance with audited floor physical counts and record variance."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="adjMat" required>
            Select Material
          </Label>
          <select
            id="adjMat"
            value={materialId}
            onChange={(e) => {
              setMaterialId(e.target.value)
              const m = materials.find((x) => x.id === e.target.value)
              if (m) setPhysicalCount(m.current_stock)
            }}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            required
          >
            <option value="">-- Choose Material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.sku} - {m.name} (Current: {m.current_stock} {m.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adjLoc" required>
            Location Store
          </Label>
          <select
            id="adjLoc"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            required
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name} ({loc.location_code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs">
          <div>
            <span className="text-slate-500 block">Current System Stock:</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {currentSysStock} {activeMaterial?.unit || 'units'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Calculated Variance:</span>
            <span
              className={`font-mono font-black text-sm ${
                variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : 'text-slate-500'
              }`}
            >
              {variance > 0 ? `+${variance}` : variance} {activeMaterial?.unit || 'units'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adjCount" required>
            Audited Physical Floor Count ({activeMaterial?.unit || 'units'})
          </Label>
          <Input
            id="adjCount"
            type="number"
            step="0.1"
            value={physicalCount}
            onChange={(e) => setPhysicalCount(Number(e.target.value))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adjReason" required>
            Reconciliation Reason / Root Cause
          </Label>
          <Input
            id="adjReason"
            placeholder="e.g. Physical inventory cycle count variance / damaged roll written off."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {loading ? 'Processing...' : 'Apply Stock Adjustment'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
