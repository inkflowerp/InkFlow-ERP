'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  FolderPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
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

const PRODUCT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Product Types (সকল ধরণ)' },
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
  const [appliesTo, setAppliesTo] = useState<string[]>(['all'])
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [displayOrder, setDisplayOrder] = useState<number>(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || '')
      setNameBn(editingCategory.name_bn || '')
      setParentId(editingCategory.parent_id || '')
      setAppliesTo(
        editingCategory.applies_to_product_types && editingCategory.applies_to_product_types.length > 0
          ? editingCategory.applies_to_product_types
          : ['all']
      )
      setDescription(editingCategory.description || '')
      setIsActive(editingCategory.is_active !== false)
      setDisplayOrder(editingCategory.display_order || 1)
    } else {
      setName('')
      setNameBn('')
      setParentId('')
      setAppliesTo(['all'])
      setDescription('')
      setIsActive(true)
      setDisplayOrder(existingCategories.length + 1)
    }
    setError(null)
    setSuccessMsg(null)
  }, [editingCategory, isOpen, existingCategories.length])

  if (!isOpen) return null

  const parentCandidates = existingCategories.filter(
    (c) => !editingCategory || (c.id !== editingCategory.id && c.parent_id !== editingCategory.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Category name is required.')
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
        }, 500)
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
        }, 500)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the category.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <p className="text-xs text-slate-400">
                {editingCategory
                  ? 'Update product category taxonomy & rules'
                  : 'Create a categorized taxonomy for products & services'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Category Name & Bengali Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vinyl & Sticker"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bengali Name (ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="যেমন: ভিনাইল ও স্টিকার"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bengali"
              />
            </div>
          </div>

          {/* Parent Category & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Parent Category (মূল ক্যাটাগরি)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">None (Top Level Root Category)</option>
                {parentCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_name ? `${c.parent_name} → ` : ''}{c.name} {c.name_bn ? `(${c.name_bn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Display Order (ক্রমিক)
              </label>
              <input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Applies To Product Types */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Applies To Product Types (প্রযোজ্য পণ্যের ধরণ)</span>
              <span className="text-[11px] text-cyan-400 font-normal">Select applicability</span>
            </label>
            <select
              value={appliesTo[0] || 'all'}
              onChange={(e) => setAppliesTo([e.target.value])}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (বিবরণ)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Media specs, usage rules, finishing notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200">Active Status</span>
              <p className="text-[11px] text-slate-400">
                Inactive categories will be hidden from new quotation selectors.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
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
