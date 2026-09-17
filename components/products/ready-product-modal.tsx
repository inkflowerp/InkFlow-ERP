'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
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
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState('')
  const [minOrderQty, setMinOrderQty] = useState<number>(1)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setNameBn(initialData.name_bn || '')
      setSku(initialData.sku || '')
      setCategory(initialData.category || 'ready_products')
      setUnit(initialData.unit || 'piece')
      setIsActive(initialData.is_active !== false)
      setDescription(initialData.description || '')
      setMinOrderQty(initialData.min_order_quantity || 1)
    } else {
      setName('')
      setNameBn('')
      setSku(`RP-${Date.now().toString().slice(-5)}`)
      setCategory('ready_products')
      setUnit('piece')
      setIsActive(true)
      setDescription('')
      setMinOrderQty(1)
    }
    setErrorMessage(null)
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Product name is required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        sku: sku.trim() || `RP-${Date.now().toString().slice(-5)}`,
        category: category || 'ready_products',
        product_type: 'ready_product',
        entity_type: 'product',
        commercial_type: 'ready_product',
        unit,
        selling_unit: unit,
        purchase_unit: unit,
        pricing_method: 'per_piece',
        selling_price: initialData?.selling_price || 0,
        base_cost: initialData?.base_cost || 0,
        purchase_price: initialData?.purchase_price || 0,
        target_margin_percentage: initialData?.target_margin_percentage || 35.0,
        min_allowed_margin_percent: 15.0,
        cost_basis_type: 'direct_cost',
        is_active: isActive,
        description: description.trim() || undefined,
        min_order_quantity: minOrderQty || 1,
        min_billable_quantity: minOrderQty || 1,
        vat_applicable: initialData ? Boolean(initialData.vat_applicable) : false,
        tax_rate: initialData?.tax_rate || 7.5,
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
      size="xl"
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
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

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
                  Sell Unit
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

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Min Order Quantity (MOQ)
              </Label>
              <Input
                type="number"
                min="1"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(parseInt(e.target.value) || 1)}
                className="h-9 text-xs font-mono max-w-xs"
              />
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

        {/* Standardized Bottom Action Bar */}
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
      </form>
    </ModalDialog>
  )
}
