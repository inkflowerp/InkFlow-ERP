'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, AlertCircle, RefreshCw, TrendingUp, Sparkles, Layers, Box, Zap } from 'lucide-react'
import type { AdditionalOptionRecord, ProductRecord } from '@/types/product.types'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'

interface AdditionalOptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  additional?: AdditionalOptionRecord | null
  products?: ProductRecord[]
  onSave: (data: Partial<AdditionalOptionRecord>) => Promise<void>
}

const COMMON_ADDITIONAL_PRESETS = [
  { name: '3mm PVC Sunboard Pasting', name_bn: '৩মিমি পিভিসি সানবোর্ড পেস্টিং', pricing_method: 'sqft', selling_price: 35, cost: 18 },
  { name: '5mm PVC Foam Board Pasting', name_bn: '৫মিমি পিভিসি ফোম বোর্ড পেস্টিং', pricing_method: 'sqft', selling_price: 55, cost: 28 },
  { name: '1" MS Box Pipe Welded Frame', name_bn: '১ ইঞ্চি এমএস বক্স পাইপ ফ্রেম', pricing_method: 'sqft', selling_price: 45, cost: 22 },
  { name: '5mm Clear Acrylic Sandwich Board', name_bn: '৫মিমি এক্রিলিক স্যান্ডউইচ বোর্ড', pricing_method: 'sqft', selling_price: 320, cost: 160 },
  { name: 'X-Stand Display Frame 2×5 ft', name_bn: 'এক্স-স্ট্যান্ড ডিসপ্লে ফ্রেম ২×৫ ফিট', pricing_method: 'per_piece', selling_price: 750, cost: 420 },
]

export function AdditionalOptionModal({
  open,
  onOpenChange,
  additional,
  products = [],
  onSave,
}: AdditionalOptionModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [productId, setProductId] = useState('')
  const [pricingMethod, setPricingMethod] = useState('sqft')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [cost, setCost] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (additional) {
      setName(additional.name || '')
      setNameBn(additional.name_bn || '')
      setProductId(additional.product_id || '')
      setPricingMethod(additional.pricing_method || 'sqft')
      setSellingPrice(String(additional.selling_price || 0))
      setCost(String(additional.cost || 0))
      setIsActive(additional.is_active !== undefined ? additional.is_active : true)
    } else {
      setName('')
      setNameBn('')
      setProductId('')
      setPricingMethod('sqft')
      setSellingPrice('0')
      setCost('0')
      setIsActive(true)
    }
    setError(null)
  }, [additional, open])

  // Live Gross Margin Calculation
  const marginMath = useMemo(() => {
    const sell = Number(sellingPrice) || 0
    const c = Number(cost) || 0
    return calculateGrossMargin(c, sell)
  }, [sellingPrice, cost])

  const consumableMaterials = useMemo(
    () => products.filter((p) => p.product_type === 'material' || (p as any).entity_type === 'material'),
    [products]
  )
  const readyHardware = useMemo(
    () => products.filter((p) => p.product_type !== 'material' && (p as any).entity_type !== 'material'),
    [products]
  )

  const handleProductSelect = (pId: string) => {
    setProductId(pId)
    const selected = products.find((p) => p.id === pId)
    if (selected) {
      if (!name) setName(selected.name)
      if (selected.name_bn && !nameBn) setNameBn(selected.name_bn)
      if (selected.selling_price && Number(selected.selling_price) > 0) {
        setSellingPrice(String(selected.selling_price))
      }
      const unitCost = Number(selected.effective_unit_cost || selected.base_cost || 0)
      if (unitCost > 0) setCost(String(unitCost))
    }
  }

  const handleApplyPreset = (preset: typeof COMMON_ADDITIONAL_PRESETS[0]) => {
    setName(preset.name)
    setNameBn(preset.name_bn)
    setPricingMethod(preset.pricing_method)
    setSellingPrice(String(preset.selling_price))
    setCost(String(preset.cost))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Additional option name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        product_id: productId || undefined,
        pricing_method: pricingMethod,
        selling_price: Number(sellingPrice) || 0,
        cost: Number(cost) || 0,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save additional option')
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 font-bold shrink-0">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {additional ? 'Edit Additional Work' : 'Add Additional Work'}
              </span>
              <Badge variant="outline" className="text-2xs uppercase font-mono py-0.5 px-1.5 bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800">
                Substrate & Addon Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define substrate pastings (PVC Board, Acrylic Mount, Metal Pipe Frame Fabrication).
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
        {!additional && (
          <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                Popular Substrate & Addon Templates:
              </span>
              <span className="text-2xs text-cyan-600 dark:text-cyan-400 font-medium">Click to fill rates</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ADDITIONAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium text-2xs hover:border-cyan-500 hover:text-cyan-600 transition-all cursor-pointer flex items-center gap-1"
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
                Option Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 3mm PVC Board Pasting, MS Pipe Frame"
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
                placeholder="যেমন: ৩মিমি পিভিসি বোর্ড পেস্টিং"
                className="h-9 text-xs font-bengali"
              />
            </div>
          </div>

          {products.length > 0 && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Link with Inventory Substrate / Hardware Item (Optional)
              </Label>
              <select
                value={productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="">-- Standalone Additional (No Catalog Link) --</option>
                {consumableMaterials.length > 0 && (
                  <optgroup label="📦 Consumable Substrates & Raw Materials (Sheets, Boards, Pipes)">
                    {consumableMaterials.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || 'No SKU'}) — Cost: ৳{p.effective_unit_cost || p.base_cost || 0} / {p.selling_unit || 'unit'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {readyHardware.length > 0 && (
                  <optgroup label="🏷️ Reusable Display Hardware & Finished Products (Stands, Frames)">
                    {readyHardware.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || 'No SKU'}) — Sell: ৳{p.selling_price} | Cost: ৳{p.base_cost || 0}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Pricing Method
              </Label>
              <select
                value={pricingMethod}
                onChange={(e) => setPricingMethod(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="sqft">Per Sqft (Board / Sheet Area)</option>
                <option value="per_piece">Per Piece / Unit</option>
                <option value="per_linear_ft">Per Running Foot (Pipe/Profile)</option>
                <option value="fixed">Fixed Flat Price</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Selling Rate (৳)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g. 45.00"
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
                placeholder="e.g. 25.00"
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
                <PlusCircle className="h-4 w-4" />
                <span>{additional ? 'Update Option' : 'Save Additional Option'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
