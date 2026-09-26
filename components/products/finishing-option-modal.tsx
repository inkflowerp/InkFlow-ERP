'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertCircle, RefreshCw, Scissors, TrendingUp, Layers, CheckCircle2, Zap, Cpu } from 'lucide-react'
import type { FinishingOptionRecord, ProductRecord } from '@/types/product.types'
import type { MachineryRecord } from '@/types/machinery.types'
import { calculateGrossMargin } from '@/lib/units'
import { getMaterialUnitDetails } from './service-config-modal'
import { cn } from '@/lib/utils'

interface FinishingOptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  finishing?: FinishingOptionRecord | null
  materials?: ProductRecord[]
  machineries?: MachineryRecord[]
  onSave: (data: Partial<FinishingOptionRecord>) => Promise<void>
}

const COMMON_FINISHING_PRESETS = [
  { name: 'Thermal Glossy Lamination', name_bn: 'থার্মাল গ্লসি ল্যামিনেশন', category: 'lamination', pricing_method: 'sqft', selling_price: 8, cost: 3.5 },
  { name: 'Cold Matte Lamination', name_bn: 'কোল্ড ম্যাট ল্যামিনেশন', category: 'lamination', pricing_method: 'sqft', selling_price: 10, cost: 4.5 },
  { name: '1" Border Hemming & Tape', name_bn: '১ ইঞ্চি বর্ডার হিমিং ও টেপ', category: 'sewing', pricing_method: 'per_linear_ft', selling_price: 2.5, cost: 0.9 },
  { name: 'Heavy-Duty Brass Eyelets', name_bn: 'ব্রাস আইলেট পাঞ্চিং', category: 'hardware', pricing_method: 'per_piece', selling_price: 5, cost: 1.8 },
  { name: 'Ultrasonic Center Seam Welding', name_bn: 'সেন্টার সিম জয়েন্ট ওয়েল্ডিং', category: 'sewing', pricing_method: 'per_linear_ft', selling_price: 4, cost: 1.2 },
  { name: 'Acrylic Edge Diamond Polish', name_bn: 'এক্রিলিক এজ ডায়মন্ড পলিশ', category: 'fabrication', pricing_method: 'per_linear_ft', selling_price: 15, cost: 5 },
]

export function FinishingOptionModal({
  open,
  onOpenChange,
  finishing,
  materials = [],
  machineries = [],
  onSave,
}: FinishingOptionModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [category, setCategory] = useState('lamination')
  const [materialId, setMaterialId] = useState('')
  const [defaultMachineId, setDefaultMachineId] = useState('')
  const [machineHourlyRate, setMachineHourlyRate] = useState('')
  const [pricingMethod, setPricingMethod] = useState('sqft')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [cost, setCost] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (finishing) {
      setName(finishing.name || '')
      setNameBn(finishing.name_bn || '')
      setCategory(finishing.category || 'general')
      setMaterialId(finishing.material_id || '')
      setDefaultMachineId(finishing.default_machine_id || '')
      setMachineHourlyRate(finishing.machine_hourly_rate ? String(finishing.machine_hourly_rate) : '')
      setPricingMethod(finishing.pricing_method || 'sqft')
      setSellingPrice(String(finishing.selling_price || 0))
      setCost(String(finishing.cost || 0))
      setIsActive(finishing.is_active !== undefined ? finishing.is_active : true)
    } else {
      setName('')
      setNameBn('')
      setCategory('lamination')
      setMaterialId('')
      setDefaultMachineId('')
      setMachineHourlyRate('')
      setPricingMethod('sqft')
      setSellingPrice('0')
      setCost('0')
      setIsActive(true)
    }
    setError(null)
  }, [finishing, open])

  // Live Gross Margin Calculation
  const marginMath = useMemo(() => {
    const sell = Number(sellingPrice) || 0
    const c = Number(cost) || 0
    return calculateGrossMargin(c, sell)
  }, [sellingPrice, cost])

  const handleMaterialSelect = (mId: string) => {
    setMaterialId(mId)
    const selected = materials.find((m) => m.id === mId)
    if (selected) {
      if (!name) setName(selected.name)
      if (selected.name_bn && !nameBn) setNameBn(selected.name_bn)
      const { consumeUnit, costVal, isFastener, isInk, isRollMedia, isSheet } = getMaterialUnitDetails(selected as any)
      const unitCost = costVal
      if (unitCost > 0) setCost(String(unitCost))

      const rawSellingPrice =
        (selected as any).selling_price ??
        (selected as any).price ??
        (selected as any).material_config?.selling_price ??
        (selected as any).price_tiers?.retail

      const pUnit = (selected.unit || (selected as any).purchase_unit || (selected as any).selling_unit || '').toLowerCase()
      let unitPrice = unitCost
      if (rawSellingPrice !== undefined && rawSellingPrice !== null && rawSellingPrice !== '' && Number(rawSellingPrice) > 0) {
        const numSp = Number(rawSellingPrice)
        if (isFastener && consumeUnit === 'pcs' && (pUnit === 'box' || pUnit === 'pack') && numSp >= 50) {
          unitPrice = parseFloat((numSp / 1000).toFixed(4))
        } else if (isInk && consumeUnit === 'ml' && numSp >= 50) {
          unitPrice = parseFloat((numSp / 1000).toFixed(4))
        } else {
          unitPrice = numSp
        }
      }
      if (unitPrice > 0) setSellingPrice(String(unitPrice))

      const explicitMethod = ((selected as any).pricing_method || (selected as any).material_config?.pricing_method || '').toLowerCase()
      if (explicitMethod === 'sqft' || explicitMethod === 'per_sqft' || explicitMethod === 'per_area') {
        setPricingMethod('sqft')
      } else if (explicitMethod === 'per_linear_ft' || explicitMethod === 'per_rft' || explicitMethod === 'rft' || explicitMethod === 'per_length') {
        setPricingMethod('per_linear_ft')
      } else if (explicitMethod === 'per_piece' || explicitMethod === 'piece' || explicitMethod === 'pcs' || explicitMethod === 'per_unit') {
        setPricingMethod('per_piece')
      } else if (pUnit === 'meter' || pUnit === 'rft' || pUnit === 'linear_ft' || pUnit === 'inch') {
        setPricingMethod('per_linear_ft')
      } else if (isFastener || consumeUnit === 'pcs' || pUnit === 'piece' || pUnit === 'pcs' || pUnit === 'box' || pUnit === 'pack' || pUnit === 'sheet' || pUnit === 'unit' || pUnit === 'set' || pUnit === 'item') {
        setPricingMethod('per_piece')
      } else if (pUnit === 'sqft' || pUnit === 'sft' || pUnit === 'sqm') {
        setPricingMethod('sqft')
      }
    }
  }

  const handleMachineSelect = (mId: string) => {
    setDefaultMachineId(mId)
    const m = machineries.find((item) => item.id === mId)
    if (m && m.hourly_rate_bdt) {
      setMachineHourlyRate(String(m.hourly_rate_bdt))
    }
  }

  const handleApplyPreset = (preset: typeof COMMON_FINISHING_PRESETS[0]) => {
    setName(preset.name)
    setNameBn(preset.name_bn)
    setCategory(preset.category)
    setPricingMethod(preset.pricing_method)
    setSellingPrice(String(preset.selling_price))
    setCost(String(preset.cost))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Finishing option name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const selectedMachine = machineries.find((m) => m.id === defaultMachineId)
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        category: category.trim() || 'general',
        material_id: materialId || undefined,
        default_machine_id: defaultMachineId || undefined,
        default_machine_name: selectedMachine?.name || undefined,
        default_machine_code: selectedMachine?.code || undefined,
        machine_hourly_rate: Number(machineHourlyRate) || undefined,
        pricing_method: pricingMethod,
        selling_price: Number(sellingPrice) || 0,
        cost: Number(cost) || 0,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save finishing option')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 font-bold shrink-0">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {finishing ? 'Edit Finishing Operation' : 'Add Finishing Operation'}
              </span>
              <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-1.5 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                Post-Press Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define post-press operations (Lamination, Eyelets, Hemming, Creasing, Seam Welding).
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Presets Picker */}
        {!finishing && (
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Popular Finishing Templates:
              </span>
              <span className="text-2xs text-purple-600 dark:text-purple-400 font-medium">Click to fill rates</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_FINISHING_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium text-2xs hover:border-purple-500 hover:text-purple-600 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Finishing Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Glossy Lamination, Eyelet Punching"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Name (Bengali)
              </Label>
              <Input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: গ্লসি লেমিনেশন, আইলেট পাঞ্চ"
                className="h-9 text-xs font-bengali"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Category
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="lamination">Lamination / Coating (Consumable Film)</option>
                <option value="hardware">Hardware / Eyelet / Rings (Consumable Fastener)</option>
                <option value="sewing">Sewing / Hemming / Rope (Labor + Consumable Tape)</option>
                <option value="cutting">Cutting / Die Cut / Creasing</option>
                <option value="fabrication">Fabrication / Framing</option>
                <option value="general">General Finishing</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Pricing Basis / Unit
              </Label>
              <select
                value={pricingMethod}
                onChange={(e) => setPricingMethod(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="sqft">Per Sqft (Area based)</option>
                <option value="per_piece">Per Piece / Unit</option>
                <option value="per_linear_ft">Per Running Foot (Perimeter)</option>
                <option value="fixed">Fixed Price per Job</option>
                <option value="percentage">Percentage Markup</option>
              </select>
            </div>
          </div>

          {materials.length > 0 && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Link with Consumable Inventory Material (Optional)
              </Label>
              <select
                value={materialId}
                onChange={(e) => handleMaterialSelect(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="">-- Standalone Operation (No Raw Material Link) --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.sku || 'No SKU'}) — Unit Cost: ৳{m.effective_unit_cost || m.base_cost || 0} / {m.selling_unit || 'unit'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fleet Machinery Linkage */}
          {machineries.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  Fleet Finishing Equipment / Machine
                </Label>
                <span className="text-2xs text-slate-500 font-medium">Auto-fills hourly rate</span>
              </div>
              <select
                value={defaultMachineId}
                onChange={(e) => handleMachineSelect(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="">-- Manual / Hand Finishing (No Machine) --</option>
                {machineries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code || 'NO-CODE'}) — {m.category} • Rate: ৳{m.hourly_rate_bdt || 0}/hr
                  </option>
                ))}
              </select>

              {defaultMachineId && (
                <div className="pt-1">
                  <Label className="text-2xs text-slate-500 mb-1 block">Machine Hourly Rate (৳/hr)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={machineHourlyRate}
                    onChange={(e) => setMachineHourlyRate(e.target.value)}
                    placeholder="e.g. 400"
                    className="h-8 text-xs font-mono font-bold text-purple-600 dark:text-purple-400"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Selling Rate (৳)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g. 15.00"
                className="h-9 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Direct Unit Cost (৳)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 7.00"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Live Margin Calculation Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gross Profit: <span className="font-mono font-bold text-slate-900 dark:text-white">৳{marginMath.grossProfit.toFixed(2)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-slate-500">Margin:</span>
              <Badge
                variant="outline"
                className={cn(
                  'font-mono font-bold text-xs py-0.5 px-2',
                  marginMath.grossMarginPercent >= 30
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : marginMath.grossMarginPercent >= 15
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                )}
              >
                {marginMath.grossMarginPercent.toFixed(1)}%
              </Badge>
            </div>
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Active for quotation and service configuration</span>
            </label>
          </div>
        </div>

        {/* Standardized Bottom Action Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Option...</span>
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4" />
                <span>{finishing ? 'Update Option' : 'Save Finishing Option'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
