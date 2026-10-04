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
 size="3xl"title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success bg-success/20 text-success font-bold shrink-0">
            <Tag className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-foreground">
                {tBilingual('Edit Selling Rate & Customer Tiers', 'বিক্রয় দর ও গ্রাহক রেট নির্ধারণ')}
              </span>
              <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-2 bg-success-surface bg-success-surface text-success text-success border-success-border border-success-border">
                {product.unit || 'sft'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {product.name}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-3 bg-danger-surface text-destructive rounded-lg text-xs font-semibold flex items-center gap-2 border border-danger-border bg-danger-surface text-destructive border-danger-border">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0"/>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: BASE RATE & COST */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success"/>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Base Selling Rate & Material Cost', 'মূল বিক্রয় মূল্য ও মেটেরিয়াল খরচ')}
              </h3>
            </div>
            {profitMargin !== null && (
              <Badge
 variant="outline"className={`text-xs tabular-nums font-bold py-0.5 px-2 ${
 profitMargin >= 30
                    ? 'bg-success-surface text-success border-success-border'
                    : 'bg-warning-surface text-warning border-warning-border'
                }`}
              >
                {profitMargin}% Gross Margin
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Standard Retail Price', 'খুচরা মূল্য')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground pointer-events-none">৳</span>
                <Input
 type="number"step="0.01"placeholder="25.00"value={sellingPrice || ''}
 onChange={(e) => setSellingPrice(Number(e.target.value))}
 className="text-xs h-9 pl-7 tabular-nums font-black text-foreground"required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Base Material / BOM Cost', 'মেটেরিয়াল বা ক্রয় খরচ')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground pointer-events-none">৳</span>
                <Input
 type="number"step="0.01"placeholder="14.50"value={costPrice || ''}
 onChange={(e) => setCostPrice(Number(e.target.value))}
 className="text-xs h-9 pl-7 tabular-nums text-muted-foreground"/>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Floor Price / Minimum Safe Rate', 'সর্বনিম্ন নিরাপদ দর')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground pointer-events-none">৳</span>
                <Input
 type="number"step="0.01"placeholder="18.00"value={minPrice || ''}
 onChange={(e) => setMinPrice(Number(e.target.value))}
 className="text-xs h-9 pl-7 tabular-nums text-muted-foreground"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Minimum Billable Quantity', 'সর্বনিম্ন বিলযোগ্য পরিমাণ')}
              </Label>
              <Input
 type="number"step="0.1"placeholder="10"value={minBillableQty || ''}
 onChange={(e) => setMinBillableQty(Number(e.target.value))}
 className="text-xs h-9 tabular-nums"/>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Minimum Job Charge', 'সর্বনিম্ন কাজের চার্জ')}
              </Label>
              <Input
 type="number"step="1"placeholder="100"value={minCharge || ''}
 onChange={(e) => setMinCharge(Number(e.target.value))}
 className="text-xs h-9 tabular-nums"/>
            </div>
          </div>
        </div>

        {/* SECTION 2: CUSTOMER TIER RATES */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary"/>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Customer Category Tier Rates', 'গ্রাহক ক্যাটাগরি দর')}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {tBilingual('Auto-resolved in quotations based on client profile', 'কোটেশনে ক্লায়েন্ট প্রোফাইল অনুযায়ী নির্ধারিত হবে')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(CUSTOMER_TYPES_META).map(([key, meta]) => {
 const currentTierVal = tiers[key] ?? sellingPrice
 return (
                <div
 key={key}
 className="p-3 rounded-xl border border-border bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {tBilingual(meta.label, meta.labelBn)}
                    </span>
                    <div className="flex items-center gap-1">
                      {key === 'reseller' && (
                        <button
 type="button"onClick={() => handleApplyPresetDiscount(key, 15)}
 className="text-xs font-bold text-primary hover:underline">
                          -15%
                        </button>
                      )}
                      {key === 'corporate' && (
                        <button
 type="button"onClick={() => handleApplyPresetDiscount(key, 10)}
 className="text-xs font-bold text-primary hover:underline">
                          -10%
                        </button>
                      )}
                      {key === 'agency' && (
                        <button
 type="button"onClick={() => handleApplyPresetDiscount(key, 12)}
 className="text-xs font-bold text-warning hover:underline">
                          -12%
                        </button>
                      )}
                      {key === 'regular' && (
                        <button
 type="button"onClick={() => handleApplyPresetDiscount(key, 8)}
 className="text-xs font-bold text-primary hover:underline">
                          -8%
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground pointer-events-none">৳</span>
                    <Input
 type="number"step="0.01"value={currentTierVal || ''}
 onChange={(e) => handleTierChange(key, Number(e.target.value))}
 className="text-xs h-9 pl-7 tabular-nums font-bold"/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
          <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 className="w-full sm:w-auto min-h-[40px] text-xs font-semibold">
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
 type="submit"disabled={loading}
 className="w-full sm:w-auto min-h-[40px] text-xs bg-success hover:bg-success text-white font-bold shadow-sm px-6">
            {loading
              ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')
              : tBilingual('Update Product Tariff', 'দর আপডেট করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
