'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRightLeft } from 'lucide-react'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { transferStockAction } from '@/actions/inventory.actions'

interface StockTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export function StockTransferModal({
  open,
  onOpenChange,
  materials,
  locations,
  selectedMaterialId,
  onSuccess,
  companyId,
}: StockTransferModalProps) {
  const [materialId, setMaterialId] = useState(selectedMaterialId || (materials[0]?.id || ''))
  const [sourceLocationId, setSourceLocationId] = useState(locations[0]?.id || '')
  const [destLocationId, setDestLocationId] = useState(locations[1]?.id || locations[0]?.id || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMaterial = materials.find((m) => m.id === (materialId || selectedMaterialId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      setError('Please select a material.')
      return
    }
    if (!sourceLocationId || !destLocationId) {
      setError('Please select both source and destination locations.')
      return
    }
    if (sourceLocationId === destLocationId) {
      setError('Source and destination locations cannot be identical.')
      return
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await transferStockAction(
        {
          material_id: materialId,
          source_location_id: sourceLocationId,
          destination_location_id: destLocationId,
          quantity: Number(quantity),
          unit: activeMaterial?.unit || 'pcs',
          reason: reason.trim() || null,
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to transfer stock.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setQuantity(1)
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
      title="Inter-Location Stock Transfer"
      description="Move inventory stock between warehouse stores or floor racks with dual TRANSFER_OUT & TRANSFER_IN ledger audit."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="trfMat" required>
            Select Material
          </Label>
          <select
            id="trfMat"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            required
          >
            <option value="">-- Choose Material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.sku} - {m.name} ({m.current_stock} {m.unit} on hand)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="trfSrc" required>
              Source Store (From)
            </Label>
            <select
              id="trfSrc"
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trfDst" required>
              Destination Store (To)
            </Label>
            <select
              id="trfDst"
              value={destLocationId}
              onChange={(e) => setDestLocationId(e.target.value)}
              className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trfQty" required>
            Transfer Quantity ({activeMaterial?.unit || 'unit'})
          </Label>
          <Input
            id="trfQty"
            type="number"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trfRsn">Transfer Reason / Request Ref</Label>
          <Input
            id="trfRsn"
            placeholder="e.g. Replenish press floor staging rack for morning shift."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {loading ? 'Processing...' : 'Execute Stock Transfer'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
