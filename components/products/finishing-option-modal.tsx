'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import type { FinishingOptionRecord } from '@/types/product.types'

interface FinishingOptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  finishing?: FinishingOptionRecord | null
  onSave: (data: Partial<FinishingOptionRecord>) => Promise<void>
}

export function FinishingOptionModal({
  open,
  onOpenChange,
  finishing,
  onSave,
}: FinishingOptionModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [category, setCategory] = useState('lamination')
  const [pricingMethod, setPricingMethod] = useState('sqft')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [cost, setCost] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (finishing) {
      setName(finishing.name || '')
      setNameBn(finishing.name_bn || '')
      setCategory(finishing.category || 'general')
      setPricingMethod(finishing.pricing_method || 'sqft')
      setSellingPrice(String(finishing.selling_price || 0))
      setCost(String(finishing.cost || 0))
      setIsActive(finishing.is_active !== undefined ? finishing.is_active : true)
    } else {
      setName('')
      setNameBn('')
      setCategory('lamination')
      setPricingMethod('sqft')
      setSellingPrice('0')
      setCost('0')
      setIsActive(true)
    }
    setError(null)
  }, [finishing, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Finishing option name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        category: category.trim() || 'general',
        pricing_method: pricingMethod,
        selling_price: Number(sellingPrice) || 0,
        cost: Number(cost) || 0,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save finishing option')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title={finishing ? 'Edit Finishing Option' : 'Add Finishing Option'}
      description="Define post-press operations (Lamination, Eyelets, Hemming, MS Frame)"
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
              Finishing Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Glossy Lamination, Eyelet Punching"
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
              placeholder="e.g. গ্লসি লেমিনেশন, আইলেট পাঞ্চ"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="lamination">Lamination / Coating</option>
              <option value="hardware">Hardware / Eyelet / Rings</option>
              <option value="sewing">Sewing / Hemming / Rope</option>
              <option value="cutting">Cutting / Die Cut / Creasing</option>
              <option value="fabrication">Fabrication / Framing</option>
              <option value="general">General Finishing</option>
            </select>
          </div>

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
              <option value="per_linear_ft">Per Running Foot (Perimeter)</option>
              <option value="fixed">Fixed Price per Job</option>
              <option value="percentage">Percentage Markup</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Customer Selling Rate (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="e.g. 15.00"
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
              placeholder="e.g. 7.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="fin_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
          />
          <label htmlFor="fin_active" className="text-xs text-slate-300 font-medium">
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
            {isSubmitting ? 'Saving...' : finishing ? 'Update Option' : 'Save Finishing Option'}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
