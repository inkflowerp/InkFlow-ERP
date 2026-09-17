'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import type { PurchaseOrderRecord, PurchaseOrderItemRecord } from '@/types/purchase.types'
import { receiveStockAction } from '@/actions/inventory.actions'
import { receiveGoodsAction } from '@/actions/purchase.actions'
import { Truck, Package, ShieldCheck, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'

interface ReceiveStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  orders?: PurchaseOrderRecord[]
  purchaseOrder?: PurchaseOrderRecord | null
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

interface ItemReceiveRow {
  po_item_id: string
  material_id: string
  material_name: string
  unit: string
  unit_cost: number
  quantity_ordered: number
  quantity_received: number
  quantity_remaining: number
  accepted_quantity: number
  rejected_quantity: number
  damaged_quantity: number
  batch_lot_number: string
  roll_width_ft?: number
  roll_length_ft?: number
}

export function ReceiveStockModal({
  open,
  onOpenChange,
  materials,
  locations,
  orders = [],
  purchaseOrder,
  selectedMaterialId,
  onSuccess,
  companyId,
}: ReceiveStockModalProps) {
  // Mode selection: 'po' or 'direct'
  const [mode, setMode] = useState<'po' | 'direct'>('direct')
  const [selectedPoId, setSelectedPoId] = useState<string>('')

  // PO-based receiving state
  const [poReceiveRows, setPoReceiveRows] = useState<ItemReceiveRow[]>([])
  const [challanNumber, setChallanNumber] = useState('')
  const [supplierDeliveryNote, setSupplierDeliveryNote] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])

  // Direct receiving state
  const [materialId, setMaterialId] = useState(selectedMaterialId || (materials[0]?.id || ''))
  const [locationId, setLocationId] = useState(locations[0]?.id || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [unitCost, setUnitCost] = useState<number>(0)
  const [isOpeningBalance, setIsOpeningBalance] = useState(false)
  const [supplierRef, setSupplierRef] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize state when modal opens or props change
  useEffect(() => {
    if (!open) {
      setError(null)
      return
    }

    const initialPo = purchaseOrder || orders.find((o) => o.id === selectedPoId)
    if (initialPo) {
      setMode('po')
      setSelectedPoId(initialPo.id)
      populatePoRows(initialPo)
    } else if (orders.length > 0 && mode === 'po' && !selectedPoId) {
      const firstReceivable = orders.find((o) => o.status === 'issued' || o.status === 'partially_received') || orders[0]
      if (firstReceivable) {
        setSelectedPoId(firstReceivable.id)
        populatePoRows(firstReceivable)
      }
    } else if (selectedMaterialId) {
      setMaterialId(selectedMaterialId)
      const m = materials.find((x) => x.id === selectedMaterialId)
      if (m) setUnitCost(m.average_cost || m.last_purchase_price || 0)
    }
  }, [open, purchaseOrder, selectedMaterialId])

  const populatePoRows = (po: PurchaseOrderRecord) => {
    const rows: ItemReceiveRow[] = (po.items || []).map((item) => {
      const mat = materials.find((m) => m.id === item.material_id)
      const rem = Number(item.quantity_remaining ?? Math.max(0, item.quantity_ordered - item.quantity_received))
      return {
        po_item_id: item.id,
        material_id: item.material_id,
        material_name: item.material_name,
        unit: item.unit,
        unit_cost: item.unit_cost,
        quantity_ordered: Number(item.quantity_ordered),
        quantity_received: Number(item.quantity_received),
        quantity_remaining: rem,
        accepted_quantity: rem, // Default to receiving remaining balance
        rejected_quantity: 0,
        damaged_quantity: 0,
        batch_lot_number: '',
        roll_width_ft: mat?.roll_width_ft || (mat?.width ? Number(mat.width) : undefined),
        roll_length_ft: mat?.roll_length_ft || (mat?.length ? Number(mat.length) : undefined),
      }
    })
    setPoReceiveRows(rows)
  }

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId)
    const foundPo = orders.find((o) => o.id === poId)
    if (foundPo) {
      populatePoRows(foundPo)
    } else {
      setPoReceiveRows([])
    }
  }

  const handleRowQuantityChange = (index: number, val: number) => {
    setPoReceiveRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], accepted_quantity: Math.max(0, val) }
      return updated
    })
  }

  const activeMaterial = materials.find((m) => m.id === (materialId || selectedMaterialId))
  const currentPo = orders.find((o) => o.id === selectedPoId) || purchaseOrder

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!locationId && locations.length > 0) {
      setLocationId(locations[0].id)
    }

    if (mode === 'po') {
      if (!selectedPoId && !currentPo) {
        setError('Please select a valid Purchase Order.')
        return
      }

      const effectivePoId = currentPo?.id || selectedPoId
      const itemsToReceive = poReceiveRows.filter((r) => r.accepted_quantity > 0 || r.rejected_quantity > 0)

      if (itemsToReceive.length === 0) {
        setError('Please specify an accepted quantity greater than zero for at least one item.')
        return
      }

      // Over-receipt client check
      for (const item of itemsToReceive) {
        if (item.accepted_quantity > item.quantity_remaining) {
          setError(
            `Accepted quantity (${item.accepted_quantity}) for ${item.material_name} exceeds remaining ordered balance (${item.quantity_remaining}).`
          )
          return
        }
      }

      setLoading(true)
      try {
        const res = await receiveGoodsAction(
          {
            purchase_order_id: effectivePoId,
            receiving_location_id: locationId || (locations[0]?.id ?? null),
            received_date: receivedDate,
            challan_number: challanNumber.trim() || null,
            supplier_delivery_note: supplierDeliveryNote.trim() || null,
            supplier_invoice_number: supplierInvoiceNumber.trim() || null,
            notes: notes.trim() || null,
            items_received: itemsToReceive.map((item) => ({
              po_item_id: item.po_item_id,
              material_id: item.material_id,
              material_name: item.material_name,
              current_received: item.accepted_quantity + item.rejected_quantity + item.damaged_quantity,
              accepted_quantity: item.accepted_quantity,
              rejected_quantity: item.rejected_quantity,
              damaged_quantity: item.damaged_quantity,
              unit: item.unit,
              unit_cost: item.unit_cost,
              batch_lot_number: item.batch_lot_number || null,
            })),
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || 'Failed to process goods receipt.')
          return
        }

        onSuccess?.()
        onOpenChange(false)
        resetForm()
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during goods receiving.')
      } finally {
        setLoading(false)
      }
    } else {
      // Direct / Opening Balance Mode
      if (!materialId) {
        setError('Please select a material.')
        return
      }
      if (!locationId && locations.length > 0) {
        setError('Please select a receiving location.')
        return
      }
      if (quantity <= 0) {
        setError('Quantity must be greater than zero.')
        return
      }

      setLoading(true)
      try {
        const res = await receiveStockAction(
          {
            material_id: materialId,
            location_id: locationId || locations[0]?.id,
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
        resetForm()
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setQuantity(1)
    setSupplierRef('')
    setNotes('')
    setChallanNumber('')
    setSupplierDeliveryNote('')
    setSupplierInvoiceNumber('')
    setError(null)
  }

  const receivableOrders = orders.filter((o) => o.status !== 'received' && o.status !== 'cancelled')

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === 'po'
          ? 'Receive Goods against PO (GRN)'
          : isOpeningBalance
          ? 'Record Opening Stock Balance'
          : 'Direct Material Receipt (GRN)'
      }
      description="Record physical incoming stock with immutable ledger audit and automated roll generation."
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMode('po')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              mode === 'po'
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            PO Receiving (GRN)
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              mode === 'direct'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Direct / Opening Balance
          </button>
        </div>

        {/* Location Selector (Shared) */}
        <div className="space-y-1.5">
          <Label htmlFor="rcvLoc" required>
            Warehouse / Store Location
          </Label>
          <select
            id="rcvLoc"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            required
          >
            {locations.length === 0 ? (
              <option value="">Main Warehouse (Default)</option>
            ) : (
              locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name} ({loc.location_code}) - {loc.location_type}
                </option>
              ))
            )}
          </select>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: PO RECEIVING (GRN) */}
        {/* ========================================================================= */}
        {mode === 'po' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="poSelect" required>
                Select Purchase Order
              </Label>
              <select
                id="poSelect"
                value={selectedPoId || currentPo?.id || ''}
                onChange={(e) => handlePoChange(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                required
              >
                <option value="">-- Choose Purchase Order --</option>
                {receivableOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.po_number} — {o.supplier_name} ({o.status.replace('_', ' ')}) — ৳{o.grand_total}
                  </option>
                ))}
              </select>
            </div>

            {currentPo && (
              <div className="p-3 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Vendor: {currentPo.supplier_name}</span>
                  <span className="font-mono text-violet-700 dark:text-violet-300">{currentPo.po_number}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>PO Date: {currentPo.po_date}</span>
                  <span>Total: ৳{currentPo.grand_total}</span>
                </div>
              </div>
            )}

            {/* Line Items Table */}
            {poReceiveRows.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Ordered Items & Quantities to Receive
                </Label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b">
                      <tr>
                        <th className="p-2">Item / Material</th>
                        <th className="p-2 text-right">Ordered</th>
                        <th className="p-2 text-right">Prev Rcvd</th>
                        <th className="p-2 text-right">Remaining</th>
                        <th className="p-2 text-right w-24">Receive Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {poReceiveRows.map((row, idx) => (
                        <tr key={row.po_item_id || idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <div className="font-bold text-slate-900 dark:text-white">{row.material_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ৳{row.unit_cost} / {row.unit}
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300">
                            {row.quantity_ordered} {row.unit}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-500">
                            {row.quantity_received} {row.unit}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-violet-600">
                            {row.quantity_remaining} {row.unit}
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={row.quantity_remaining}
                              value={row.accepted_quantity}
                              onChange={(e) => handleRowQuantityChange(idx, Number(e.target.value))}
                              className="h-8 text-xs text-right font-mono font-bold w-20 ml-auto"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Challan & Shipment Reference Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="challanNo">Challan / Gate Pass #</Label>
                <Input
                  id="challanNo"
                  placeholder="e.g. CH-2026-9012"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcvDate">Received Date</Label>
                <Input
                  id="rcvDate"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="delNote">Supplier Delivery Note #</Label>
                <Input
                  id="delNote"
                  placeholder="e.g. DN-5542"
                  value={supplierDeliveryNote}
                  onChange={(e) => setSupplierDeliveryNote(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invNo">Supplier Bill / Invoice #</Label>
                <Input
                  id="invNo"
                  placeholder="e.g. INV-8812"
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: DIRECT RECEIPT / OPENING BALANCE */}
        {/* ========================================================================= */}
        {mode === 'direct' && (
          <div className="space-y-4">
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
                Select Material / Item
              </Label>
              <select
                id="rcvMat"
                value={materialId}
                onChange={(e) => {
                  setMaterialId(e.target.value)
                  const m = materials.find((x) => x.id === e.target.value)
                  if (m) setUnitCost(m.average_cost || m.last_purchase_price || 0)
                }}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rcvQty" required>
                  Quantity Received ({activeMaterial?.unit || 'units'})
                </Label>
                <Input
                  id="rcvQty"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  className="h-9 text-xs"
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
                  className="h-9 text-xs"
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
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}

        {/* Common Notes Field */}
        <div className="space-y-1.5">
          <Label htmlFor="rcvNotes">Notes / Lot Batch Tag</Label>
          <Input
            id="rcvNotes"
            placeholder="e.g. Batch #2026-09A, pristine condition"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[38px] text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            {loading ? (
              'Processing...'
            ) : mode === 'po' ? (
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Process GRN Stock Receipt
              </span>
            ) : isOpeningBalance ? (
              'Save Opening Balance'
            ) : (
              'Confirm Stock Receipt'
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
