'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  FolderPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Wrench,
  Layers,
  Sparkles,
} from 'lucide-react'
import type { ProductCategoryRecord, CreateCategoryInput, UpdateCategoryInput } from '@/types/category.types'
import { createCategoryAction, updateCategoryAction } from '@/actions/category.actions'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (category: ProductCategoryRecord) => void
  existingCategories: ProductCategoryRecord[]
  editingCategory?: ProductCategoryRecord | null
}

const GRANULAR_TYPES = [
  { value: 'all', label: 'All Types (সকল ধরণ)' },
  { value: 'production_product', label: 'Production / Printing (প্রোডাকশন / প্রিন্ট)' },
  { value: 'ready_product', label: 'Ready Product (তৈরি পণ্য)' },
  { value: 'finishing', label: 'Finishing Service (ফিনিশিং)' },
  { value: 'fabrication', label: 'Signage & Fabrication (সাইনেজ ও ফেব্রিকেশন)' },
  { value: 'service', label: 'Service / Design (সেবা / ডিজাইন)' },
  { value: 'installation', label: 'Installation (ইনস্টলেশন)' },
  { value: 'delivery', label: 'Delivery (ডেলিভারি)' },
  { value: 'material', label: 'Raw Material (কাঁচামাল)' },
]

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  existingCategories,
  editingCategory,
}: CategoryModalProps) {
  const [name, setName] = useState('')
  const [nameBn, setNameBn] = useState('')
  const [parentId, setParentId] = useState('')
  const [categoryTypeGroup, setCategoryTypeGroup] = useState<'both' | 'products' | 'services'>('both')
  const [appliesTo, setAppliesTo] = useState<string[]>(['all'])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState<number>(1)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || '')
      setNameBn(editingCategory.name_bn || '')
      setParentId(editingCategory.parent_id || '')
      const types = editingCategory.applies_to_product_types || ['all']
      setAppliesTo(types)
      
      // Determine group
      if (types.includes('all') || types.length === 0) {
        setCategoryTypeGroup('both')
      } else if (types.every(t => ['production_product', 'ready_product', 'material', 'fabrication'].includes(t))) {
        setCategoryTypeGroup('products')
      } else if (types.every(t => ['service', 'installation', 'delivery', 'finishing'].includes(t))) {
        setCategoryTypeGroup('services')
      } else {
        setCategoryTypeGroup('both')
      }

      setDescription(editingCategory.description || '')
      setIsActive(editingCategory.is_active !== false)
      setDisplayOrder(editingCategory.display_order || 1)
      setShowAdvanced(false)
    } else {
      setName('')
      setNameBn('')
      setParentId('')
      setCategoryTypeGroup('both')
      setAppliesTo(['all'])
      setDescription('')
      setIsActive(true)
      setDisplayOrder(existingCategories.length + 1)
      setShowAdvanced(false)
    }
    setError(null)
    setSuccessMsg(null)
  }, [editingCategory, isOpen, existingCategories.length])

  if (!isOpen) return null

  const parentCandidates = existingCategories.filter(
    (c) => !editingCategory || (c.id !== editingCategory.id && c.parent_id !== editingCategory.id)
  )

  const handleGroupChange = (group: 'both' | 'products' | 'services') => {
    setCategoryTypeGroup(group)
    if (group === 'both') {
      setAppliesTo(['all'])
    } else if (group === 'products') {
      setAppliesTo(['production_product', 'ready_product', 'material', 'fabrication'])
    } else if (group === 'services') {
      setAppliesTo(['service', 'installation', 'delivery', 'finishing'])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a category name.')
      return
    }

    setLoading(true)

    try {
      if (editingCategory) {
        const updateInput: UpdateCategoryInput = {
          id: editingCategory.id,
          name: trimmedName,
          name_bn: nameBn.trim() || null,
          parent_id: parentId || null,
          applies_to_product_types: appliesTo,
          description: description.trim() || null,
          is_active: isActive,
          display_order: Number(displayOrder) || 1,
        }
        const res = await updateCategoryAction(updateInput)
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to update category')
        }
        setSuccessMsg(`Category "${res.data.name}" updated successfully.`)
        setTimeout(() => {
          onSuccess(res.data!)
          onClose()
        }, 400)
      } else {
        const createInput: CreateCategoryInput = {
          name: trimmedName,
          name_bn: nameBn.trim() || null,
          parent_id: parentId || null,
          applies_to_product_types: appliesTo,
          description: description.trim() || null,
          is_active: isActive,
          display_order: Number(displayOrder) || existingCategories.length + 1,
        }
        const res = await createCategoryAction(createInput)
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to create category')
        }
        setSuccessMsg(`Category "${res.data.name}" created successfully.`)
        setTimeout(() => {
          onSuccess(res.data!)
          onClose()
        }, 400)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the category.')
    } finally {
      setLoading(false)
    }
  }

  // Selected parent name for visual preview
  const selectedParent = parentCandidates.find(c => c.id === parentId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <p className="text-xs text-slate-400">
                Organize your products so they are easy to find.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Category Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Category Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Flex Banner, Vinyl & Sticker, Lamination"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
            />
          </div>

          {/* Bengali Name (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Bengali Name (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: ভিনাইল ও স্টিকার"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bengali"
            />
          </div>

          {/* Parent Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Parent Category (Optional)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
            >
              <option value="">None (Top Level Root Category)</option>
              {parentCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_name ? `${c.parent_name} → ` : ''}{c.name} {c.name_bn ? `(${c.name_bn})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Visual Hierarchy Preview if parent selected */}
          {selectedParent && name && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3.5 py-2 text-xs text-cyan-300 font-mono flex items-center gap-2">
              <span className="text-slate-400">{selectedParent.name}</span>
              <span className="text-cyan-500 font-bold">└──</span>
              <span className="text-white font-bold">{name}</span>
            </div>
          )}

          {/* Category Type Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Category Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGroupChange('products')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  categoryTypeGroup === 'products'
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span>Products</span>
              </button>
              <button
                type="button"
                onClick={() => handleGroupChange('services')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  categoryTypeGroup === 'services'
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Wrench className="h-3.5 w-3.5 shrink-0" />
                <span>Services</span>
              </button>
              <button
                type="button"
                onClick={() => handleGroupChange('both')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  categoryTypeGroup === 'both'
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>Both</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief description or usage notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 px-4 py-2.5">
            <div>
              <span className="text-xs font-semibold text-slate-200">Active</span>
              <p className="text-2xs text-slate-400">Available in product and quotation selectors</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>

          {/* Collapsible Advanced Settings */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>Advanced settings</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-xl border border-slate-800 bg-slate-800/40 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-300 mb-1">
                    Granular Product Type Applicability
                  </label>
                  <select
                    value={appliesTo[0] || 'all'}
                    onChange={(e) => setAppliesTo([e.target.value])}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {GRANULAR_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
