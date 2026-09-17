'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import type { FinishingOptionRecord } from '@/types/product.types'
import { cn } from '@/lib/utils'

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
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 font-bold shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {finishing ? 'Edit Finishing Operation' : 'Add Finishing Operation'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-purple-50 text-purple-700 border-purple-200">
                Post-Press Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define post-press operations (Lamination, Eyelets, Hemming, MS Frame).
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
                Finishing Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Glossy Lamination, Eyelet Punching"
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
                placeholder="যেমন: গ্লসি লেমিনেশন, আইলেট পাঞ্চ"
                className="h-9 text-xs font-bengali"
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
                <option value="lamination">Lamination / Coating</option>
                <option value="hardware">Hardware / Eyelet / Rings</option>
                <option value="sewing">Sewing / Hemming / Rope</option>
                <option value="cutting">Cutting / Die Cut / Creasing</option>
                <option value="fabrication">Fabrication / Framing</option>
                <option value="general">General Finishing</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Pricing Basis / Unit
              </Label>
              <select
                value={pricingMethod}
                onChange={(e) => setPricingMethod(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="sqft">Per Sqft (Area based)</option>
                <option value="per_piece">Per Piece / Unit</option>
                <option value="per_linear_ft">Per Running Foot (Perimeter)</option>
                <option value="fixed">Fixed Price per Job</option>
                <option value="percentage">Percentage Markup</option>
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
                placeholder="e.g. 15.00"
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
                placeholder="e.g. 7.00"
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
                <Sparkles className="h-4 w-4" />
                <span>{finishing ? 'Update Option' : 'Save Finishing Option'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
