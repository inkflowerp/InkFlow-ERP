'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MaterialRecord, InventoryLocationRecord } from '@/types/inventory.types'
import { adjustStockAction } from '@/actions/inventory.actions'
import {
  Scale,
  Package,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Building,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Hash,
  User,
  RotateCcw,
  Sparkles,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { formatBDT } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'

export interface StockAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRecord[]
  locations: InventoryLocationRecord[]
  selectedMaterial?: MaterialRecord | null
  selectedMaterialId?: string
  onSuccess?: () => void
  companyId?: string
}

const AUDIT_REASON_PRESETS = [
  {
    tag: 'Physical Cycle Count',
    reasonEn: 'Routine cycle count physical variance correction',
    reasonBn: 'রুটিন সাইকেল গণনা অনুযায়ী ফিজিক্যাল স্টক সমন্বয়',
  },
  {
    tag: 'Damage Write-off',
    reasonEn: 'Waterlogged / transit handling damaged material write-off',
    reasonBn: 'গোডাউনে পরিবহনে ক্ষতিগ্রস্ত কাঁচামাল অপচয় বাতিল',
  },
  {
    tag: 'Expired Chemistry',
    reasonEn: 'Expired / solidified ink batch write-off',
    reasonBn: 'মেয়াদোত্তীর্ণ কালি বা কেমিক্যাল ব্যাচ বাতিল',
  },
  {
    tag: 'Cutting Waste Conversion',
    reasonEn: 'Unrecorded off-cut / remnant floor scrap conversion',
    reasonBn: 'অরেকর্ডকৃত কাটপিস বর্জ্য রূপান্তর সমন্বয়',
  },
  {
    tag: 'Supplier Shortage',
    reasonEn: 'Supplier invoice count mismatch reconciliation',
    reasonBn: 'সাপ্লায়ার চালান ঘাটতি সংশোধন',
  },
]

export function StockAdjustmentModal({
  open,
  onOpenChange,
  materials,
  locations,
  selectedMaterial,
  selectedMaterialId,
  onSuccess,
  companyId,
}: StockAdjustmentModalProps) {
  const { tBilingual } = useI18n()

  // Adjustment Mode: 'physical_count' (Count Reconciliation), 'delta' (Direct Variance +/-), or 'damage_writeoff' (Scrap)
  const [mode, setMode] = useState<'physical_count' | 'delta' | 'damage_writeoff'>('physical_count')

  // Form State
  const [materialId, setMaterialId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [physicalCount, setPhysicalCount] = useState<number>(0)
  const [deltaQuantity, setDeltaQuantity] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [auditorName, setAuditorName] = useState<string>('')
  const [auditRefNumber, setAuditRefNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Initialize modal state on open
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccessMsg(null)
      setLoading(false)

      const targetMat =
        selectedMaterial ||
        materials.find((m) => m.id === selectedMaterialId) ||
        materials[0]

      if (targetMat) {
        setMaterialId(targetMat.id)
        setPhysicalCount(Number(targetMat.current_stock || 0))
        setDeltaQuantity(0)
      }

      const defaultLoc =
        locations.find((l) => l.location_type === 'raw_material_store' || l.location_type === 'main_store') ||
        locations[0]
      if (defaultLoc && !locationId) {
        setLocationId(defaultLoc.id)
      }

      setAuditRefNumber(`AUDIT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`)
    }
  }, [open, selectedMaterial, selectedMaterialId, companyId])

  // Active material record
  const activeMaterial = useMemo(() => {
    return materials.find((m) => m.id === materialId) || null
  }, [materials, materialId])

  const stockBreakdown = useMemo(() => {
    return activeMaterial ? getMaterialWarehouseStockBreakdown(activeMaterial) : null
  }, [activeMaterial])

  const currentSysStock = Number(activeMaterial?.current_stock || 0)
  const unitCost = Number(activeMaterial?.average_cost || activeMaterial?.last_purchase_price || 0)

  // Calculations
  const calculatedNewStock = useMemo(() => {
    if (mode === 'physical_count') {
      return Number(physicalCount)
    }
    if (mode === 'delta') {
      return Math.max(0, currentSysStock + Number(deltaQuantity))
    }
    if (mode === 'damage_writeoff') {
      return Math.max(0, currentSysStock - Math.abs(Number(deltaQuantity)))
    }
    return currentSysStock
  }, [mode, physicalCount, deltaQuantity, currentSysStock])

  const variance = useMemo(() => {
    return calculatedNewStock - currentSysStock
  }, [calculatedNewStock, currentSysStock])

  const variancePct = useMemo(() => {
    if (currentSysStock === 0) return variance !== 0 ? 100 : 0
    return ((variance / currentSysStock) * 100).toFixed(1)
  }, [variance, currentSysStock])

  const valuationImpact = useMemo(() => {
    return Math.round(variance * unitCost)
  }, [variance, unitCost])

  const handleMaterialChange = (newMatId: string) => {
    setMaterialId(newMatId)
    const mat = materials.find((m) => m.id === newMatId)
    if (mat) {
      setPhysicalCount(Number(mat.current_stock || 0))
      setDeltaQuantity(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!materialId) {
      setError('Please select a material to adjust.')
      return
    }

    if (!reason || reason.trim().length < 3) {
      setError('A valid audit reason / justification is required for stock adjustment.')
      return
    }

    if (calculatedNewStock < 0) {
      setError('Adjusted stock quantity cannot be negative.')
      return
    }

    if (variance === 0) {
      setError('No variance detected between physical count and system stock. Nothing to adjust.')
      return
    }

    setLoading(true)

    try {
      const fullReason = [
        reason.trim(),
        auditRefNumber ? `Audit Ref: ${auditRefNumber}` : null,
        auditorName ? `Auditor: ${auditorName}` : null,
        notes ? `Note: ${notes}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      const res = await adjustStockAction(
        {
          material_id: materialId,
          location_id: locationId || undefined,
          new_quantity: Number(calculatedNewStock),
          quantity_change: Number(variance),
          reason: fullReason,
          cost_per_unit: unitCost,
          reference_id: auditRefNumber || undefined,
        },
        companyId
      )

      if (!res.success) {
        setError(res.error || 'Failed to record stock adjustment.')
        return
      }

      setSuccessMsg(`Stock successfully adjusted to ${calculatedNewStock} ${activeMaterial?.unit || 'units'}!`)
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
      size="3xl"
      onSubmit={handleSubmit}
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-700 text-white shadow-md flex items-center justify-center font-bold shrink-0">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Physical Count Reconciliation & Adjustment', 'ফিজিক্যাল স্টক গণনা ও সমন্বয়')}
              </h2>
              <Badge
                variant="outline"
                className="text-2xs uppercase font-mono py-0.5 px-2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
              >
                Audit Log
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Reconcile system balance with audited floor physical counts & log variance to immutable ledger',
                'ফিজিক্যাল গোডাউন স্টক যাচাই করে লেজার ব্যালেন্স সমন্বয় ও অডিট ট্রেইল তৈরি'
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
            className={cn(
              'w-full sm:w-auto min-h-[40px] text-xs text-white font-bold px-7 shadow-md cursor-pointer',
              variance > 0
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : variance < 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-slate-700 hover:bg-slate-800'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Applying Adjustment...</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{tBilingual('Post Stock Adjustment', 'স্টক সমন্বয় সংরক্ষণ করুন')}</span>
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

        {/* 3-WAY RECONCILIATION WORKFLOW SELECTOR */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('physical_count')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'physical_count'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Physical Cycle Count', 'ফিজিক্যাল গণনা')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('delta')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'delta'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Scale className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Direct Variance (+/-)', 'পার্থক্য সমন্বয়')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('damage_writeoff')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold transition-all text-center cursor-pointer',
              mode === 'damage_writeoff'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <TrendingDown className="h-4 w-4 shrink-0" />
            <span className="truncate">{tBilingual('Damage Write-off', 'অপচয় বাতিল')}</span>
          </button>
        </div>

        {/* MATERIAL & LOCATION SELECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Material & Warehouse Store Location', 'কাঁচামাল ও গোডাউন')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Select Material Item', 'কাঁচামাল নির্বাচন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                <option value="">-- Choose Material to Reconcile --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.sku}) — System: {m.current_stock} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Store Location', 'গোডাউন লোকেশন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
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

          {/* Configured Roll Sizes Breakdown Display */}
          {stockBreakdown && stockBreakdown.roll_items && stockBreakdown.roll_items.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Active Configured Sizes & SFT Breakdown ({stockBreakdown.purchase_unit_display}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {stockBreakdown.roll_items.map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-2xs font-mono py-1 px-2.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {item.width_ft}ft × {item.length_ft}ft:
                    </span>
                    <span className="font-semibold">{item.roll_count} Roll(s)</span>
                    <span className="text-slate-400 text-2xs">({item.total_sft.toLocaleString()} SFT)</span>
                    {item.purchase_price ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-2xs">
                        @ ৳{item.purchase_price}
                      </span>
                    ) : null}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* VARIANCE CALCULATOR & AUDIT COUNT */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Physical Audit Entry & Variance Calculation', 'গণনাকৃত ব্যালেন্স ও পার্থক্য')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Input field based on mode */}
            {mode === 'physical_count' && (
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Audited Physical Count', 'ফিজিক্যাল গণনা')} ({activeMaterial?.unit || 'units'}){' '}
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(Number(e.target.value))}
                  className="text-xs h-10 font-mono font-bold text-base"
                  required
                />
              </div>
            )}

            {mode === 'delta' && (
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Quantity Adjustment (+/-)', 'স্টক বৃদ্ধি/হ্রাস')} ({activeMaterial?.unit || 'units'}){' '}
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={deltaQuantity}
                  onChange={(e) => setDeltaQuantity(Number(e.target.value))}
                  placeholder="e.g. +5 or -2.5"
                  className="text-xs h-10 font-mono font-bold text-base"
                  required
                />
              </div>
            )}

            {mode === 'damage_writeoff' && (
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Damage Qty to Write-off (-)', 'বাতিলকৃত অপচয়ের পরিমাণ')} ({activeMaterial?.unit || 'units'}){' '}
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  max={currentSysStock}
                  value={deltaQuantity ? Math.abs(deltaQuantity) : ''}
                  onChange={(e) => setDeltaQuantity(-Math.abs(Number(e.target.value)))}
                  placeholder="e.g. 2.0"
                  className="text-xs h-10 font-mono font-bold text-base border-rose-300 dark:border-rose-700 text-rose-600"
                  required
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Current System Balance', 'বর্তমান সিস্টেম স্টক')}
              </Label>
              <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center font-mono font-bold text-slate-800 dark:text-slate-200">
                {currentSysStock} {activeMaterial?.unit || 'units'}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('New Balance Post-Audit', 'সমন্বয় পরবর্তী ব্যালেন্স')}
              </Label>
              <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center font-mono font-black text-slate-900 dark:text-white">
                {calculatedNewStock} {activeMaterial?.unit || 'units'}
              </div>
            </div>
          </div>

          {/* Variance & Financial Impact HUD */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-2xs text-slate-400 block font-semibold uppercase">Quantity Variance:</span>
              <div
                className={cn(
                  'text-base font-black font-mono flex items-center gap-1.5 mt-0.5',
                  variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-rose-600' : 'text-slate-500'
                )}
              >
                {variance > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : variance < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>
                  {variance > 0 ? `+${variance}` : variance} {activeMaterial?.unit || 'units'} ({variancePct}%)
                </span>
              </div>
            </div>

            <div>
              <span className="text-2xs text-slate-400 block font-semibold uppercase">Unit Valuation:</span>
              <div className="text-base font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                {formatBDT(unitCost)} / {activeMaterial?.unit || 'unit'}
              </div>
            </div>

            <div>
              <span className="text-2xs text-slate-400 block font-semibold uppercase">Financial Impact:</span>
              <div
                className={cn(
                  'text-base font-black font-mono mt-0.5',
                  valuationImpact > 0
                    ? 'text-emerald-600'
                    : valuationImpact < 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                )}
              >
                {valuationImpact > 0 ? `+${formatBDT(valuationImpact)} Gain` : valuationImpact < 0 ? `-${formatBDT(Math.abs(valuationImpact))} Loss` : '৳ 0 Net Impact'}
              </div>
            </div>
          </div>
        </div>

        {/* AUDIT REASON & PRESET JUSTIFICATION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <Label className="text-xs font-semibold block">
            {tBilingual('Audit Reason / Root Cause', 'সমন্বয়ের কারণ ও যৌক্তিকতা')} <span className="text-rose-500">*</span>
          </Label>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {AUDIT_REASON_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReason(p.reasonEn)}
                className="text-2xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                🏷️ {p.tag}
              </button>
            ))}
          </div>

          <Input
            placeholder="e.g. Physical inventory cycle count variance / damaged roll written off"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs h-9"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Audited By (Inspector / Keeper)', 'নিরীক্ষক / কর্মকর্তা')}
              </Label>
              <Input
                placeholder="e.g. Tariqul Islam (Store Supervisor)"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Audit Voucher / Sheet Ref #', 'অডিট ভাউচার / রেফারেন্স নং')}
              </Label>
              <Input
                value={auditRefNumber}
                onChange={(e) => setAuditRefNumber(e.target.value)}
                className="text-xs h-9 font-mono bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
