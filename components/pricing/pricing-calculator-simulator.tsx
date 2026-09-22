'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Calculator,
  Sliders,
  Sparkles,
  Layers,
  Tag,
  Coins,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Wrench,
  Printer,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { ProductRecord, FinishingOptionRecord, PrintingMethod } from '@/types/product.types'
import { CUSTOMER_TYPES_META, PricingCustomerType } from '@/types/pricing.types'
import { formatBDT } from '@/lib/formatters'

interface PricingCalculatorSimulatorProps {
  products: ProductRecord[]
  finishingOptions: FinishingOptionRecord[]
  printingMethods: PrintingMethod[]
  tenantSlug: string
  initialProductId?: string
}

export function PricingCalculatorSimulator({
  products,
  finishingOptions,
  printingMethods,
  tenantSlug,
  initialProductId,
}: PricingCalculatorSimulatorProps) {
  const { tBilingual } = useI18n()
  const pathname = usePathname()

  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      return initialProductId
    }
    return products[0]?.id || ''
  })
  const [customerType, setCustomerType] = useState<PricingCustomerType>('retail')
  const [widthFt, setWidthFt] = useState<number>(4)
  const [heightFt, setHeightFt] = useState<number>(3)
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedPrintingMethodId, setSelectedPrintingMethodId] = useState<string>('')
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([])

  // Keep selectedProductId in sync if initialProductId changes
  React.useEffect(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      setSelectedProductId(initialProductId)
    }
  }, [initialProductId, products])

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null
  }, [products, selectedProductId])

  const isAreaBased = useMemo(() => {
    if (!selectedProduct) return true
    const method = (selectedProduct.pricing_method || '').toLowerCase()
    const unit = (selectedProduct.unit || selectedProduct.selling_unit || '').toLowerCase()
    return (
      method === 'per_sft' ||
      method === 'per_area' ||
      method === 'dimensional_area' ||
      method === 'per_sqft' ||
      unit === 'sft' ||
      unit === 'sqft' ||
      unit === 'sqm' ||
      unit === 'sq.ft' ||
      unit === 'square_feet'
    )
  }, [selectedProduct])

  const toggleFinishing = (id: string) => {
    setSelectedFinishingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Simulation Calculations
  const simulation = useMemo(() => {
    if (!selectedProduct) {
      return {
        areaPerUnit: 0,
        totalArea: 0,
        baseUnitPrice: 0,
        tierUnitPrice: 0,
        baseMediaCost: 0,
        machineSurcharge: 0,
        finishingTotal: 0,
        totalClientPrice: 0,
        estimatedBOMCost: 0,
        grossProfit: 0,
        marginPct: 0,
      }
    }

    const areaPerUnit = isAreaBased ? Math.max(0.01, widthFt * heightFt) : 1
    const totalAreaOrQty = (isAreaBased ? areaPerUnit : 1) * Math.max(1, quantity)

    // Base price per unit (sft or piece)
    const baseSellingRate = Number(selectedProduct.selling_price) || Number((selectedProduct as any).base_price) || 0
    const baseCostRate = Number(selectedProduct.base_cost) || Number((selectedProduct as any).cost_price) || 0

    // Resolve Customer Tier Price with robust fallback mapping
    const tiers = (selectedProduct.price_tiers as any) || {}
    let tierUnitPrice = tiers[customerType]
    if (tierUnitPrice === undefined || tierUnitPrice === null || isNaN(Number(tierUnitPrice))) {
      const cType = customerType as string
      if (cType === 'reseller' && tiers.dealer !== undefined) tierUnitPrice = Number(tiers.dealer)
      else if (cType === 'agency' && (tiers.dealer !== undefined || tiers.wholesale !== undefined)) {
        tierUnitPrice = Number(tiers.wholesale ?? tiers.dealer)
      } else if (cType === 'corporate' && tiers.corporate_price !== undefined) {
        tierUnitPrice = Number(tiers.corporate_price)
      } else {
        tierUnitPrice = baseSellingRate
      }
    } else {
      tierUnitPrice = Number(tierUnitPrice)
    }

    // Apply minimum billable area / charge
    const minBillable = Number(selectedProduct.min_billable_quantity) || Number(selectedProduct.service_config?.min_billable_qty) || 0
    let effectiveBillableArea = totalAreaOrQty
    if (isAreaBased && minBillable > 0 && totalAreaOrQty < minBillable) {
      effectiveBillableArea = minBillable
    }

    let mediaProductTotal = tierUnitPrice * effectiveBillableArea

    // Machine Surcharge
    let machineSurcharge = 0
    const machine = printingMethods.find((m) => m.id === selectedPrintingMethodId)
    if (machine) {
      const rate = Number(machine.cost_per_sqft) || Number((machine as any).base_cost_per_unit) || 0
      machineSurcharge = rate * totalAreaOrQty
    }

    // Finishing Surcharges
    let finishingTotal = 0
    let finishingCost = 0
    selectedFinishingIds.forEach((finId) => {
      const fin = finishingOptions.find((f) => f.id === finId)
      if (fin) {
        const rate = Number(fin.selling_price) || Number((fin as any).price_per_unit) || 0
        const cost = Number(fin.cost) || Number((fin as any).cost_per_unit) || 0
        const method = fin.pricing_method || 'sqft'

        if (method === 'per_piece' || method === 'piece') {
          finishingTotal += rate * quantity * 4 // e.g. 4 eyelets or edge loops
          finishingCost += cost * quantity * 4
        } else if (method === 'sqft' || method === 'sft' || method === 'per_sqft') {
          finishingTotal += rate * totalAreaOrQty
          finishingCost += cost * totalAreaOrQty
        } else if (method === 'per_linear_ft' || method === 'rft' || method === 'perimeter') {
          const perimeter = (widthFt + heightFt) * 2 * quantity
          finishingTotal += rate * perimeter
          finishingCost += cost * perimeter
        } else {
          finishingTotal += rate * quantity
          finishingCost += cost * quantity
        }
      }
    })

    let subtotal = mediaProductTotal + machineSurcharge + finishingTotal

    // Minimum charge check
    const minChargeVal = Number(selectedProduct.minimum_charge) || Number(selectedProduct.service_config?.min_charge) || Number(selectedProduct.service_config?.minimum_charge) || 0
    if (minChargeVal > 0 && subtotal < minChargeVal) {
      subtotal = minChargeVal
    }

    // Cost Calculation
    const estimatedBOMCost = baseCostRate * totalAreaOrQty + finishingCost
    const grossProfit = Math.max(0, subtotal - estimatedBOMCost)
    const marginPct = subtotal > 0 ? Math.round((grossProfit / subtotal) * 100) : 0

    return {
      areaPerUnit,
      totalArea: totalAreaOrQty,
      baseUnitPrice: baseSellingRate,
      tierUnitPrice,
      baseMediaCost: mediaProductTotal,
      machineSurcharge,
      finishingTotal,
      totalClientPrice: subtotal,
      estimatedBOMCost,
      grossProfit,
      marginPct,
    }
  }, [
    selectedProduct,
    isAreaBased,
    customerType,
    widthFt,
    heightFt,
    quantity,
    selectedPrintingMethodId,
    selectedFinishingIds,
    printingMethods,
    finishingOptions,
  ])

  // Save calculated estimate to sessionStorage for auto-prefilling in New Quotation Modal
  const handleSaveToQuoteSession = () => {
    if (typeof window === 'undefined' || !selectedProduct) return

    const prefillData = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      customerType: customerType,
      width: isAreaBased ? widthFt : '',
      height: isAreaBased ? heightFt : '',
      dimensionUnit: 'ft',
      quantity: Math.max(1, quantity),
      unit: selectedProduct.unit || (isAreaBased ? 'sft' : 'pcs'),
      unitRate: simulation.tierUnitPrice,
      baseRate: simulation.baseUnitPrice,
      machineMethodId: selectedPrintingMethodId,
      finishingIds: selectedFinishingIds,
      totalEstimated: simulation.totalClientPrice,
      grossProfit: simulation.grossProfit,
      marginPct: simulation.marginPct,
      timestamp: Date.now(),
    }

    try {
      sessionStorage.setItem('printerp_estimator_prefill', JSON.stringify(prefillData))
    } catch (e) {
      console.warn('[Estimator] Failed to store quote prefill:', e)
    }
  }

  // Product category groupings for select
  const digitalProducts = useMemo(() => products.filter((p) => p.product_type === 'print_service' || p.category === 'flex_banner' || p.category === 'vinyl_sticker' || p.category === 'banner' || p.unit === 'sft'), [products])
  const signageProducts = useMemo(() => products.filter((p) => p.category === 'signage_3d' || p.product_type === 'fabrication_service'), [products])
  const readyHardware = useMemo(() => products.filter((p) => p.product_type === 'ready_product' || p.unit === 'pcs' || p.unit === 'set'), [products])
  const rawMaterials = useMemo(() => products.filter((p) => p.product_type === 'material' || p.unit === 'roll'), [products])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: JOB & TARIFF CONFIGURATION PANEL */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Commercial Job Specification', 'বাণিজ্যিক কাজের স্পেসিফিকেশন')}
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-bold bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300">
              Live Estimator
            </Badge>
          </div>

          {/* Product / Service Picker */}
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              {tBilingual('Select Product / Print Service', 'প্রোডাক্ট বা প্রিন্টিং সেবা নির্বাচন করুন')}
            </Label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold"
            >
              {digitalProducts.length > 0 && (
                <optgroup label="🎨 Digital & Large Format Print Services">
                  {digitalProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit?.toUpperCase() || 'SFT'} • Base ৳{p.selling_price || (p as any).base_price || 0})
                    </option>
                  ))}
                </optgroup>
              )}
              {signageProducts.length > 0 && (
                <optgroup label="💡 3D Signage & Fabrication Services">
                  {signageProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit?.toUpperCase() || 'SFT'} • Base ৳{p.selling_price || (p as any).base_price || 0})
                    </option>
                  ))}
                </optgroup>
              )}
              {readyHardware.length > 0 && (
                <optgroup label="📦 Ready Merchandise & Hardware">
                  {readyHardware.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit?.toUpperCase() || 'PCS'} • Base ৳{p.selling_price || (p as any).base_price || 0})
                    </option>
                  ))}
                </optgroup>
              )}
              {rawMaterials.length > 0 && (
                <optgroup label="🧵 Raw Materials & Rolls">
                  {rawMaterials.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit?.toUpperCase() || 'ROLL'} • Base ৳{p.selling_price || (p as any).base_price || 0})
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Fallback un-grouped */}
              {digitalProducts.length === 0 && signageProducts.length === 0 && readyHardware.length === 0 && rawMaterials.length === 0 && (
                products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit?.toUpperCase()} • Base ৳{p.selling_price || (p as any).base_price || 0})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Customer Category Tier */}
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              {tBilingual('Customer Pricing Category Tier', 'গ্রাহক ক্যাটাগরি ও বিশেষ রেট')}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => {
                const isSelected = customerType === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCustomerType(key as PricingCustomerType)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 dark:bg-teal-950/60 ring-1 ring-teal-500 shadow-xs font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-teal-700 dark:text-teal-400 truncate font-medium">
                      {meta.labelBn}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dimensions & Quantity */}
          {isAreaBased ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Width (Feet)', 'প্রস্থ (ফিট)')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={widthFt}
                  onChange={(e) => setWidthFt(Math.max(0.1, Number(e.target.value) || 0))}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Height (Feet)', 'উচ্চতা (ফিট)')}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={heightFt}
                  onChange={(e) => setHeightFt(Math.max(0.1, Number(e.target.value) || 0))}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Quantity (Pieces)', 'পরিমাণ (পিস)')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Billing Unit</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase font-mono">
                    Per {selectedProduct?.unit || 'Piece'} (Fixed Unit)
                  </span>
                </div>
                <Badge variant="outline" className="text-[11px] font-medium text-slate-600 bg-white dark:bg-slate-800">
                  No Dimensions Needed
                </Badge>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual(`Order Quantity (${selectedProduct?.unit || 'Pcs'})`, `অর্ডার পরিমাণ (${selectedProduct?.unit || 'পিস'})`)}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs h-10 font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Machine Printing Method */}
          {printingMethods.length > 0 && (
            <div className="pt-2">
              <Label className="text-xs font-bold mb-1.5 block">
                {tBilingual('Machine Printing Method (Resolution Surcharge)', 'প্রিন্টিং মেথড ও রেজোলিউশন')}
              </Label>
              <select
                value={selectedPrintingMethodId}
                onChange={(e) => setSelectedPrintingMethodId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="">-- Standard Default Print Mode (No Surcharge) --</option>
                {printingMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (+ ৳{m.cost_per_sqft || (m as any).base_cost_per_unit || 0}/sft)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Finishing Options Selection */}
          {finishingOptions.length > 0 && (
            <div className="pt-2">
              <Label className="text-xs font-bold mb-1.5 block">
                {tBilingual('Finishing, Mounting & Fabrication Options', 'ফিনিশিং ও পোস্ট-প্রেস অপশন')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {finishingOptions.map((fin) => {
                  const isChecked = selectedFinishingIds.includes(fin.id)
                  return (
                    <button
                      key={fin.id}
                      type="button"
                      onClick={() => toggleFinishing(fin.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/50 ring-1 ring-teal-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {fin.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          + ৳{fin.selling_price || (fin as any).price_per_unit || 0} / {fin.pricing_method || 'sft'}
                        </div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* RIGHT: REAL-TIME PRICING BREAKDOWN & MARGIN HUD */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="rounded-xl shadow-md border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">
                {tBilingual('Calculated Commercial Tariff', 'গণনাকৃত বাণিজ্যিক মূল্য')}
              </span>
              <div className="text-3xl font-black font-mono text-white mt-0.5">
                {formatBDT(simulation.totalClientPrice)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Gross Margin</span>
              <div
                className={`text-lg font-black font-mono ${
                  simulation.marginPct >= 35 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {simulation.marginPct}%
              </div>
            </div>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">
                {isAreaBased ? 'Total Billable Area:' : 'Total Billable Quantity:'}
              </span>
              <span className="font-mono font-bold text-slate-200">
                {isAreaBased
                  ? `${simulation.totalArea.toFixed(1)} sft (${quantity} pcs)`
                  : `${quantity} ${selectedProduct?.unit || 'pcs'}`}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Resolved Tier Rate ({customerType.toUpperCase()}):</span>
              <span className="font-mono font-bold text-teal-300">
                {formatBDT(simulation.tierUnitPrice)} / {isAreaBased ? 'sft' : (selectedProduct?.unit || 'pcs')}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Base Print Substrate:</span>
              <span className="font-mono text-slate-200">{formatBDT(simulation.baseMediaCost)}</span>
            </div>

            {simulation.machineSurcharge > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Machine Method Surcharge:</span>
                <span className="font-mono text-slate-200">{formatBDT(simulation.machineSurcharge)}</span>
              </div>
            )}

            {simulation.finishingTotal > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Finishing & Fabrication:</span>
                <span className="font-mono text-slate-200">{formatBDT(simulation.finishingTotal)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Estimated Raw Material Cost:</span>
              <span className="font-mono text-slate-400">{formatBDT(simulation.estimatedBOMCost)}</span>
            </div>

            <div className="flex justify-between py-1 pt-1.5 text-sm font-bold">
              <span className="text-emerald-400">Estimated Net Gross Profit:</span>
              <span className="font-mono text-emerald-400">{formatBDT(simulation.grossProfit)}</span>
            </div>
          </div>

          {/* Action to convert to Quote */}
          <div className="pt-2 border-t border-slate-800">
            <Button
              asChild
              onClick={handleSaveToQuoteSession}
              className="w-full h-10 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer"
            >
              <Link href={getTenantNavHref('/quotations?new=true', pathname, tenantSlug)}>
                <span>{tBilingual('Create Quotation with this Tariff', 'এই দর দিয়ে কোটেশন তৈরি করুন')}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
