'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, AlertCircle, RefreshCw } from 'lucide-react'
import type { AdditionalOptionRecord, ProductRecord } from '@/types/product.types'
import { cn } from '@/lib/utils'

interface AdditionalOptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  additional?: AdditionalOptionRecord | null
  products?: ProductRecord[]
  onSave: (data: Partial<AdditionalOptionRecord>) => Promise<void>
}

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

  const handleProductSelect = (pId: string) => {
    setProductId(pId)
    const selected = products.find((p) => p.id === pId)
    if (selected && !name) {
      setName(selected.name)
      setSellingPrice(String(selected.selling_price || 0))
      setCost(String(selected.base_cost || 0))
    }
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
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-cyan-50 text-cyan-700 border-cyan-200">
                Substrate & Addon Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define add-ons (3mm PVC Board, Acrylic Mount, X-Stand Hardware).
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
                placeholder="e.g. 3mm PVC Board Pasting, X-Stand Display"
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
                Link with Existing Catalog Product (Optional)
              </Label>
              <select
                value={productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="">-- Standalone Additional (No Product Link) --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || 'No SKU'}) — ৳{p.selling_price}
                  </option>
                ))}
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
                <option value="sqft">Per Sqft (Area based)</option>
                <option value="per_piece">Per Piece / Unit</option>
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
            className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
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
