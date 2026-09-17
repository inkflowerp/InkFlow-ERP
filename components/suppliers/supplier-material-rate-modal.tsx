'use client'

import React, { useState, useEffect } from 'react'
import {
  Tag,
  Layers,
  Coins,
  Calendar,
  Clock,
  Package,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import type { SupplierRecord, SupplierMaterialPrice } from '@/types/crm.types'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import type { MaterialRecord } from '@/types/inventory.types'

interface SupplierMaterialRateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: SupplierRecord | null
  priceToEdit?: SupplierMaterialPrice | null
  onSaveRate: (rate: SupplierMaterialPrice) => void
}

export function SupplierMaterialRateModal({
  open,
  onOpenChange,
  supplier,
  priceToEdit,
  onSaveRate,
}: SupplierMaterialRateModalProps) {
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])

  const isEditing = Boolean(priceToEdit)

  const [formData, setFormData] = useState({
    material_id: '',
    material_name: '',
    category: supplier?.category || 'media',
    unit: 'sft',
    contract_price_bdt: 0,
    moq: 1,
    lead_time_days: 2,
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      if (priceToEdit) {
        setFormData({
          material_id: priceToEdit.material_id || '',
          material_name: priceToEdit.material_name,
          category: priceToEdit.category || supplier?.category || 'media',
          unit: priceToEdit.unit || 'sft',
          contract_price_bdt: priceToEdit.contract_price_bdt || 0,
          moq: priceToEdit.moq || 1,
          lead_time_days: priceToEdit.lead_time_days || 2,
          effective_date: priceToEdit.effective_date || new Date().toISOString().split('T')[0],
          notes: priceToEdit.notes || '',
        })
      } else {
        setFormData({
          material_id: '',
          material_name: '',
          category: supplier?.category || 'media',
          unit: 'sft',
          contract_price_bdt: 0,
          moq: 1,
          lead_time_days: supplier?.lead_time_days || 2,
          effective_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
      }
    }
  }, [open, priceToEdit, supplier])

  // When picking from existing inventory materials
  const handleSelectMaterial = (matId: string) => {
    const found = materials.find((m) => m.id === matId)
    if (found) {
      setFormData((prev) => ({
        ...prev,
        material_id: found.id,
        material_name: found.name,
        category: (found.category as any) || prev.category,
        unit: found.unit || prev.unit,
        contract_price_bdt: found.cost_per_unit || prev.contract_price_bdt,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!formData.material_name.trim()) {
      setErrorMsg(tBilingual('Material specification name is required.', 'উপাদানের নাম বা স্পেসিফিকেশন আবশ্যক।'))
      return
    }

    if (formData.contract_price_bdt <= 0) {
      setErrorMsg(tBilingual('Contract rate must be greater than ৳ 0.', 'চুক্তির দর ৳ ০ এর বেশি হতে হবে।'))
      return
    }

    if (!supplier) return

    setLoading(true)

    try {
      const payload: SupplierMaterialPrice = {
        id: priceToEdit?.id || `smp-${Date.now()}`,
        company_id: company?.id || 'c-01',
        supplier_id: supplier.id,
        material_id: formData.material_id || null,
        material_name: formData.material_name.trim(),
        category: formData.category,
        unit: formData.unit,
        contract_price_bdt: Number(formData.contract_price_bdt),
        moq: Number(formData.moq) || 1,
        lead_time_days: Number(formData.lead_time_days) || 1,
        effective_date: formData.effective_date,
        notes: formData.notes.trim() || null,
        created_at: priceToEdit?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onSaveRate(payload)
      onOpenChange(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save contract price.')
    } finally {
      setLoading(false)
    }
  }

  if (!supplier) return null

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 font-bold shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {isEditing
                  ? tBilingual('Update Material Contract Rate', 'মেটেরিয়াল চুক্তি দর আপডেট করুন')
                  : tBilingual('Add Negotiated Material Rate', 'নতুন মেটেরিয়াল চুক্তি দর যুক্ত করুন')}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-2 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
                {supplier.supplier_name}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Agreed buying rate will be automatically pulled into PO creation and job costing estimators.',
                'চুক্তিভিত্তিক ক্রয়মূল্য পিও তৈরি এবং জব কস্টিং ক্যালকুলেশনে সরাসরি যুক্ত হবে।'
              )}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MATERIAL SPECIFICATION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          {/* Pick from existing inventory */}
          {materials.length > 0 && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Link to Existing Raw Material (Optional)', 'ইনভেন্টরি মেটেরিয়াল থেকে নির্বাচন করুন')}
              </Label>
              <select
                value={formData.material_id}
                onChange={(e) => handleSelectMaterial(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
              >
                <option value="">-- Custom Specification / Non-Catalog --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category.toUpperCase()} • ৳ {m.cost_per_unit || 0}/{m.unit})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Material Specification & Brand', 'মেটেরিয়াল স্পেসিফিকেশন ও ব্র্যান্ড')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Star Flex Gloss 320gsm (10ft Roll)"
                value={formData.material_name}
                onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                className="text-xs h-9 font-medium"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Category', 'ক্যাটাগরি')}
              </Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium capitalize"
              >
                <option value="media">Media (Flex/Vinyl)</option>
                <option value="acrylic">Acrylic Sheets</option>
                <option value="led">LED & Power</option>
                <option value="hardware">Hardware & Stands</option>
                <option value="ink">Inks & Solvents</option>
                <option value="paper">Paper & Boards</option>
                <option value="pvc">PVC Foam</option>
                <option value="aluminum">Aluminum ACP</option>
                <option value="other">Other Supplies</option>
              </select>
            </div>
          </div>
        </div>

        {/* PRICING & UOM */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Unit of Measure (UOM)', 'একক (UOM)')}
              </Label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium font-mono"
              >
                <option value="sft">sft (Square Feet)</option>
                <option value="sheet">sheet (8x4, 6x4)</option>
                <option value="roll">roll (Roll)</option>
                <option value="piece">piece (পিস)</option>
                <option value="liter">liter (লিটার)</option>
                <option value="ream">ream (রিম)</option>
                <option value="kg">kg (কেজি)</option>
                <option value="pack">pack (প্যাক)</option>
                <option value="sqm">sqm (Square Meter)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Contract Buying Rate (৳ BDT)', 'চুক্তিভিত্তিক দর (৳)')} <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.50"
                  value={formData.contract_price_bdt || ''}
                  onChange={(e) => setFormData({ ...formData, contract_price_bdt: Number(e.target.value) })}
                  className="text-xs h-9 pl-7 font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Minimum Order Qty (MOQ)', 'সর্বনিম্ন অর্ডার')}
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={formData.moq || ''}
                onChange={(e) => setFormData({ ...formData, moq: Number(e.target.value) })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Effective Date (কার্যকর তারিখ)', 'কার্যকর তারিখ')}
              </Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Lead Time (Days)', 'ডেলিভারি সময় (দিন)')}
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="2"
                value={formData.lead_time_days || ''}
                onChange={(e) => setFormData({ ...formData, lead_time_days: Number(e.target.value) })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              {tBilingual('Delivery / Tier Discount Remarks', 'ডেলিভারি বা ভলিউম ডিসকাউন্টের শর্ত')}
            </Label>
            <Input
              placeholder="e.g. Rate valid for MOQ >= 5 rolls. Free delivery to factory warehouse."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm px-6"
          >
            {loading
              ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')
              : isEditing
              ? tBilingual('Update Rate', 'দর আপডেট করুন')
              : tBilingual('Save Contract Rate', 'চুক্তি দর সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
