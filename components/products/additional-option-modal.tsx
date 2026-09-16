'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import type { AdditionalOptionRecord, ProductRecord } from '@/types/product.types'

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
      title={additional ? 'Edit Additional Option' : 'Add Additional Option'}
      description="Define add-ons (3mm PVC Board, Acrylic Mount, X-Stand Hardware)"
      size="md"
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Option Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3mm PVC Board Pasting, X-Stand Display"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Name (Bengali)
            </label>
            <input
              type="text"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="e.g. ৩মিমি পিভিসি বোর্ড পেস্টিং"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {products.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Link with Existing Catalog Product (Optional)
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pricing Method
            </label>
            <select
              value={pricingMethod}
              onChange={(e) => setPricingMethod(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="sqft">Per Sqft (Area based)</option>
              <option value="per_piece">Per Piece / Unit</option>
              <option value="fixed">Fixed Flat Price</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Selling Rate (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="e.g. 45.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Direct Unit Cost (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 25.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="add_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
          />
          <label htmlFor="add_active" className="text-xs text-slate-300 font-medium">
            Active for quotation and service configuration
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : additional ? 'Update Option' : 'Save Additional Option'}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
