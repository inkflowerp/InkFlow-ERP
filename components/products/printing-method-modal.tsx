'use client'

import React, { useState, useEffect } from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import type { PrintingMethod } from '@/types/product.types'

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
      title={method ? 'Edit Printing Method' : 'Add Printing Method'}
      description="Configure dynamic printing technologies without code deployments"
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
              Method Name <span className="text-red-400">*</span>
            </label>
            <input
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
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Method Name (Bengali)
            </label>
            <input
              type="text"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="e.g. ইউভি ফ্ল্যাটবেড প্রিন্ট"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Method Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder="e.g. UV_FLATBED, LATEX"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Estimated Ink/Running Cost (৳ / sqft)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerSqft}
              onChange={(e) => setCostPerSqft(e.target.value)}
              placeholder="e.g. 15.00"
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Default Consumable / Ink Type
          </label>
          <input
            type="text"
            value={defaultInkType}
            onChange={(e) => setDefaultInkType(e.target.value)}
            placeholder="e.g. UV Curable Hard Ink, Eco-Solvent DX5 Ink"
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Compatible Material Formats
          </label>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  compatibleTypes.includes(fmt.id)
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Description / Production Guidelines
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical details, pass speeds, drying rules..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="pm_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
          />
          <label htmlFor="pm_active" className="text-xs text-slate-300 font-medium">
            Active for commercial job & service assignment
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
            {isSubmitting ? 'Saving...' : method ? 'Update Method' : 'Save Printing Method'}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
