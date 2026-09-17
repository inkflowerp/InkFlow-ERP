'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Sliders,
  AlertCircle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Tag,
  Percent,
  Coins,
  Info,
  Layers,
} from 'lucide-react'
import type { ProductRecord, UnitOfMeasure, ProductPriceTiers } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'
import { formatBDT } from '@/lib/formatters'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'

interface ReadyProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (productData: Partial<ProductRecord>) => Promise<void>
  initialData?: ProductRecord | null
  categories?: ProductCategoryRecord[]
}

const READY_PRODUCT_UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'piece', label: 'Piece (পিস)' },
  { value: 'set', label: 'Set (সেট)' },
  { value: 'pack', label: 'Pack (প্যাক)' },
  { value: 'box', label: 'Box (বক্স)' },
  { value: 'item', label: 'Item (আইটেম)' },
  { value: 'roll', label: 'Roll (রোল)' },
  { value: 'liter', label: 'Liter (লিটার)' },
  { value: 'kg', label: 'KG (কেজি)' },
  { value: 'meter', label: 'Meter (মিটার)' },
]

export function ReadyProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: ReadyProductModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing'>('basic')

  // Tab 1: Basic Identity & Inventory
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('ready_products')
  const [unit, setUnit] = useState<UnitOfMeasure>('piece')
  const [purchaseUnit, setPurchaseUnit] = useState<string>('piece')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')
  const [minOrderQty, setMinOrderQty] = useState<number>(1)
  const [minBillableQty, setMinBillableQty] = useState<number>(1)

  // Tab 2: Pricing, Margins & Customer Tiers
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [baseCost, setBaseCost] = useState<number | ''>('')
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [targetMargin, setTargetMargin] = useState<number>(35)
  const [minAllowedMargin, setMinAllowedMargin] = useState<number>(15)
  const [vatApplicable, setVatApplicable] = useState(false)
  const [isTaxInclusive, setIsTaxInclusive] = useState(false)
  const [taxRate, setTaxRate] = useState<number>(7.5)
  const [allowManualOverride, setAllowManualOverride] = useState(true)

  // Multi-tier customer prices
  const [priceTiers, setPriceTiers] = useState<{
    retail: number | ''
    corporate: number | ''
    dealer: number | ''
    wholesale: number | ''
    custom: number | ''
  }>({
    retail: '',
    corporate: '',
    dealer: '',
    wholesale: '',
    custom: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'ready_products')
      setUnit(initialData.selling_unit || initialData.unit || 'piece')
      setPurchaseUnit(initialData.purchase_unit || initialData.unit || 'piece')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setMinOrderQty(initialData.min_order_quantity || 1)
      setMinBillableQty(initialData.min_billable_quantity || 1)

      const sp = initialData.selling_price || ''
      const cost = initialData.base_cost ?? initialData.purchase_price ?? ''
      setSellingPrice(sp)
      setBaseCost(cost)
      setPurchasePrice(initialData.purchase_price ?? cost)
      setMinPrice(initialData.min_price || '')
      setTargetMargin(initialData.target_margin_percentage ?? 35)
      setMinAllowedMargin(initialData.min_allowed_margin_percent ?? 15)
      setVatApplicable(Boolean(initialData.vat_applicable))
      setIsTaxInclusive(Boolean(initialData.is_tax_inclusive))
      setTaxRate(initialData.tax_rate ?? 7.5)
      setAllowManualOverride(initialData.allow_manual_override !== false)

      const tiers = initialData.price_tiers || {}
      setPriceTiers({
        retail: tiers.retail ?? sp,
        corporate: tiers.corporate ?? '',
        dealer: tiers.dealer ?? '',
        wholesale: tiers.wholesale ?? '',
        custom: tiers.custom ?? '',
      })
    } else {
      setName('')
      setNameBn('')
      setSku(`RP-${Date.now().toString().slice(-5)}`)
      setCategory('ready_products')
      setUnit('piece')
      setPurchaseUnit('piece')
      setIsActive(true)
      setDescription('')
      setMinOrderQty(1)
      setMinBillableQty(1)
      setSellingPrice('')
      setBaseCost('')
      setPurchasePrice('')
      setMinPrice('')
      setTargetMargin(35)
      setMinAllowedMargin(15)
      setVatApplicable(false)
      setIsTaxInclusive(false)
      setTaxRate(7.5)
      setAllowManualOverride(true)
      setPriceTiers({
        retail: '',
        corporate: '',
        dealer: '',
        wholesale: '',
        custom: '',
      })
    }
    setActiveTab('basic')
    setErrorMessage(null)
  }, [initialData, isOpen])

  // Live Gross Margin & Profit Calculation
  const marginMetrics = useMemo(() => {
    const cost = Number(baseCost || purchasePrice) || 0
    const sp = Number(sellingPrice) || 0
    return calculateGrossMargin(cost, sp)
  }, [baseCost, purchasePrice, sellingPrice])

  // Auto-fill price tiers based on standard segment percentages
  const handleAutoFillTiers = () => {
    const sp = Number(sellingPrice) || 0
    if (sp <= 0) return

    setPriceTiers({
      retail: sp,
      corporate: Math.round(sp * 0.95), // 5% discount
      dealer: Math.round(sp * 0.90),    // 10% discount
      wholesale: Math.round(sp * 0.85), // 15% discount
      custom: sp,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Product name is required.')
      setActiveTab('basic')
      return
    }

    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid base selling price.')
      setActiveTab('pricing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const sp = Number(sellingPrice) || 0
      const cost = Number(baseCost || purchasePrice) || 0
      const purPrice = Number(purchasePrice || baseCost) || cost
      const minimumPrice =
        minPrice !== '' && Number(minPrice) > 0
          ? Number(minPrice)
          : Math.round(sp * (1 - (minAllowedMargin / 100)))

      const finalPriceTiers: ProductPriceTiers = {
        retail: priceTiers.retail !== '' ? Number(priceTiers.retail) : sp,
        corporate: priceTiers.corporate !== '' ? Number(priceTiers.corporate) : sp,
        dealer: priceTiers.dealer !== '' ? Number(priceTiers.dealer) : sp,
        wholesale: priceTiers.wholesale !== '' ? Number(priceTiers.wholesale) : sp,
        custom: priceTiers.custom !== '' ? Number(priceTiers.custom) : sp,
      }

      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `RP-${Date.now().toString().slice(-5)}`,
        category: category || 'ready_products',
        product_type: 'ready_product',
        entity_type: 'product',
        commercial_type: 'ready_product',
        is_ready_product: true,
        unit,
        selling_unit: unit,
        purchase_unit: purchaseUnit || unit,
        pricing_method: 'per_piece',
        selling_price: sp,
        base_cost: cost,
        purchase_price: purPrice,
        min_price: minimumPrice,
        target_margin_percentage: Number(targetMargin) || 35.0,
        min_allowed_margin_percent: Number(minAllowedMargin) || 15.0,
        cost_basis_type: 'direct_cost',
        price_tiers: finalPriceTiers,
        vat_applicable: vatApplicable,
        is_tax_inclusive: isTaxInclusive,
        tax_rate: Number(taxRate) || 0,
        allow_manual_override: allowManualOverride,
        is_active: isActive,
        description: description.trim() || undefined,
        min_order_quantity: minOrderQty || 1,
        min_billable_quantity: minBillableQty || minOrderQty || 1,
        requires_production: false,
        requires_design: false,
        requires_approval: false,
        requires_finishing: false,
        requires_installation: false,
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save ready product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {initialData ? `Edit Ready Product: ${initialData.name}` : 'New Ready Product'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                Ready to Sell
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Finished hardware or display items sold by piece/set with no roll formula bleeds.
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium animate-in fade-in-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          {[
            { id: 'basic', label: '1. Basic Info', icon: Package },
            { id: 'pricing', label: '2. Pricing & Margins', icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'basic' | 'pricing')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap text-xs',
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: BASIC INFORMATION & SPECIFICATIONS */}
        {/* ======================================================== */}
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* Section 1: Basic Identity */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Product Identity & Classification
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Product Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. X-Stand Display 2x5 ft, Roll-up Banner Stand..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Bengali Name (ঐচ্ছিক)
                    </Label>
                    <Input
                      placeholder="যেমন: এক্স-স্ট্যান্ড ডিসপ্লে"
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      className="h-9 text-xs font-bengali"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      SKU / Item Code
                    </Label>
                    <Input
                      placeholder="e.g. XSTAND-01"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="h-9 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Category
                    </Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      <option value="ready_products">Ready Products / Display</option>
                      <option value="display_stands">Display & Stands</option>
                      <option value="frames_hardware">Frames & Hardware</option>
                      <option value="promo_items">Promotional Items</option>
                      <option value="general_hardware">General Hardware</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Selling Unit (বিক্রয় একক) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {READY_PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Purchase Unit (ক্রয় একক)
                    </Label>
                    <select
                      value={purchaseUnit}
                      onChange={(e) => setPurchaseUnit(e.target.value)}
                      className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                    >
                      {READY_PRODUCT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Specifications & Settings */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Specifications & Inventory Settings
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Description / Specifications
                  </Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Includes nylon carry bag, flexible fiberglass rods, adjustable hub..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Min Order Quantity (MOQ)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      Min Billable Quantity
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={minBillableQty}
                      onChange={(e) => setMinBillableQty(parseInt(e.target.value) || 1)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Active in Sales & Billing Catalog</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PRICING, MARGINS & CUSTOMER TIERS */}
        {/* ======================================================== */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 animate-in fade-in-0">
            {/* 1. Base Rates & Cost */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Commercial Selling & Cost Basis
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Base Selling Price (৳ / {unit}) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 650"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      required
                      className="pl-7 h-9 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Purchase / Base Cost (৳ / {purchaseUnit || unit})
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 420"
                      value={baseCost}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value)
                        setBaseCost(val)
                        setPurchasePrice(val)
                      }}
                      className="pl-7 h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block text-slate-900 dark:text-white">
                    Minimum Floor Price (৳)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">৳</span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Floor protect rate"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="pl-7 h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Profit & Margin Economics Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Live Yield & Margin Analysis</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md',
                      marginMetrics.grossMarginPercent >= targetMargin
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : marginMetrics.grossMarginPercent >= minAllowedMargin
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    )}
                  >
                    {marginMetrics.grossMarginPercent >= targetMargin ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> Healthy Margin
                      </span>
                    ) : marginMetrics.grossMarginPercent >= minAllowedMargin ? (
                      'Acceptable Margin'
                    ) : (
                      'Below Floor Margin'
                    )}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Profit / Unit</span>
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(marginMetrics.grossProfit)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Gross Margin</span>
                    <span
                      className={cn(
                        'text-sm font-black font-mono',
                        marginMetrics.grossMarginPercent >= minAllowedMargin
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {marginMetrics.grossMarginPercent}%
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Markup</span>
                    <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                      {marginMetrics.markupPercent}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                      Target Gross Margin (%)
                    </Label>
                    <Input
                      type="number"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 35)}
                      className="h-8 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                      Minimum Allowed Margin (%) (Floor)
                    </Label>
                    <Input
                      type="number"
                      value={minAllowedMargin}
                      onChange={(e) => setMinAllowedMargin(parseFloat(e.target.value) || 15)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer Tier Pricing */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Customer Tier Segment Rates
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Auto-applied when preparing quotations & sales for specific customer types.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFillTiers}
                  className="h-7 text-[11px] font-semibold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Auto-calculate Tiers
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* Retail Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">Retail</span>
                    <span className="text-[9px] text-slate-400">100%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder={String(sellingPrice || '0')}
                      value={priceTiers.retail}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          retail: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Corporate Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">Corporate</span>
                    <span className="text-[9px] text-purple-500 font-medium">-5%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 618"
                      value={priceTiers.corporate}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          corporate: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Dealer / Reseller Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Dealer</span>
                    <span className="text-[9px] text-blue-500 font-medium">-10%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 585"
                      value={priceTiers.dealer}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          dealer: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Wholesale / Agency Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Wholesale</span>
                    <span className="text-[9px] text-emerald-500 font-medium">-15%</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 550"
                      value={priceTiers.wholesale}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          wholesale: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                {/* Custom Tier */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Custom</span>
                    <span className="text-[9px] text-amber-500 font-medium">Special</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-slate-400 font-bold text-[10px]">৳</span>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Custom"
                      value={priceTiers.custom}
                      onChange={(e) =>
                        setPriceTiers({
                          ...priceTiers,
                          custom: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="pl-5 h-7 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Tax & Quotation Rules */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Tax & Sales Rules
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={vatApplicable}
                      onChange={(e) => setVatApplicable(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>VAT / Tax Applicable</span>
                  </label>

                  {vatApplicable && (
                    <div className="pl-6 pt-1">
                      <Label className="text-[11px] font-semibold mb-1 block">
                        Tax Rate (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono max-w-[140px]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isTaxInclusive}
                      onChange={(e) => setIsTaxInclusive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Selling Price is Tax-Inclusive</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={allowManualOverride}
                      onChange={(e) => setAllowManualOverride(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Allow Sales Staff Rate Override on Quotations</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Standardized Bottom Action Bar */}
        {/* ======================================================== */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeTab === 'basic' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!name.trim()) {
                    setErrorMessage('Product name is required.')
                    return
                  }
                  setErrorMessage(null)
                  setActiveTab('pricing')
                }}
                className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 cursor-pointer"
              >
                <span>Next: Pricing</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setErrorMessage(null)
                  setActiveTab('basic')
                }}
                className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back: Basic Info</span>
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>{initialData ? 'Update Ready Product' : 'Save Ready Product'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}
