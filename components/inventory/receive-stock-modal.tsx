'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import type { PurchaseOrderRecord, PurchaseOrderItemRecord } from '@/types/purchase.types'
import { SupplierRecord } from '@/types/crm.types'
import { receiveStockAction } from '@/actions/inventory.actions'
import { receiveGoodsAction } from '@/actions/purchase.actions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  Truck,
  Package,
  ShieldCheck,
  AlertCircle,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Building,
  Layers,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
  Hash,
  Barcode,
  CheckCheck,
  RotateCcw,
} from 'lucide-react'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface ReceiveStockModalProps {
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

export interface ItemReceiveRow {
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

export interface DirectReceiptItemRow {
  id: string
  material_id: string
  material_name: string
  unit: string
  unit_cost: number
  quantity: number
  batch_lot_number: string
  total_cost: number
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
  const { tBilingual } = useI18n()

  // Mode selection: 'po' (Purchase Order GRN), 'direct' (Direct Spot Purchase), or 'opening' (Opening Balance)
  const [mode, setMode] = useState<'po' | 'direct' | 'opening'>('direct')
  const [selectedPoId, setSelectedPoId] = useState<string>('')

  // Suppliers list for direct receipts
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [customSupplierName, setCustomSupplierName] = useState<string>('')

  // Common Header & Logistics
  const [locationId, setLocationId] = useState<string>(locations[0]?.id || '')
  const [receivedDate, setReceivedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [challanNumber, setChallanNumber] = useState('')
  const [supplierDeliveryNote, setSupplierDeliveryNote] = useState('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [notes, setNotes] = useState('')

  // PO-based receiving state
  const [poReceiveRows, setPoReceiveRows] = useState<ItemReceiveRow[]>([])

  // Direct receiving multi-item state
  const [directItems, setDirectItems] = useState<DirectReceiptItemRow[]>([
    {
      id: `dir-item-${Date.now()}-1`,
      material_id: selectedMaterialId || materials[0]?.id || '',
      material_name: materials.find((m) => m.id === selectedMaterialId)?.name || materials[0]?.name || '',
      unit: materials.find((m) => m.id === selectedMaterialId)?.unit || materials[0]?.unit || 'pcs',
      unit_cost:
        materials.find((m) => m.id === selectedMaterialId)?.average_cost ||
        materials.find((m) => m.id === selectedMaterialId)?.last_purchase_price ||
        materials[0]?.average_cost ||
        0,
      quantity: 1,
      batch_lot_number: '',
      total_cost: 0,
    },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load suppliers and reset fields when modal opens
  useEffect(() => {
    if (open) {
      const supList = PrintERPDataStore.getAll<SupplierRecord>(STORAGE_KEYS.SUPPLIERS, companyId) || []
      setSuppliers(supList)
      setError(null)
      setSuccessMsg(null)
      setLoading(false)

      if (locations.length > 0 && !locationId) {
        const defaultLoc =
          locations.find((l) => l.location_type === 'raw_material_store' || l.location_type === 'main_store') ||
          locations[0]
        setLocationId(defaultLoc.id)
      }

      const initialPo = purchaseOrder || orders.find((o) => o.id === selectedPoId)
      if (initialPo) {
        setMode('po')
        setSelectedPoId(initialPo.id)
        populatePoRows(initialPo)
      } else if (orders.length > 0 && mode === 'po' && !selectedPoId) {
        const firstReceivable =
          orders.find((o) => o.status === 'issued' || o.status === 'partially_received') || orders[0]
        if (firstReceivable) {
          setSelectedPoId(firstReceivable.id)
          populatePoRows(firstReceivable)
        }
      } else if (selectedMaterialId) {
        const mat = materials.find((x) => x.id === selectedMaterialId)
        if (mat) {
          setDirectItems([
            {
              id: `dir-item-${Date.now()}-1`,
              material_id: mat.id,
              material_name: mat.name,
              unit: mat.unit,
              unit_cost: mat.average_cost || mat.last_purchase_price || 0,
              quantity: 1,
              batch_lot_number: '',
              total_cost: Number(mat.average_cost || mat.last_purchase_price || 0),
            },
          ])
        }
      }
    }
  }, [open, purchaseOrder, selectedMaterialId, companyId])

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

  const handlePoRowChange = (index: number, field: keyof ItemReceiveRow, val: any) => {
    setPoReceiveRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: val }
      return updated
    })
  }

  // Quick action: Receive All Remaining for PO
  const handleReceiveAllRemaining = () => {
    setPoReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        accepted_quantity: row.quantity_remaining,
        rejected_quantity: 0,
        damaged_quantity: 0,
      }))
    )
  }

  // Quick action: Clear All for PO
  const handleClearAllPo = () => {
    setPoReceiveRows((prev) =>
      prev.map((row) => ({
        ...row,
        accepted_quantity: 0,
        rejected_quantity: 0,
        damaged_quantity: 0,
      }))
    )
  }

  // Direct item row manipulation
  const handleDirectItemChange = (index: number, field: keyof DirectReceiptItemRow, val: any) => {
    setDirectItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: val }

      if (field === 'material_id') {
        const mat = materials.find((m) => m.id === val)
        if (mat) {
          current.material_name = mat.name
          current.unit = mat.unit
          current.unit_cost = mat.average_cost || mat.last_purchase_price || 0
        }
      }

      const qty = Number(field === 'quantity' ? val : current.quantity) || 0
      const cost = Number(field === 'unit_cost' ? val : current.unit_cost) || 0
      current.total_cost = Math.round(qty * cost)

      updated[index] = current
      return updated
    })
  }

  const handleAddDirectItem = () => {
    const firstMat = materials[0]
    setDirectItems((prev) => [
      ...prev,
      {
        id: `dir-item-${Date.now()}-${prev.length + 1}`,
        material_id: firstMat?.id || '',
        material_name: firstMat?.name || '',
        unit: firstMat?.unit || 'pcs',
        unit_cost: firstMat?.average_cost || firstMat?.last_purchase_price || 0,
        quantity: 1,
        batch_lot_number: '',
        total_cost: Number(firstMat?.average_cost || 0),
      },
    ])
  }

  const handleRemoveDirectItem = (index: number) => {
    if (directItems.length <= 1) return
    setDirectItems((prev) => prev.filter((_, i) => i !== index))
  }

  const currentPo = orders.find((o) => o.id === selectedPoId) || purchaseOrder

  // Calculations
  const poTotalAcceptedValuation = useMemo(() => {
    return poReceiveRows.reduce((sum, r) => sum + (Number(r.accepted_quantity) || 0) * (Number(r.unit_cost) || 0), 0)
  }, [poReceiveRows])

  const directTotalValuation = useMemo(() => {
    return directItems.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [directItems])

  const totalItemsCount = useMemo(() => {
    if (mode === 'po') {
      return poReceiveRows.filter((r) => r.accepted_quantity > 0).length
    }
    return directItems.filter((r) => r.quantity > 0).length
  }, [mode, poReceiveRows, directItems])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const effectiveLocationId = locationId || locations[0]?.id

    if (!effectiveLocationId && locations.length > 0) {
      setError('Please select a destination warehouse / store location.')
      return
    }

    if (mode === 'po') {
      if (!selectedPoId && !currentPo) {
        setError('Please select a valid Purchase Order.')
        return
      }

      const effectivePoId = currentPo?.id || selectedPoId
      const itemsToReceive = poReceiveRows.filter((r) => r.accepted_quantity > 0 || r.rejected_quantity > 0 || r.damaged_quantity > 0)

      if (itemsToReceive.length === 0) {
        setError('Please specify an accepted or inspected quantity for at least one item.')
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
        const fullNotes = [
          notes.trim(),
          vehicleNumber ? `Vehicle: ${vehicleNumber.trim()}` : null,
          carrierName ? `Carrier: ${carrierName.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' | ')

        const res = await receiveGoodsAction(
          {
            purchase_order_id: effectivePoId,
            receiving_location_id: effectiveLocationId || null,
            received_date: receivedDate,
            challan_number: challanNumber.trim() || null,
            supplier_delivery_note: supplierDeliveryNote.trim() || null,
            supplier_invoice_number: supplierInvoiceNumber.trim() || null,
            notes: fullNotes || null,
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

        setSuccessMsg('Goods Received Note (GRN) posted and inventory balances updated successfully!')
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
          resetForm()
        }, 800)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during goods receiving.')
      } finally {
        setLoading(false)
      }
    } else {
      // Direct Receipt or Opening Balance Mode
      if (directItems.length === 0) {
        setError('Please add at least one material item.')
        return
      }

      for (let i = 0; i < directItems.length; i++) {
        const it = directItems[i]
        if (!it.material_id) {
          setError(`Item #${i + 1} material selection is required.`)
          return
        }
        if (it.quantity <= 0) {
          setError(`Item #${i + 1} quantity must be greater than zero.`)
          return
        }
      }

      setLoading(true)
      try {
        const supRecord = suppliers.find((s) => s.id === selectedSupplierId)
        const supplierRef =
          supRecord?.supplier_name ||
          customSupplierName.trim() ||
          challanNumber.trim() ||
          supplierInvoiceNumber.trim() ||
          (mode === 'opening' ? 'Opening Balance Migration' : 'Spot Purchase')

        const fullNotes = [
          notes.trim(),
          challanNumber ? `Challan: ${challanNumber.trim()}` : null,
          supplierInvoiceNumber ? `Invoice: ${supplierInvoiceNumber.trim()}` : null,
          vehicleNumber ? `Vehicle: ${vehicleNumber.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' | ')

        // Process each direct item sequentially
        for (const item of directItems) {
          const res = await receiveStockAction(
            {
              material_id: item.material_id,
              location_id: effectiveLocationId || locations[0]?.id,
              quantity: Number(item.quantity),
              unit_cost: Number(item.unit_cost) || 0,
              is_opening_balance: mode === 'opening',
              supplier_reference: supplierRef,
              notes: item.batch_lot_number ? `${fullNotes} [Lot: ${item.batch_lot_number}]` : fullNotes,
            },
            companyId
          )

          if (!res.success) {
            setError(res.error || `Failed to receive stock for ${item.material_name}`)
            setLoading(false)
            return
          }
        }

        setSuccessMsg(
          mode === 'opening'
            ? 'Opening balances recorded and audited successfully!'
            : 'Direct material receipt posted to stock ledger successfully!'
        )
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
          resetForm()
        }, 800)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setError(null)
    setSuccessMsg(null)
    setChallanNumber('')
    setSupplierDeliveryNote('')
    setSupplierInvoiceNumber('')
    setVehicleNumber('')
    setCarrierName('')
    setNotes('')
    setDirectItems([
      {
        id: `dir-item-${Date.now()}-1`,
        material_id: materials[0]?.id || '',
        material_name: materials[0]?.name || '',
        unit: materials[0]?.unit || 'pcs',
        unit_cost: materials[0]?.average_cost || 0,
        quantity: 1,
        batch_lot_number: '',
        total_cost: 0,
      },
    ])
  }

  const receivableOrders = orders.filter((o) => o.status !== 'received' && o.status !== 'cancelled')

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
      size="4xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {mode === 'po'
                  ? tBilingual('Goods Receiving Note (GRN) Intake', 'ক্রয় আদেশ অনুযায়ী মাল গ্রহণ (GRN)')
                  : mode === 'opening'
                  ? tBilingual('Record Opening Stock Balance', 'প্রারম্ভিক স্টক ব্যালেন্স এন্ট্রি')
                  : tBilingual('Direct Material Receipt (Spot Intake)', 'সরাসরি কাঁচামাল গ্রহণ')}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
              >
                Inward Gate
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Record physical store intake with quality inspection, batch tracking & stock valuation',
                'চালান ও গেট পাস যাচাই করে গুদামে মাল প্রবেশ এবং স্টক লেজার আপডেট'
              )}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  <span>Processing Intake...</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {mode === 'po'
                      ? tBilingual('Post GRN Stock Receipt', 'GRN স্টক গ্রহণ নিশ্চিত করুন')
                      : mode === 'opening'
                      ? tBilingual('Save Opening Balance', 'প্রারম্ভিক স্টক সংরক্ষণ করুন')
                      : tBilingual('Confirm Material Intake', 'কাঁচামাল গ্রহণ সম্পন্ন করুন')}
                  </span>
                </div>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 3-WAY INTAKE MODE SELECTOR */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('po')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'po'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Truck className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('PO Receiving (GRN)', 'PO চালান গ্রহণ')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('direct')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'direct'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Direct Spot Intake', 'সরাসরি গ্রহণ')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('opening')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'opening'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Opening Stock', 'প্রারম্ভিক স্টক')}</span>
          </button>
        </div>

        {/* LOGISTICS & WAREHOUSE LOCATION (COMMON BAR) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Destination Store & Challan Documentation', 'গন্তব্য গোডাউন ও চালান তথ্য')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Target Warehouse / Store', 'গন্তব্য গোডাউন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                {locations.length > 0 ? (
                  locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} {loc.location_code ? `(${loc.location_code})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="main-store">Main Raw Material Store</option>
                )}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Intake / Received Date', 'গ্রহণের তারিখ')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Challan / Gate Pass #', 'চালান / গেট পাস নং')}
              </Label>
              <Input
                placeholder="e.g. CH-2026-9012"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Supplier Bill / Tax Invoice #', 'সাপ্লায়ার ইনভয়েস নং')}
              </Label>
              <Input
                placeholder="e.g. INV-8812 / Mushak 6.3"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transport Vehicle / Truck #', 'গাড়ি / ট্রাক নং')}
              </Label>
              <Input
                placeholder="e.g. Dhaka Metro-Ta 11-2041"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transport / Courier Name', 'কুরিয়ার / ট্রান্সপোর্ট')}
              </Label>
              <Input
                placeholder="e.g. Sundarban Courier / SA Paribahan"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: PO RECEIVING (GRN) */}
        {/* ========================================================================= */}
        {mode === 'po' && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {tBilingual('Select Inward Purchase Order', 'ক্রয় আদেশ নির্বাচন')}
                </h3>
              </div>

              {poReceiveRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleReceiveAllRemaining}
                    className="h-7 text-[11px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    {tBilingual('Receive All Remaining', 'সব গ্রহণ')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAllPo}
                    className="h-7 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {tBilingual('Clear All', 'মুছুন')}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Inward Purchase Order (PO)', 'ক্রয় আদেশ')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedPoId || currentPo?.id || ''}
                onChange={(e) => handlePoChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                <option value="">-- Choose Inward Purchase Order --</option>
                {receivableOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.po_number} — {o.supplier_name} ({o.status.replace('_', ' ')}) — Grand Total: ৳{formatBDT(o.grand_total)}
                  </option>
                ))}
              </select>
            </div>

            {/* PO Intel Banner */}
            {currentPo && (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Vendor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {currentPo.supplier_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PO Number:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {currentPo.po_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Expected Date:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {currentPo.expected_delivery_date || currentPo.po_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">PO Total Value:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    ৳ {formatBDT(currentPo.grand_total)}
                  </span>
                </div>
              </div>
            )}

            {/* PO Line Items Receiving Grid */}
            {poReceiveRows.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  {tBilingual('Quality Inspection & Intake Quantities', 'মান যাচাই ও গ্রহণের পরিমাণ')}
                </Label>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3 min-w-[180px]">Material / Item</th>
                        <th className="p-3 text-right">Ordered</th>
                        <th className="p-3 text-right">Prev Rcvd</th>
                        <th className="p-3 text-right">Remaining</th>
                        <th className="p-3 text-right min-w-[90px]">Accepted (Rcv)</th>
                        <th className="p-3 text-right min-w-[70px]">Rejected</th>
                        <th className="p-3 min-w-[110px]">Batch / Lot #</th>
                        <th className="p-3 text-right min-w-[90px]">Value (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {poReceiveRows.map((row, idx) => {
                        const lineAcceptedVal = Math.round((Number(row.accepted_quantity) || 0) * (Number(row.unit_cost) || 0))

                        return (
                          <tr key={row.po_item_id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">{row.material_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Rate: ৳{formatBDT(row.unit_cost)} / {row.unit}
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {row.quantity_ordered} {row.unit}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-500">
                              {row.quantity_received} {row.unit}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {row.quantity_remaining} {row.unit}
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max={row.quantity_remaining}
                                value={row.accepted_quantity}
                                onChange={(e) => handlePoRowChange(idx, 'accepted_quantity', Number(e.target.value))}
                                className="h-8 text-xs text-right font-mono font-bold w-20 ml-auto border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={row.rejected_quantity}
                                onChange={(e) => handlePoRowChange(idx, 'rejected_quantity', Number(e.target.value))}
                                className="h-8 text-xs text-right font-mono text-rose-600 w-16 ml-auto"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                placeholder="Lot # / Roll Tag"
                                value={row.batch_lot_number}
                                onChange={(e) => handlePoRowChange(idx, 'batch_lot_number', e.target.value)}
                                className="h-8 text-xs font-mono w-28"
                              />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ৳ {formatBDT(lineAcceptedVal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* GRN Summary Banner */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Intake Lines Accepted:</span>
                    <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {totalItemsCount} material item(s) to post to ledger
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accepted GRN Value</span>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      ৳ {formatBDT(poTotalAcceptedValuation)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2 & 3: DIRECT MATERIAL RECEIPT / OPENING BALANCE */}
        {/* ========================================================================= */}
        {(mode === 'direct' || mode === 'opening') && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {mode === 'opening'
                    ? tBilingual('Opening Stock Materials & Quantities', 'প্রারম্ভিক স্টক আইটেম ও পরিমাণ')
                    : tBilingual('Direct Stock Intake Catalog Lines', 'সরাসরি গ্রহণের আইটেম ও দরপত্র')}
                </h3>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddDirectItem}
                className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Add Line', 'নতুন আইটেম')}
              </Button>
            </div>

            {/* Vendor Selector (Only for Direct Receipt) */}
            {mode === 'direct' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Supplier / Mill Vendor', 'সাপ্লায়ার নির্বাচন')}
                  </Label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="">-- Choose Registered Vendor (Optional) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name} — 📞 {s.mobile}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Or Custom Spot Vendor / Source', 'অথবা স্পট সাপ্লায়ার')}
                  </Label>
                  <Input
                    placeholder="e.g. Local Chawkbazar Spot Purchase"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}

            {/* Direct Items List */}
            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
              {directItems.map((item, idx) => {
                const activeMat = materials.find((m) => m.id === item.material_id)

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-mono font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.material_name || 'Select Material'}
                        </span>
                      </div>

                      {directItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDirectItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Material Selector */}
                      <div className="sm:col-span-5">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">
                          Material Item <span className="text-rose-500">*</span>
                        </Label>
                        <select
                          value={item.material_id}
                          onChange={(e) => handleDirectItemChange(idx, 'material_id', e.target.value)}
                          className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                          required
                        >
                          <option value="">-- Choose Material Item --</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.sku}) — {m.current_stock} {m.unit} on hand
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">
                          Qty ({item.unit || 'pcs'}) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleDirectItemChange(idx, 'quantity', Number(e.target.value))}
                          className="h-8.5 text-xs font-bold font-mono"
                          required
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">
                          Unit Cost (৳) <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) => handleDirectItemChange(idx, 'unit_cost', Number(e.target.value))}
                          className="h-8.5 text-xs font-mono font-semibold"
                          required
                        />
                      </div>

                      {/* Batch Lot # */}
                      <div className="sm:col-span-3">
                        <Label className="text-[11px] text-slate-500 mb-0.5 block">Batch / Lot / Tag</Label>
                        <Input
                          placeholder="e.g. Lot-091A"
                          value={item.batch_lot_number}
                          onChange={(e) => handleDirectItemChange(idx, 'batch_lot_number', e.target.value)}
                          className="h-8.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        Calculation: {item.quantity} {item.unit} × ৳{formatBDT(item.unit_cost)}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        ৳ {formatBDT(item.total_cost)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Direct Total Summary Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Lines Configured:</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {directItems.length} item line(s)
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Inward Valuation</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  ৳ {formatBDT(directTotalValuation)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTES & AUDIT COMMENT */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2 shadow-xs">
          <Label className="text-xs font-semibold block">
            {tBilingual('Receiving Inspection Notes & QC Comments (Optional)', 'পরিদর্শন মন্তব্য ও শর্তাবলী')}
          </Label>
          <textarea
            rows={2}
            placeholder="e.g. Physical rolls inspected; no transit damage detected; verified by store officer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </ModalDialog>
  )
}
