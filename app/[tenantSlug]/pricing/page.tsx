'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Calculator,
  Layers,
  Sparkles,
  Scissors,
  Truck,
  Wrench,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Receipt,
  RotateCcw,
  ShieldAlert,
  FileSpreadsheet,
  Sliders,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { calculateJobPricing } from '@/lib/pricing-engine'
import { PricingCalculationInput, PriceOverrideRecord, ProductRecord } from '@/types/product.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT } from '@/lib/formatters'

const DEFAULT_PRODUCT_TEMPLATE: ProductRecord = {
  id: 'custom-print',
  company_id: 'default',
  name: 'Custom Print Job',
  name_bn: 'কাস্টম প্রিন্টিং',
  sku: 'CUSTOM-PRINT',
  category: 'custom_job',
  product_type: 'custom_job',
  unit: 'sft',
  material_spec: 'Standard Print Media',
  description: 'Dynamic dimensional pricing calculation template',
  base_cost: 30,
  selling_price: 50,
  min_price: 35,
  tax_rate: 7.5,
  pricing_formula: {
    model: 'dimensional_area',
    material_rate: 18,
    print_rate: 12,
    cutting_rate: 5,
    lamination_rate: 8,
    finishing_rate: 3,
    fabrication_rate: 15,
    labor_rate: 5,
    installation_rate: 10,
    transport_rate: 500,
    default_margin_percent: 40.0,
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default function PricingCalculatorPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [products] = useDataStore<ProductRecord[]>(STORAGE_KEYS.PRODUCTS, [])

  // Selected preset product
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const activeProduct: ProductRecord =
    (products || []).find((p) => p.id === selectedProductId) ||
    products?.[0] ||
    DEFAULT_PRODUCT_TEMPLATE

  // Dimensional Inputs
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const [dimensionUnit, setDimensionUnit] = useState<'ft' | 'inch' | 'm'>('ft')
  const [quantity, setQuantity] = useState<number>(1)

  // Component Toggles
  const [includeLamination, setIncludeLamination] = useState(false)
  const [includeCutting, setIncludeCutting] = useState(false)
  const [includeFinishing, setIncludeFinishing] = useState(true)
  const [includeFabrication, setIncludeFabrication] = useState(false)
  const [includeInstallation, setIncludeInstallation] = useState(false)
  const [includeTransport, setIncludeTransport] = useState(false)

  // Margin & Discount
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [discountFlat, setDiscountFlat] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(7.5)

  // Custom Price Override Modal
  const [isOverrideOpen, setIsOverrideOpen] = useState(false)
  const [overridePrice, setOverridePrice] = useState<number>(0)
  const [overrideReason, setOverrideReason] = useState<string>('')
  const [appliedOverride, setAppliedOverride] = useState<PriceOverrideRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Live Formula Calculation via Safe Pricing Engine
  const pricingResult = useMemo(() => {
    const formula = activeProduct?.pricing_formula || {
      model: 'dimensional_area',
      material_rate: (activeProduct?.base_cost || 30) * 0.6,
      print_rate: (activeProduct?.base_cost || 30) * 0.4,
      default_margin_percent: 45.0,
    }

    const input: PricingCalculationInput = {
      width,
      height,
      dimensionUnit,
      quantity,
      includeLamination,
      includeCutting,
      includeFinishing,
      includeFabrication,
      includeInstallation,
      includeTransport,
      discountPercent,
      discountFlat,
      vatRatePercent: vatRate,
    }

    return calculateJobPricing(formula, input, activeProduct?.min_price || 0)
  }, [
    activeProduct,
    width,
    height,
    dimensionUnit,
    quantity,
    includeLamination,
    includeCutting,
    includeFinishing,
    includeFabrication,
    includeInstallation,
    includeTransport,
    discountPercent,
    discountFlat,
    vatRate,
  ])

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault()
    const record: PriceOverrideRecord = {
      id: `po-${Date.now()}`,
      company_id: company?.id || 'c-01',
      product_id: activeProduct?.id || 'custom-print',
      original_price: pricingResult.grandTotalBDT,
      override_price: Number(overridePrice),
      reason: overrideReason,
      authorized_by_name: 'Current Authenticated User',
      created_at: new Date().toISOString(),
    }
    setAppliedOverride(record)
    setIsOverrideOpen(false)
    showNotification(`Custom price override of ৳ ${record.override_price} applied and logged to audit table.`)
  }

  const handleCopyBreakdown = () => {
    const text = `PrintERP Price Estimation
Item: ${activeProduct?.name || 'Custom Print Job'}
Dimensions: ${width} × ${height} ${dimensionUnit} (${pricingResult.areaSft} sft, Qty: ${quantity})
Total Base Cost: ৳ ${pricingResult.totalBaseCost}
Gross Profit (${pricingResult.grossProfitMarginPercent}%): ৳ ${pricingResult.grossProfitAmount}
Subtotal: ৳ ${pricingResult.subtotalAfterDiscount}
VAT (${pricingResult.vatRatePercent}%): ৳ ${pricingResult.vatAmount}
Final Price: ৳ ${appliedOverride ? appliedOverride.override_price : pricingResult.grandTotalBDT}`

    navigator.clipboard.writeText(text)
    showNotification('Complete pricing breakdown copied to clipboard!')
  }

  const finalPayable = appliedOverride ? appliedOverride.override_price : pricingResult.grandTotalBDT

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Live Dimensional Pricing Engine"
        titleBn="লাইভ পরিমাপ ও দর নির্ধারণ ইঞ্জিন"
        descriptionEn="Calculate accurate square-foot rates, cutting, lamination, fabrication, labor, and NBR VAT in real-time."
        descriptionBn="স্কয়ার ফিট রেট, কাটিং, লেমিনেশন, ফেব্রিকেশন, লেবার মজুরি এবং এনবিআর ভ্যাট রিয়েল-টাইমে হিসাব করুন।"
        icon={Calculator}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={handleCopyBreakdown} className="text-xs bangla-text">
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Copy Breakdown', 'হিসাব কপি')}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setOverridePrice(pricingResult.grandTotalBDT)
                setIsOverrideOpen(true)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-xs text-white bangla-text"
            >
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Price Override', 'বিশেষ মূল্য ছাড়')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Grid: Inputs on Left (7 cols), Live Price Waterfall on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: CONFIGURATION INPUTS */}
        <div className="lg:col-span-7 space-y-5">
          {/* Preset Product Selector */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Product / Service Template
              </Label>
              <Link href={`/${slug}/products`} className="text-xs text-blue-600 hover:underline">
                Manage Catalog →
              </Link>
            </div>

            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id)
                      setAppliedOverride(null)
                      // adjust defaults
                      if (p.category === 'vinyl_sticker') {
                        setIncludeCutting(true)
                        setIncludeLamination(true)
                        setIncludeFinishing(false)
                      } else if (p.category === 'signage_3d') {
                        setIncludeFabrication(true)
                        setIncludeInstallation(true)
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeProduct.id === p.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{p.material_spec || 'Standard Media'}</div>
                    <div className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      Base: ৳{p.base_cost} • Sell: ৳{p.selling_price}/{p.unit}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Custom SFT Pricing Mode Active
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Live dynamic square footage, labor, finishing, and NBR VAT calculator.
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                  Generic Preset
                </Badge>
              </div>
            )}
          </Card>

          {/* Measurements: Width, Height, Unit, Quantity */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Job Dimensions & Run Quantity
              </span>
              <span className="text-xs font-mono font-bold text-blue-600">
                Total Area: {pricingResult.areaSft} sft
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="width">Width (প্রস্থ)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(Math.max(0.1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="height">Height (উচ্চতা)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(Math.max(0.1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  value={dimensionUnit}
                  onChange={(e) => setDimensionUnit(e.target.value as typeof dimensionUnit)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="ft">Feet (ফুট)</option>
                  <option value="inch">Inches (ইঞ্চি)</option>
                  <option value="m">Meters (মিটার)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qty">Quantity (পরিমাণ)</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          </Card>

          {/* Pricing Components Checkboxes */}
          <Card className="p-4 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Add-on Components & Shop Floor Finishing
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCutting}
                  onChange={(e) => setIncludeCutting(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">Die-Cutting / Laser Cut</div>
                  <div className="text-[11px] text-slate-400">Contour plotting and kiss-cut stickers</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLamination}
                  onChange={(e) => setIncludeLamination(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">Thermal Lamination</div>
                  <div className="text-[11px] text-slate-400">Optical Gloss or Matte protection film</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFinishing}
                  onChange={(e) => setIncludeFinishing(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">Eyelets & Hemming</div>
                  <div className="text-[11px] text-slate-400">Welded hem borders and metal brass rings</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFabrication}
                  onChange={(e) => setIncludeFabrication(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">MS Box Metal Framing</div>
                  <div className="text-[11px] text-slate-400">Welded 1-inch box pipe structure</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInstallation}
                  onChange={(e) => setIncludeInstallation(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">On-Site Installation Crew</div>
                  <div className="text-[11px] text-slate-400">Ladder, drilling, scaffolding & wiring</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTransport}
                  onChange={(e) => setIncludeTransport(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">Delivery Van Transport</div>
                  <div className="text-[11px] text-slate-400">Local pickup van within Dhaka Metro</div>
                </div>
              </label>
            </div>
          </Card>

          {/* Discounts & VAT */}
          <Card className="p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Discount & Tax Concessions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="discPct">Discount %</Label>
                <Input
                  id="discPct"
                  type="number"
                  placeholder="0"
                  value={discountPercent || ''}
                  onChange={(e) => setDiscountPercent(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discFlat">Flat Discount (৳ BDT)</Label>
                <Input
                  id="discFlat"
                  type="number"
                  placeholder="0"
                  value={discountFlat || ''}
                  onChange={(e) => setDiscountFlat(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vatR">NBR VAT Rate %</Label>
                <Input
                  id="vatR"
                  type="number"
                  step="0.5"
                  value={vatRate}
                  onChange={(e) => setVatRate(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT PANEL: LIVE PRICING WATERFALL BREAKDOWN */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-blue-200 dark:border-blue-900 shadow-md">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                    Official Quotation Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activeProduct.name} ({quantity} {activeProduct.unit})
                  </CardDescription>
                </div>
                {pricingResult.isBelowMinimum && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Below Floor Price
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Applied Price Override Alert */}
              {appliedOverride && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-300 text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Custom Price Override Active:</strong> ৳ {formatBDT(appliedOverride.override_price)}
                    <div className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                      Reason: {appliedOverride.reason}
                    </div>
                    <button
                      onClick={() => setAppliedOverride(null)}
                      className="text-[11px] underline font-bold mt-1 text-purple-800 dark:text-purple-300"
                    >
                      Reset to Calculated Price
                    </button>
                  </div>
                </div>
              )}

              {/* 13-Component Waterfall */}
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                  Cost Component Waterfall (উৎপাদন খরচ)
                </span>

                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                  <span>1. Media Material:</span>
                  <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.material)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                  <span>2. Printing Service:</span>
                  <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.printing)}</span>
                </div>

                {pricingResult.componentBreakdown.cutting > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>3. Die-Cut Plotting:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.cutting)}</span>
                  </div>
                )}

                {pricingResult.componentBreakdown.lamination > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>4. Thermal Lamination:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.lamination)}</span>
                  </div>
                )}

                {pricingResult.componentBreakdown.finishing > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>5. Eyelets & Hemming:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.finishing)}</span>
                  </div>
                )}

                {pricingResult.componentBreakdown.fabrication > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>6. MS Frame Fabrication:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.fabrication)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                  <span>7. Machine Operator Labor:</span>
                  <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.labor)}</span>
                </div>

                {pricingResult.componentBreakdown.installation > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>8. On-site Installation:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.installation)}</span>
                  </div>
                )}

                {pricingResult.componentBreakdown.transport > 0 && (
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                    <span>9. Van Fare Logistics:</span>
                    <span className="font-mono font-medium">৳ {formatBDT(pricingResult.componentBreakdown.transport)}</span>
                  </div>
                )}

                {/* Subtotal Base Cost */}
                <div className="flex justify-between py-1.5 font-bold border-t border-dashed border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                  <span>Total Base Cost (COGS):</span>
                  <span className="font-mono">৳ {formatBDT(pricingResult.totalBaseCost)}</span>
                </div>

                {/* Gross Profit Margin */}
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Gross Profit ({pricingResult.grossProfitMarginPercent}%):</span>
                  <span className="font-mono">+ ৳ {formatBDT(pricingResult.grossProfitAmount)}</span>
                </div>
              </div>

              {/* Discounts & VAT */}
              <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                {pricingResult.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-red-600 font-medium">
                    <span>Concession Discount:</span>
                    <span className="font-mono">- ৳ {formatBDT(pricingResult.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Taxable Amount:</span>
                  <span className="font-mono">৳ {formatBDT(pricingResult.subtotalAfterDiscount)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                  <span>NBR VAT ({pricingResult.vatRatePercent}%):</span>
                  <span className="font-mono">+ ৳ {formatBDT(pricingResult.vatAmount)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Payable Amount (মোট মূল্য)
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-300">
                    ৳ {formatBDT(finalPayable)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Unit Rate:</div>
                  <div className="text-sm font-mono font-bold text-white">
                    ৳ {formatBDT(Math.round(finalPayable / quantity))} / {activeProduct.unit}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2.5">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Save as Official Quotation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: CUSTOM PRICE OVERRIDE WITH AUDIT LOGGING */}
      <ModalDialog
        open={isOverrideOpen}
        onOpenChange={setIsOverrideOpen}
        title="Apply Custom Price Override"
        description="Manually adjust quoted rate. System requires an audit reason for compliance."
      >
        <form onSubmit={handleApplyOverride} className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <div className="flex justify-between">
              <span>Calculated Price:</span>
              <strong>৳ {formatBDT(pricingResult.grandTotalBDT)}</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span>Minimum Floor Price:</span>
              <strong className="text-red-600">৳ {formatBDT(activeProduct.min_price * quantity)}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ovPrice" required>Override Final Total (৳ BDT)</Label>
            <Input
              id="ovPrice"
              type="number"
              value={overridePrice || ''}
              onChange={(e) => setOverridePrice(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ovReason" required>Mandatory Audit Reason</Label>
            <textarea
              id="ovReason"
              rows={3}
              placeholder="e.g. Managing Director approved strategic discount for Beximco annual tender."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsOverrideOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Log Override & Apply
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
