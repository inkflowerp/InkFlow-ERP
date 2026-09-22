'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRightLeft,
  Package,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Building,
  Layers,
  ArrowRight,
  User,
  Truck,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { MaterialRecord, InventoryLocationRecord, InventoryRollRecord } from '@/types/inventory.types'
import { transferStockAction } from '@/actions/inventory.actions'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

export interface StockTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  rolls?: InventoryRollRecord[]
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

export interface TransferItemRow {
  id: string
  material_id: string
  material_name: string
  category?: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  roll_id?: string | null
  notes?: string
}

const TRANSFER_REASON_PRESETS = [
  {
    tag: 'Floor Replenishment',
    reasonEn: 'Replenish print/finishing floor buffer for upcoming shift',
    reasonBn: 'আসন্ন শিফটের জন্য প্রিন্টিং ফ্লোর বাফার সরবরাহ',
  },
  {
    tag: 'Inter-Store Balancing',
    reasonEn: 'Periodic balance transfer between central store & branch depot',
    reasonBn: 'কেন্দ্রীয় ও শাখা গোডাউনের মধ্যে নিয়মিত ব্যালেন্স স্থানান্তর',
  },
  {
    tag: 'Remnant Rack Relocation',
    reasonEn: 'Move usable roll remnants to dedicated cutting rack',
    reasonBn: 'কাটপিস র্যাক ও অবশিষ্টাংশ স্থানান্তর',
  },
  {
    tag: 'Ink Vault Quarantine',
    reasonEn: 'Secure transfer of specialized UV & eco-solvent inks to vault',
    reasonBn: 'কালি ও কেমিক্যাল ভল্টে নিরাপদ স্থানান্তর',
  },
  {
    tag: 'Job Order Staging',
    reasonEn: 'Staged media allocation for scheduled commercial print job',
    reasonBn: 'নির্দিষ্ট জব অর্ডারের জন্য মেটেরিয়াল স্টেজিং',
  },
]

export function StockTransferModal({
  open,
  onOpenChange,
  materials,
  locations,
  rolls = [],
  selectedMaterialId,
  onSuccess,
  companyId,
}: StockTransferModalProps) {
  const { tBilingual } = useI18n()

  // Location Routing
  const [sourceLocationId, setSourceLocationId] = useState<string>('')
  const [destLocationId, setDestLocationId] = useState<string>('')

  // Logistics & Handover
  const [transferredByName, setTransferredByName] = useState<string>('')
  const [transferOrderNo, setTransferOrderNo] = useState<string>('')
  const [vehicleCartNo, setVehicleCartNo] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Multi-item transfer rows
  const [items, setItems] = useState<TransferItemRow[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Initialize state on open
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccessMsg(null)
      setLoading(false)

      // Default locations
      const defaultSrc =
        locations.find((l) => l.location_type === 'raw_material_store' || l.location_type === 'main_store') ||
        locations[0]
      const defaultDest =
        locations.find(
          (l) =>
            (l.location_type === 'production_floor' || l.location_type === 'branch_store') &&
            l.id !== defaultSrc?.id
        ) ||
        locations.find((l) => l.id !== defaultSrc?.id) ||
        locations[1] ||
        locations[0]

      if (defaultSrc && !sourceLocationId) {
        setSourceLocationId(defaultSrc.id)
      }
      if (defaultDest && !destLocationId) {
        setDestLocationId(defaultDest.id)
      }

      setTransferOrderNo(`TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)

      // Setup initial item
      const initialMat = materials.find((m) => m.id === selectedMaterialId) || materials[0]
      const cost = Number(initialMat?.average_cost || initialMat?.last_purchase_price || 0)

      setItems([
        {
          id: `trf-item-${Date.now()}-1`,
          material_id: initialMat?.id || '',
          material_name: initialMat?.name || 'Material Item',
          category: initialMat?.category,
          quantity: 1,
          unit: initialMat?.unit || 'pcs',
          unit_cost: cost,
          total_cost: cost,
        },
      ])
    }
  }, [open, selectedMaterialId, companyId])

  const sourceLoc = useMemo(() => {
    return locations.find((l) => l.id === sourceLocationId) || null
  }, [locations, sourceLocationId])

  const destLoc = useMemo(() => {
    return locations.find((l) => l.id === destLocationId) || null
  }, [locations, destLocationId])

  const handleItemChange = (index: number, field: keyof TransferItemRow, val: any) => {
    setItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: val }

      if (field === 'material_id') {
        const mat = materials.find((m) => m.id === val)
        if (mat) {
          current.material_name = mat.name
          current.category = mat.category
          current.unit = mat.unit
          current.unit_cost = Number(mat.average_cost || mat.last_purchase_price || 0)
        }
      }

      const qty = Number(field === 'quantity' ? val : current.quantity) || 0
      const cost = Number(field === 'unit_cost' ? val : current.unit_cost) || 0
      current.total_cost = Math.round(qty * cost)

      updated[index] = current
      return updated
    })
  }

  const handleAddItem = () => {
    const firstMat = materials[0]
    const cost = Number(firstMat?.average_cost || firstMat?.last_purchase_price || 0)

    setItems((prev) => [
      ...prev,
      {
        id: `trf-item-${Date.now()}-${prev.length + 1}`,
        material_id: firstMat?.id || '',
        material_name: firstMat?.name || 'Material Item',
        category: firstMat?.category,
        quantity: 1,
        unit: firstMat?.unit || 'pcs',
        unit_cost: cost,
        total_cost: cost,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculations
  const totalValuation = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [items])

  const totalQtySum = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  }, [items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!sourceLocationId || !destLocationId) {
      setError('Please select both source and destination store locations.')
      return
    }

    if (sourceLocationId === destLocationId) {
      setError('Source and destination warehouse locations cannot be identical.')
      return
    }

    if (items.length === 0) {
      setError('Please specify at least one material to transfer.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.material_id) {
        setError(`Item #${i + 1} material selection is required.`)
        return
      }
      if (Number(it.quantity) <= 0) {
        setError(`Item #${i + 1} (${it.material_name}) transfer quantity must be greater than zero.`)
        return
      }
    }

    setLoading(true)

    try {
      const fullReason = [
        reason.trim(),
        transferOrderNo ? `Transfer Order: ${transferOrderNo}` : null,
        transferredByName ? `Transferred By: ${transferredByName}` : null,
        vehicleCartNo ? `Cart/Vehicle: ${vehicleCartNo}` : null,
        notes ? `Notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      // Process each item in sequence
      for (const item of items) {
        const res = await transferStockAction(
          {
            material_id: item.material_id,
            source_location_id: sourceLocationId,
            destination_location_id: destLocationId,
            quantity: Number(item.quantity),
            unit: item.unit,
            reason: item.roll_id ? `${fullReason} [Roll: ${item.roll_id}]` : fullReason,
          },
          companyId
        )

        if (!res.success) {
          setError(res.error || `Failed to transfer ${item.material_name}.`)
          setLoading(false)
          return
        }
      }

      setSuccessMsg(
        `Successfully transferred ${items.length} item(s) from ${sourceLoc?.location_name || 'Source'} to ${destLoc?.location_name || 'Destination'}!`
      )

      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
        setReason('')
        setNotes('')
      }, 800)
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
      size="4xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Inter-Location Stock Transfer', 'আন্তঃগোডাউন স্টক স্থানান্তর')}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-mono py-0.5 px-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
              >
                Movement
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Move inventory between stores & floor racks with dual TRANSFER_OUT & TRANSFER_IN ledger audit',
                'এক গোডাউন বা রেক থেকে অন্যটিতে কাঁচামাল স্থানান্তর এবং উভয় লেজার আপডেট'
              )}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Executing Transfer...</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{tBilingual('Execute Stock Transfer', 'স্টক স্থানান্তর সম্পন্ন করুন')}</span>
              </div>
            )}
          </Button>
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

        {/* VISUAL ROUTING CONNECTOR CARD */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Transfer Routing (Origin Store ➔ Destination Store)', 'স্থানান্তর রুট')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
            {/* Origin Location */}
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-xs font-semibold block">
                {tBilingual('Source Store (Transfer OUT)', 'উৎস গোডাউন (থেকে)')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.location_code}) - {loc.location_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Middle Direction Icon */}
            <div className="sm:col-span-1 flex justify-center items-center pt-4 sm:pt-0">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Destination Location */}
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-xs font-semibold block">
                {tBilingual('Destination Store (Transfer IN)', 'গন্তব্য গোডাউন (পর্যন্ত)')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={destLocationId}
                onChange={(e) => setDestLocationId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.location_name} ({loc.location_code}) - {loc.location_type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ITEMS & PHYSICAL ROLL LEVEL MOVEMENTS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Transfer Items & Quantities', 'স্থানান্তরযোগ্য আইটেম ও পরিমাণ')}
              </h3>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddItem}
              className="h-7 text-xs font-bold text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Add Line', 'নতুন আইটেম')}
            </Button>
          </div>

          <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const liveMat = materials.find((m) => m.id === item.material_id)
              const availableStock = Number(liveMat?.current_stock || 0)
              const isInsufficient = availableStock < item.quantity

              // Matching physical rolls
              const matchingRolls = rolls.filter((r) => r.material_id === item.material_id)

              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-mono font-bold flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {liveMat?.name || item.material_name}
                      </span>
                      {liveMat?.sku && (
                        <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5">
                          {liveMat.sku}
                        </Badge>
                      )}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Remove line"
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
                        onChange={(e) => handleItemChange(idx, 'material_id', e.target.value)}
                        className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                        required
                      >
                        <option value="">-- Choose Material Item --</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.sku}) — Stock: {m.current_stock} {m.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">
                        Transfer Qty ({item.unit}) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className={cn(
                          'h-8.5 text-xs font-bold font-mono',
                          isInsufficient ? 'border-rose-500 text-rose-600 focus:ring-rose-500' : ''
                        )}
                        required
                      />
                    </div>

                    {/* Unit Valuation */}
                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">Unit Rate (৳)</Label>
                      <div className="h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center font-mono text-slate-700 dark:text-slate-300">
                        {formatBDT(item.unit_cost)}
                      </div>
                    </div>

                    {/* Roll Tag / Physical Batch */}
                    <div className="sm:col-span-3">
                      <Label className="text-[11px] text-slate-500 mb-0.5 block">Physical Roll (Optional)</Label>
                      <select
                        value={item.roll_id || ''}
                        onChange={(e) => handleItemChange(idx, 'roll_id', e.target.value || null)}
                        className="w-full h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-mono"
                      >
                        <option value="">-- Bulk Units --</option>
                        {matchingRolls.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.roll_code || r.roll_tag} ({r.width_ft}ft × {r.current_length_ft ?? r.initial_length_ft}ft)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock Availability & Insufficient Warning */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span>
                        Available Stock: <strong className="text-slate-800 dark:text-slate-200">{availableStock} {item.unit}</strong>
                      </span>
                      {isInsufficient && (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Source stock insufficient!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>Movement Value:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatBDT(item.total_cost)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Movement Summary Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Moving Items:</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                {items.length} line(s) configured
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Moving Valuation</span>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono">
                {formatBDT(totalValuation)}
              </div>
            </div>
          </div>
        </div>

        {/* LOGISTICS, REASON PRESETS & AUDIT INFO */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Transport, Handler & Transfer Objective', 'পরিবহন ও স্থানান্তরের উদ্দেশ্য')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transferred By (Handler / Driver)', 'স্থানান্তরকারী')}
              </Label>
              <Input
                placeholder="e.g. Al-Amin (Store Assistant)"
                value={transferredByName}
                onChange={(e) => setTransferredByName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Cart / Trolley / Vehicle #', 'ট্রলি বা গাড়ি নং')}
              </Label>
              <Input
                placeholder="e.g. Cart #2 / Forklift"
                value={vehicleCartNo}
                onChange={(e) => setVehicleCartNo(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Transfer Movement Order #', 'মুভমেন্ট অর্ডার নং')}
              </Label>
              <Input
                value={transferOrderNo}
                onChange={(e) => setTransferOrderNo(e.target.value)}
                className="text-xs h-9 font-mono bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold block">
              {tBilingual('Transfer Reason / Objective', 'স্থানান্তরের কারণ')}
            </Label>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {TRANSFER_REASON_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(p.reasonEn)}
                  className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  🏷️ {p.tag}
                </button>
              ))}
            </div>

            <Input
              placeholder="e.g. Replenish press floor staging rack for morning shift"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
