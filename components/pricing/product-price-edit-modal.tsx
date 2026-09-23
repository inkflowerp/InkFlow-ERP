'use client'

import React, { useState, useEffect } from 'react'
import {
  Tag,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { CUSTOMER_TYPES_META, PricingCustomerType } from '@/types/pricing.types'

interface ProductPriceEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductRecord | null
  onSavePrice: (productId: string, data: {
    base_price?: number
    selling_price: number
    cost_price?: number
    base_cost?: number
    min_price?: number
    min_billable_qty?: number
    min_billable_quantity?: number
    min_charge?: number
    minimum_charge?: number
    price_tiers?: Record<string, number>
  }) => Promise<void>
}

export function ProductPriceEditModal({
  open,
  onOpenChange,
  product,
  onSavePrice,
}: ProductPriceEditModalProps) {
  const { tBilingual } = useI18n()

  const [sellingPrice, setSellingPrice] = useState<number>(0)
  const [costPrice, setCostPrice] = useState<number>(0)
  const [minPrice, setMinPrice] = useState<number>(0)
  const [minBillableQty, setMinBillableQty] = useState<number>(0)
  const [minCharge, setMinCharge] = useState<number>(0)
  const [tiers, setTiers] = useState<Record<string, number>>({})

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open && product) {
      setErrorMsg(null)
      const baseSell = Number(product.selling_price) || Number((product as any).base_price) || 0
      const baseCost = Number(product.base_cost) || Number((product as any).cost_price) || 0
      setSellingPrice(baseSell)
      setCostPrice(baseCost)
      setMinPrice(Number(product.min_price) || 0)
      setMinBillableQty(Number(product.min_billable_quantity) || Number(product.service_config?.min_billable_qty) || 0)
      setMinCharge(Number(product.minimum_charge) || Number(product.service_config?.min_charge) || Number(product.service_config?.minimum_charge) || 0)

      const existingTiers = (product.price_tiers as any) || {}
      setTiers({
        retail: existingTiers.retail ?? baseSell,
        reseller: existingTiers.reseller ?? (baseSell > 0 ? Math.round(baseSell * 0.85) : 0),
        corporate: existingTiers.corporate ?? (baseSell > 0 ? Math.round(baseSell * 0.9) : 0),
        agency: existingTiers.agency ?? (baseSell > 0 ? Math.round(baseSell * 0.88) : 0),
        government: existingTiers.government ?? (baseSell > 0 ? Math.round(baseSell * 0.95) : 0),
        regular: existingTiers.regular ?? (baseSell > 0 ? Math.round(baseSell * 0.92) : 0),
      })
    }
  }, [open, product])

  const handleTierChange = (tierKey: string, val: number) => {
    setTiers((prev) => ({ ...prev, [tierKey]: val }))
  }

  const handleApplyPresetDiscount = (tierKey: string, discountPct: number) => {
    if (sellingPrice > 0) {
      const calculated = Math.round(sellingPrice * (1 - discountPct / 100) * 100) / 100
      setTiers((prev) => ({ ...prev, [tierKey]: calculated }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    if (sellingPrice <= 0) {
      setErrorMsg(tBilingual('Base Selling Price must be greater than 0.', 'মূল বিক্রয় মূল্য ০ এর বেশি হতে হবে।'))
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      await onSavePrice(product.id, {
        base_price: sellingPrice,
        selling_price: sellingPrice,
        cost_price: costPrice,
        base_cost: costPrice,
        min_price: minPrice,
        min_billable_qty: minBillableQty,
        min_billable_quantity: minBillableQty,
        min_charge: minCharge,
        minimum_charge: minCharge,
        price_tiers: tiers,
      })
      onOpenChange(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update price.')
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null

  // Margin Calculation
  const profitMargin =
    sellingPrice > 0 && costPrice > 0
      ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)
      : null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="3xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 font-bold shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Edit Selling Rate & Customer Tiers', 'বিক্রয় দর ও গ্রাহক রেট নির্ধারণ')}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                {product.unit || 'sft'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {product.name}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: BASE RATE & COST */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Base Selling Rate & Material Cost', 'মূল বিক্রয় মূল্য ও মেটেরিয়াল খরচ')}
              </h3>
            </div>
            {profitMargin !== null && (
              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold py-0.5 px-2 ${
                  profitMargin >= 30
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {profitMargin}% Gross Margin
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Standard Retail Price', 'খুচরা মূল্য')} <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="25.00"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="text-xs h-9 pl-7 font-mono font-black text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Base Material / BOM Cost', 'মেটেরিয়াল বা ক্রয় খরচ')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="14.50"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="text-xs h-9 pl-7 font-mono text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Floor Price / Minimum Safe Rate', 'সর্বনিম্ন নিরাপদ দর')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="18.00"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="text-xs h-9 pl-7 font-mono text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Minimum Billable Quantity', 'সর্বনিম্ন বিলযোগ্য পরিমাণ')}
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="10"
                value={minBillableQty || ''}
                onChange={(e) => setMinBillableQty(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Minimum Job Charge', 'সর্বনিম্ন কাজের চার্জ')}
              </Label>
              <Input
                type="number"
                step="1"
                placeholder="100"
                value={minCharge || ''}
                onChange={(e) => setMinCharge(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER TIER RATES */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Customer Category Tier Rates', 'গ্রাহক ক্যাটাগরি দর')}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {tBilingual('Auto-resolved in quotations based on client profile', 'কোটেশনে ক্লায়েন্ট প্রোফাইল অনুযায়ী নির্ধারিত হবে')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => {
              const currentTierVal = tiers[key] ?? sellingPrice
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {tBilingual(meta.label, meta.labelBn)}
                    </span>
                    <div className="flex items-center gap-1">
                      {key === 'reseller' && (
                        <button
                          type="button"
                          onClick={() => handleApplyPresetDiscount(key, 15)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          -15%
                        </button>
                      )}
                      {key === 'corporate' && (
                        <button
                          type="button"
                          onClick={() => handleApplyPresetDiscount(key, 10)}
                          className="text-[10px] font-bold text-purple-600 hover:underline"
                        >
                          -10%
                        </button>
                      )}
                      {key === 'agency' && (
                        <button
                          type="button"
                          onClick={() => handleApplyPresetDiscount(key, 12)}
                          className="text-[10px] font-bold text-amber-600 hover:underline"
                        >
                          -12%
                        </button>
                      )}
                      {key === 'regular' && (
                        <button
                          type="button"
                          onClick={() => handleApplyPresetDiscount(key, 8)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          -8%
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentTierVal || ''}
                      onChange={(e) => handleTierChange(key, Number(e.target.value))}
                      className="text-xs h-9 pl-7 font-mono font-bold"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm px-6"
          >
            {loading
              ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')
              : tBilingual('Update Product Tariff', 'দর আপডেট করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
