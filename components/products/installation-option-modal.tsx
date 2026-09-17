'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'
import type { InstallationOptionRecord } from '@/types/product.types'
import { cn } from '@/lib/utils'

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
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {installation ? 'Edit Installation / Delivery Option' : 'Add Installation / Delivery Option'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                Logistics Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define on-site fitting, vehicle dispatch, or shop pickup options.
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
                placeholder="e.g. On-Site Installation (Dhaka Metro), Courier Dispatch"
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
                placeholder="যেমন: অন-সাইট ইনস্টলেশন (ঢাকা মেট্রো)"
                className="h-9 text-xs font-bengali"
              />
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
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="installation">On-Site Installation</option>
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
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="fixed">Fixed Flat Rate</option>
                <option value="sqft">Per Sqft (Area based)</option>
                <option value="per_piece">Per Piece / Location</option>
                <option value="per_km">Per Kilometer (Future distance)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Selling Rate (৳)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g. 1500.00"
                className="h-9 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Direct Service Cost (৳)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 800.00"
                className="h-9 text-xs font-mono"
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
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="inst_creates_task" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Automatically creates logistics / on-site task in production board
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inst_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="inst_active" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Active for commercial quotation and service assignment
              </label>
            </div>
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
                <ShieldCheck className="h-4 w-4" />
                <span>{installation ? 'Update Option' : 'Save Installation Option'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
