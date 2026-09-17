'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Palette, AlertCircle, RefreshCw } from 'lucide-react'
import type { PrintingMethod } from '@/types/product.types'
import { cn } from '@/lib/utils'

interface PrintingMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method?: PrintingMethod | null
  onSave: (data: Partial<PrintingMethod>) => Promise<void>
}

export function PrintingMethodModal({
  open,
  onOpenChange,
  method,
  onSave,
}: PrintingMethodModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [costPerSqft, setCostPerSqft] = useState('0')
  const [defaultInkType, setDefaultInkType] = useState('')
  const [compatibleTypes, setCompatibleTypes] = useState<string[]>(['roll'])
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (method) {
      setName(method.name || '')
      setNameBn(method.name_bn || '')
      setCode(method.code || '')
      setDescription(method.description || '')
      setCostPerSqft(String(method.cost_per_sqft || 0))
      setDefaultInkType(method.default_ink_type || '')
      setCompatibleTypes(method.compatible_material_types || ['roll'])
      setIsActive(method.is_active !== undefined ? method.is_active : true)
    } else {
      setName('')
      setNameBn('')
      setCode('')
      setDescription('')
      setCostPerSqft('0')
      setDefaultInkType('')
      setCompatibleTypes(['roll'])
      setIsActive(true)
    }
    setError(null)
  }, [method, open])

  const toggleMaterialType = (type: string) => {
    setCompatibleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Printing method name is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSave({
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        code: code.trim() || name.toUpperCase().replace(/\s+/g, '_'),
        description: description.trim() || undefined,
        cost_per_sqft: Number(costPerSqft) || 0,
        default_ink_type: defaultInkType.trim() || undefined,
        compatible_material_types: compatibleTypes,
        is_active: isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save printing method')
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-bold shrink-0">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {method ? 'Edit Printing Method' : 'Add Printing Technology'}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-rose-50 text-rose-700 border-rose-200">
                Technology Master
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure dynamic print technologies (Eco-Solvent, UV, DTF, Latex) without code changes.
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
                Method Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!method && !code) {
                    setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))
                  }
                }}
                placeholder="e.g. UV Flatbed Print, Latex Print"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Method Name (Bengali)
              </Label>
              <Input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: ইউভি ফ্ল্যাটবেড প্রিন্ট"
                className="h-9 text-xs font-bengali"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Method Code / Key
              </Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="e.g. UV_FLATBED, LATEX"
                className="h-9 text-xs font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Estimated Ink/Running Cost (৳ / sqft)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costPerSqft}
                onChange={(e) => setCostPerSqft(e.target.value)}
                placeholder="e.g. 15.00"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Default Consumable / Ink Type
            </Label>
            <Input
              type="text"
              value={defaultInkType}
              onChange={(e) => setDefaultInkType(e.target.value)}
              placeholder="e.g. UV Curable Hard Ink, Eco-Solvent DX5 Ink"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-2 block">
              Compatible Material Formats
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'roll', label: 'Roll Stock (Vinyl, PVC, Fabric)' },
                { id: 'sheet', label: 'Flat Sheets (Paper, Board)' },
                { id: 'rigid', label: 'Rigid Substrates (Acrylic, MDF, Metal)' },
                { id: 'hardware', label: 'Direct Products / Hardware' },
              ].map((fmt) => (
                <button
                  type="button"
                  key={fmt.id}
                  onClick={() => toggleMaterialType(fmt.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                    compatibleTypes.includes(fmt.id)
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Description / Production Guidelines
            </Label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical details, pass speeds, drying rules..."
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Active for commercial job & service assignment</span>
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
                <span>Saving Method...</span>
              </>
            ) : (
              <>
                <Palette className="h-4 w-4" />
                <span>{method ? 'Update Method' : 'Save Printing Method'}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
