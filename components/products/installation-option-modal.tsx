'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import type { InstallationOptionRecord } from '@/types/product.types'

interface InstallationOptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installation?: InstallationOptionRecord | null
  onSave: (data: Partial<InstallationOptionRecord>) => Promise<void>
}

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
      title={installation ? 'Edit Installation / Delivery Option' : 'Add Installation / Delivery Option'}
      description="Define on-site fitting, vehicle dispatch, or shop pickup options"
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
              placeholder="e.g. On-Site Installation (Dhaka Metro), Courier Dispatch"
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
              placeholder="e.g. অন-সাইট ইনস্টলেশন (ঢাকা মেট্রো)"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fulfillment Type
            </label>
            <select
              value={fulfillmentType}
              onChange={(e) => setFulfillmentType(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="installation">On-Site Installation</option>
              <option value="delivery">Delivery / Courier / Transport</option>
              <option value="pickup">Self Pickup / Outlet Collection</option>
              <option value="custom">Custom Logistics</option>
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
              <option value="fixed">Fixed Flat Rate</option>
              <option value="sqft">Per Sqft (Area based)</option>
              <option value="per_piece">Per Piece / Location</option>
              <option value="per_km">Per Kilometer (Future distance)</option>
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
              placeholder="e.g. 1500.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Direct Service Cost (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 800.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inst_creates_task"
              checked={createsTask}
              onChange={(e) => setCreatesTask(e.target.checked)}
              className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
            />
            <label htmlFor="inst_creates_task" className="text-xs text-slate-300 font-medium">
              Automatically creates logistics / on-site task in production board
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inst_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
            />
            <label htmlFor="inst_active" className="text-xs text-slate-300 font-medium">
              Active for commercial quotation and service assignment
            </label>
          </div>
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
            {isSubmitting ? 'Saving...' : installation ? 'Update Option' : 'Save Installation Option'}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
