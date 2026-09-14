'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { receiveStockAction } from '@/actions/inventory.actions'

interface ReceiveStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export function ReceiveStockModal({
  open,
  onOpenChange,
  materials,
  locations,
  selectedMaterialId,
  onSuccess,
  companyId,
}: ReceiveStockModalProps) {
  const [materialId, setMaterialId] = useState(selectedMaterialId || (materials[0]?.id || ''))
  const [locationId, setLocationId] = useState(locations[0]?.id || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitCost, setUnitCost] = useState<number>(0)
  const [isOpeningBalance, setIsOpeningBalance] = useState(false)
  const [supplierRef, setSupplierRef] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMaterial = materials.find((m) => m.id === (materialId || selectedMaterialId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId) {
      setError('Please select a material.')
      return
    }
    if (!locationId) {
      setError('Please select a receiving location.')
      return
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await receiveStockAction(
        {
          material_id: materialId,
          location_id: locationId,
          quantity: Number(quantity),
          unit_cost: Number(unitCost) || activeMaterial?.average_cost || 0,
          is_opening_balance: isOpeningBalance,
          supplier_reference: supplierRef.trim() || null,
          notes: notes.trim() || null,
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to receive stock.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setQuantity(1)
      setSupplierRef('')
      setNotes('')
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
      title={isOpeningBalance ? 'Record Opening Stock Balance' : 'Receive Material Stock (GRN)'}
      description="Record incoming stock into a designated warehouse location with immutable ledger audit."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Transaction Mode:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isOpeningBalance}
              onChange={(e) => setIsOpeningBalance(e.target.checked)}
              className="rounded"
            />
            <span className="font-bold text-emerald-700 dark:text-emerald-400">Opening Balance Migration</span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rcvMat" required>
            Select Material
          </Label>
          <select
            id="rcvMat"
            value={materialId}
            onChange={(e) => {
              setMaterialId(e.target.value)
              const m = materials.find((x) => x.id === e.target.value)
              if (m) setUnitCost(m.average_cost || m.last_purchase_price || 0)
            }}
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

        <div className="space-y-1.5">
          <Label htmlFor="rcvLoc" required>
            Warehouse Location
          </Label>
          <select
            id="rcvLoc"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            required
          >
            <option value="">-- Choose Store Location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.location_name} ({loc.location_code}) - {loc.location_type}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rcvQty" required>
              Quantity Received ({activeMaterial?.unit || 'units'})
            </Label>
            <Input
              id="rcvQty"
              type="number"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rcvCost">Unit Cost (৳ BDT)</Label>
            <Input
              id="rcvCost"
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rcvRef">Supplier / Invoice Reference #</Label>
          <Input
            id="rcvRef"
            placeholder="e.g. PO-8921 / Chawkbazar Supplier Memo #1024"
            value={supplierRef}
            onChange={(e) => setSupplierRef(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rcvNotes">Notes / Lot Batch Tag</Label>
          <Input
            id="rcvNotes"
            placeholder="e.g. Batch #2026-09A, pristine roll condition"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-h-[40px]">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {loading ? 'Processing...' : isOpeningBalance ? 'Save Opening Balance' : 'Confirm Stock Receipt'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
