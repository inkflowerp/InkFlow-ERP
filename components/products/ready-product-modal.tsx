'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Package, DollarSign, Tag, Layers, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react'
import type { ProductRecord, UnitOfMeasure } from '@/types/product.types'
import type { ProductCategoryRecord } from '@/types/category.types'

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
]

export function ReadyProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: ReadyProductModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('ready_products')
  const [unit, setUnit] = useState<UnitOfMeasure>('piece')
  const [sellingPrice, setSellingPrice] = useState<number | ''>('')
  const [baseCost, setBaseCost] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')
  const [minOrderQty, setMinOrderQty] = useState<number>(1)
  const [vatApplicable, setVatApplicable] = useState(false)
  const [taxRate, setTaxRate] = useState<number>(7.5)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'ready_products')
      setUnit(initialData.unit || 'piece')
      setSellingPrice(initialData.selling_price || 0)
      setBaseCost(initialData.base_cost || '')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setMinOrderQty(initialData.min_order_quantity || 1)
      setVatApplicable(Boolean(initialData.vat_applicable))
      setTaxRate(initialData.tax_rate || 7.5)
      setShowAdvanced(Boolean(initialData.base_cost || initialData.description))
    } else {
      setName('')
      setNameBn('')
      setSku(`RP-${Date.now().toString().slice(-5)}`)
      setCategory('ready_products')
      setUnit('piece')
      setSellingPrice('')
      setBaseCost('')
      setIsActive(true)
      setDescription('')
      setMinOrderQty(1)
      setVatApplicable(false)
      setTaxRate(7.5)
      setShowAdvanced(false)
    }
    setErrorMessage(null)
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Product name is required.')
      return
    }
    if (sellingPrice === '' || Number(sellingPrice) < 0) {
      setErrorMessage('Please enter a valid selling price.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: Partial<ProductRecord> = {
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim().toUpperCase() || `RP-${Date.now().toString().slice(-5)}`,
        category: category.trim() || 'ready_products',
        entity_type: 'product',
        product_type: 'ready_product',
        commercial_type: 'ready_product',
        measurement_type: 'piece',
        pricing_method: 'per_piece',
        unit: unit,
        selling_unit: unit,
        purchase_unit: unit,
        selling_price: Number(sellingPrice) || 0,
        base_cost: baseCost !== '' ? Number(baseCost) : 0,
        is_active: isActive,
        is_ready_product: true,
        is_service: false,
        description: description.trim() || undefined,
        min_order_quantity: minOrderQty || 1,
        vat_applicable: vatApplicable,
        tax_rate: vatApplicable ? taxRate : 0,
        requires_production: false,
      }

      await onSave(payload)
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
      title={initialData ? `Edit Ready Product: ${initialData.name}` : 'New Ready Product'}
      description="Products sold as finished items (e.g. X-Stand, Display Frame). No roll formulas required."
      size="xl"
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="rp-name" className="text-sm font-medium">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rp-name"
              placeholder="e.g. X-Stand (2ft × 5ft / 2.5ft × 6ft)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rp-name-bn" className="text-xs text-muted-foreground">
                Bengali Name (ঐচ্ছিক)
              </Label>
              <Input
                id="rp-name-bn"
                placeholder="যেমন: এক্স-স্ট্যান্ড"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="rp-sku" className="text-xs text-muted-foreground">
                SKU / Item Code
              </Label>
              <Input
                id="rp-sku"
                placeholder="e.g. XSTAND-01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 uppercase text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rp-category" className="text-sm font-medium">
                Category
              </Label>
              <select
                id="rp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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
              <Label htmlFor="rp-unit" className="text-sm font-medium">
                Sell By (Unit)
              </Label>
              <select
                id="rp-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {READY_PRODUCT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rp-price" className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <span>Selling Price (৳)</span>
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">৳</span>
                  <Input
                    id="rp-price"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    required
                    className="pl-7 font-semibold text-base"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rp-cost" className="text-sm text-muted-foreground">
                  Purchase Cost (৳) <span className="text-xs">(Optional)</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">৳</span>
                  <Input
                    id="rp-cost"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="pl-7 text-sm"
                  />
                </div>
              </div>
            </div>

            {sellingPrice !== '' && baseCost !== '' && Number(sellingPrice) > 0 && Number(baseCost) > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/10">
                <span className="text-muted-foreground">Estimated Margin:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {Math.round(((Number(sellingPrice) - Number(baseCost)) / Number(sellingPrice)) * 100)}% (৳
                  {(Number(sellingPrice) - Number(baseCost)).toFixed(2)} profit / {unit})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Active in Catalog</span>
            </label>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{showAdvanced ? 'Hide Optional Details' : 'More Options'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Advanced / Optional Details */}
          {showAdvanced && (
            <div className="pt-2 border-t border-border/60 space-y-3">
              <div>
                <Label htmlFor="rp-desc" className="text-xs text-muted-foreground">
                  Description / Specifications
                </Label>
                <textarea
                  id="rp-desc"
                  rows={2}
                  placeholder="Includes carry bag, adjustable plastic hub..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-background text-xs focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rp-min-qty" className="text-xs text-muted-foreground">
                    Min Order Quantity
                  </Label>
                  <Input
                    id="rp-min-qty"
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vatApplicable}
                      onChange={(e) => setVatApplicable(e.target.checked)}
                      className="w-4 h-4 rounded text-primary"
                    />
                    <span className="text-xs font-medium">VAT / Tax Applicable</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
            {isSubmitting ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
