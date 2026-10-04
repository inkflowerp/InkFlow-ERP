'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, AlertCircle, RefreshCw, Truck, TrendingUp, Sparkles, Zap, Wrench } from 'lucide-react'
import type { InstallationOptionRecord } from '@/types/product.types'
import { calculateGrossMargin } from '@/lib/units'
import { cn } from '@/lib/utils'

interface InstallationOptionModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 installation?: InstallationOptionRecord | null
 onSave: (data: Partial<InstallationOptionRecord>) => Promise<void>
}

const COMMON_LOGISTICS_PRESETS = [
  { name: 'On-Site Sticker / Glass Pasting', name_bn: 'অন-সাইট স্টিকার ও গ্লাস পেস্টিং', fulfillment_type: 'installation', pricing_method: 'sqft', selling_price: 15, cost: 7 },
  { name: 'Shop Fascia Signboard Mounting', name_bn: 'দোকানের সাইনবোর্ড ফিটিং ও ইনস্টলেশন', fulfillment_type: 'installation', pricing_method: 'fixed', selling_price: 2500, cost: 1200 },
  { name: 'Rooftop Billboard Banner Fitting (High Elevation)', name_bn: 'বিলবোর্ড ব্যানার ফিটিং (উঁচু ছাদ/মই)', fulfillment_type: 'installation', pricing_method: 'fixed', selling_price: 5000, cost: 2500 },
  { name: 'Dhaka Metro Standard Delivery', name_bn: 'ঢাকা মেট্রো স্ট্যান্ডার্ড ডেলিভারি', fulfillment_type: 'delivery', pricing_method: 'fixed', selling_price: 350, cost: 180 },
  { name: 'Outside Dhaka Courier Transport', name_bn: 'ঢাকার বাইরে কুরিয়ার ট্রান্সপোর্ট', fulfillment_type: 'delivery', pricing_method: 'fixed', selling_price: 600, cost: 350 },
]

export function InstallationOptionModal({
 open,
 onOpenChange,
 installation,
 onSave,
}: InstallationOptionModalProps) {
 const [name, setName] = useState('')
 const [nameBn, setNameBn] = useState('')
 const [fulfillmentType, setFulfillmentType] = useState('installation')
 const [pricingMethod, setPricingMethod] = useState('fixed')
 const [sellingPrice, setSellingPrice] = useState('0')
 const [cost, setCost] = useState('0')
 const [createsTask, setCreatesTask] = useState(true)
 const [isActive, setIsActive] = useState(true)
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [error, setError] = useState<string | null>(null)

 useEffect(() => {
 if (installation) {
 setName(installation.name || '')
 setNameBn(installation.name_bn || '')
 setFulfillmentType(installation.fulfillment_type || 'installation')
 setPricingMethod(installation.pricing_method || 'fixed')
 setSellingPrice(String(installation.selling_price || 0))
 setCost(String(installation.cost || 0))
 setCreatesTask(installation.creates_task !== undefined ? installation.creates_task : true)
 setIsActive(installation.is_active !== undefined ? installation.is_active : true)
    } else {
 setName('')
 setNameBn('')
 setFulfillmentType('installation')
 setPricingMethod('fixed')
 setSellingPrice('0')
 setCost('0')
 setCreatesTask(true)
 setIsActive(true)
    }
 setError(null)
  }, [installation, open])

  // Live Gross Margin Calculation
 const marginMath = useMemo(() => {
 const sell = Number(sellingPrice) || 0
 const c = Number(cost) || 0
 return calculateGrossMargin(c, sell)
  }, [sellingPrice, cost])

 const handleApplyPreset = (preset: typeof COMMON_LOGISTICS_PRESETS[0]) => {
 setName(preset.name)
 setNameBn(preset.name_bn)
 setFulfillmentType(preset.fulfillment_type)
 setPricingMethod(preset.pricing_method)
 setSellingPrice(String(preset.selling_price))
 setCost(String(preset.cost))
  }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim()) {
 setError('Option name is required')
 return
    }

 try {
 setIsSubmitting(true)
 setError(null)
 await onSave({
 name: name.trim(),
 name_bn: nameBn.trim() || undefined,
 fulfillment_type: fulfillmentType,
 pricing_method: pricingMethod,
 selling_price: Number(sellingPrice) || 0,
 cost: Number(cost) || 0,
 creates_task: createsTask,
 is_active: isActive,
      })
 onOpenChange(false)
    } catch (err: any) {
 setError(err?.message || 'Failed to save option')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <ModalDialog
 open={open}
 onOpenChange={onOpenChange}
 size="lg"title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
            <Truck className="h-5 w-5"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">
                {installation ? 'Edit Installation & Delivery Tariff' : 'Add Installation & Delivery Tariff'}
              </span>
              <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border">
 Logistics Master
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
 Define on-site fitting, billboard mounting, vehicle dispatch, or courier collection tariffs.
            </p>
          </div>
        </div>
      }
 hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 bg-danger-surface bg-danger-surface border border-danger-border border-danger-border rounded-xl text-destructive text-destructive text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive"/>
            <span>{error}</span>
          </div>
        )}

        {/* Quick Presets Picker */}
        {!installation && (
          <div className="p-3 bg-primary/10/60 bg-primary/10 border border-primary/20/60 border-border/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary"/>
 Popular Installation & Logistics Templates:
              </span>
              <span className="text-xs text-primary text-primary font-medium">Click to fill rates</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_LOGISTICS_PRESETS.map((p) => (
                <button
 key={p.name}
 type="button"onClick={() => handleApplyPreset(p)}
 className="px-2.5 py-1 rounded-lg border border-primary/20 border-border bg-card text-foreground font-medium text-xs hover:border-primary/20 hover:text-primary transition-all cursor-pointer flex items-center gap-1">
                  <Zap className="w-3 h-3 text-warning shrink-0"/>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Option Name <span className="text-destructive">*</span>
              </Label>
              <Input
 type="text"required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. On-Site Installation (Dhaka Metro), Courier Dispatch"className="h-9 text-xs"/>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Name (Bengali)
              </Label>
              <Input
 type="text"value={nameBn}
 onChange={(e) => setNameBn(e.target.value)}
 placeholder="যেমন: অন-সাইট ইনস্টলেশন (ঢাকা মেট্রো)"className="h-9 text-xs font-bengali"/>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Fulfillment Type
              </Label>
              <select
 value={fulfillmentType}
 onChange={(e) => setFulfillmentType(e.target.value)}
 className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium">
                <option value="installation">On-Site Installation (Field Labor)</option>
                <option value="delivery">Delivery / Courier / Transport</option>
                <option value="pickup">Self Pickup / Outlet Collection</option>
                <option value="custom">Custom Logistics</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Pricing Method
              </Label>
              <select
 value={pricingMethod}
 onChange={(e) => setPricingMethod(e.target.value)}
 className="w-full h-9 text-xs rounded-md border border-input bg-card px-2 font-medium">
                <option value="fixed">Fixed Flat Rate per Job</option>
                <option value="sqft">Per Sqft (Pasting / Area based)</option>
                <option value="per_piece">Per Piece / Location Count</option>
                <option value="per_km">Per Kilometer (Distance based)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Customer Selling Rate (৳)
              </Label>
              <Input
 type="number"step="0.01"min="0"value={sellingPrice}
 onChange={(e) => setSellingPrice(e.target.value)}
 placeholder="e.g. 1500.00"className="h-9 text-xs tabular-nums font-bold text-primary text-primary"/>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
 Direct Service Cost (৳)
              </Label>
              <Input
 type="number"step="0.01"min="0"value={cost}
 onChange={(e) => setCost(e.target.value)}
 placeholder="e.g. 800.00"className="h-9 text-xs tabular-nums"/>
            </div>
          </div>

          {/* Live Margin Calculation Card */}
          <div className="p-3 rounded-xl bg-muted border border-border /60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success text-success"/>
              <span className="text-xs font-semibold text-foreground">
 Gross Profit: <span className="tabular-nums font-bold text-foreground">৳{marginMath.grossProfit.toFixed(2)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Margin:</span>
              <Badge
 variant="outline"className={cn(
                  'tabular-nums font-bold text-xs py-0.5 px-2',
 marginMath.grossMarginPercent >= 30
                    ? 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                    : marginMath.grossMarginPercent >= 15
                    ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning'
                    : 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive'
                )}
              >
                {marginMath.grossMarginPercent.toFixed(1)}%
              </Badge>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
 type="checkbox"id="inst_creates_task"checked={createsTask}
 onChange={(e) => setCreatesTask(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
              <label htmlFor="inst_creates_task"className="text-xs font-semibold text-foreground cursor-pointer">
 Automatically creates logistics / on-site task in production board
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
 type="checkbox"id="inst_active"checked={isActive}
 onChange={(e) => setIsActive(e.target.checked)}
 className="w-4 h-4 rounded text-primary focus:ring-ring"/>
              <label htmlFor="inst_active"className="text-xs font-semibold text-foreground cursor-pointer">
 Active for commercial quotation and service assignment
              </label>
            </div>
          </div>
        </div>

        {/* Standardized Bottom Action Bar */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 disabled={isSubmitting}
 className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted dark:hover:bg-muted">
 Cancel
          </Button>

          <Button
 type="submit"disabled={isSubmitting}
 className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center gap-2 cursor-pointer">
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin"/>
                <span>Saving Option...</span>
              </>
            ) : (
              <>
                <Truck className="h-4 w-4"/>
                <span>{installation ? 'Update Option' : 'Save Installation Option'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
