'use client'

import React, { useState } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialRecord, InventoryLocationRecord, MaterialRequestRecord } from '@/types/inventory.types'
import { issueMaterialAction } from '@/actions/inventory.actions'

interface MaterialIssueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  request?: MaterialRequestRecord | null
  onSuccess?: () => void
  companyId?: string
}

export function MaterialIssueModal({
  open,
  onOpenChange,
  materials,
  locations,
  request,
  onSuccess,
  companyId,
}: MaterialIssueModalProps) {
  const [sourceLocationId, setSourceLocationId] = useState(
    request?.source_location_id || locations[0]?.id || ''
  )
  const [receivedByName, setReceivedByName] = useState(request?.requested_by_name || '')
  const [notes, setNotes] = useState('')

  // Initialize issue items based on request or single material
  const [items, setItems] = useState<
    Array<{
      request_item_id?: string | null
      material_id: string
      material_name?: string
      requested_quantity?: number
      issued_quantity: number
      unit: string
      unit_cost?: number
    }>
  >(() => {
    if (request?.items && request.items.length > 0) {
      return request.items.map((it) => {
        const remaining = Math.max(0, it.requested_quantity - (it.issued_quantity || 0))
        return {
          request_item_id: it.id,
          material_id: it.material_id,
          material_name: it.material?.name || 'Material',
          requested_quantity: it.requested_quantity,
          issued_quantity: remaining,
          unit: it.unit,
          unit_cost: it.material?.average_cost || 0,
        }
      })
    }
    const defMat = materials[0]
    return [
      {
        material_id: defMat?.id || '',
        material_name: defMat?.name || 'Material',
        issued_quantity: 1,
        unit: defMat?.unit || 'pcs',
        unit_cost: defMat?.average_cost || 0,
      },
    ]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...items]
    updated[index].issued_quantity = qty
    setItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceLocationId) {
      setError('Please select a source store location.')
      return
    }
    if (items.some((it) => it.issued_quantity <= 0)) {
      setError('Issued quantity must be greater than zero for all items.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await issueMaterialAction(
        {
          request_id: request?.id || null,
          production_task_id: request?.production_task_id || null,
          source_location_id: sourceLocationId,
          received_by_name: receivedByName.trim() || null,
          notes: notes.trim() || null,
          items: items.map((it) => ({
            request_item_id: it.request_item_id || null,
            material_id: it.material_id,
            issued_quantity: Number(it.issued_quantity),
            unit: it.unit,
            unit_cost: it.unit_cost || 0,
          })),
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to issue material.')
        return
      }

      onSuccess?.()
      onOpenChange(false)
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
      title={request ? `Issue Material for Requisition ${request.request_number}` : 'Direct Material Issue to Production'}
      description="Deducts physical stock from warehouse location and records official issuance."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {request && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span>Requisition: {request.request_number}</span>
              <span className="uppercase text-blue-700 dark:text-blue-300">Priority: {request.priority}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Requested by: <strong>{request.requested_by_name}</strong> | Task:{' '}
              <strong>{request.production_task?.title || 'General Floor'}</strong>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="issSrc" required>
              Source Warehouse Store
            </Label>
            <select
              id="issSrc"
              value={sourceLocationId}
              onChange={(e) => setSourceLocationId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              <option value="">-- Select Store Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code}) - {loc.location_type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issRec">Received By (Operator / Handover)</Label>
            <Input
              id="issRec"
              placeholder="e.g. Rahim (Machine Operator)"
              value={receivedByName}
              onChange={(e) => setReceivedByName(e.target.value)}
            />
          </div>
        </div>

        {/* Issue Items */}
        <div className="space-y-3 pt-1">
          <Label required className="font-bold text-slate-800 dark:text-slate-200">
            Items to Release / Issue
          </Label>

          <div className="space-y-2">
            {items.map((it, idx) => {
              const liveMat = materials.find((m) => m.id === it.material_id)
              const stock = liveMat?.current_stock || 0
              const isInsufficient = stock < it.issued_quantity

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 dark:text-white">
                        {liveMat?.sku || ''} - {liveMat?.name || it.material_name}
                      </strong>
                      <div className="text-[11px] text-slate-500">
                        Available On-Hand: <strong className="text-emerald-600">{stock} {it.unit}</strong>
                        {it.requested_quantity && ` | Requested: ${it.requested_quantity} ${it.unit}`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <Label required>Quantity to Issue Now ({it.unit})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={it.issued_quantity}
                        onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                        className={`h-9 text-xs font-bold ${isInsufficient ? 'border-red-500 text-red-600' : ''}`}
                        required
                      />
                      {isInsufficient && (
                        <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                          Warning: Available stock ({stock} {it.unit}) is less than issue quantity!
                        </span>
                      )}
                    </div>

                    <div>
                      <Label>Unit Valuation (৳ BDT)</Label>
                      <div className="h-9 px-3 flex items-center bg-white dark:bg-slate-800 rounded border text-xs font-mono">
                        ৳ {it.unit_cost || liveMat?.average_cost || 0} / {it.unit}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issNotes">Issue Remarks / Delivery Voucher</Label>
          <Input
            id="issNotes"
            placeholder="e.g. Delivered full roll directly to Roland UV Press #1."
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
            {loading ? 'Processing...' : 'Confirm Material Issue'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
