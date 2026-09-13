'use client'

import React, { useState, useEffect } from 'react'
import {
  Calculator,
  Share2,
  BookmarkPlus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  Phone,
  User,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { OfflineDraftManager } from '@/lib/offline/drafts'
import { OfflineSyncManager } from '@/lib/offline/sync-queue'

interface QuickQuotationModalProps {
  open: boolean
  onClose: () => void
  tenantSlug?: string
}

const MATERIAL_PRESETS = [
  { id: 'mat-01', name: 'Star Flex 320g Frontlit', rate: 18.5, unit: 'sft', category: 'flex' },
  { id: 'mat-02', name: 'Korean Panaflex Backlit 440g', rate: 38.0, unit: 'sft', category: 'flex' },
  { id: 'mat-03', name: 'Gloss Self-Adhesive Vinyl', rate: 24.0, unit: 'sft', category: 'vinyl' },
  { id: 'mat-04', name: 'Cast Acrylic 5mm Laser Cut', rate: 185.0, unit: 'sft', category: 'acrylic' },
  { id: 'mat-05', name: 'Foam Board 5mm Mounted', rate: 45.0, unit: 'sft', category: 'board' },
]

export function QuickQuotationModal({ open, onClose, tenantSlug = 'app' }: QuickQuotationModalProps) {
  const { tBilingual } = useI18n()
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_PRESETS[0])
  const [width, setWidth] = useState<number>(10)
  const [height, setHeight] = useState<number>(5)
  const [quantity, setQuantity] = useState<number>(1)
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [includeLamination, setIncludeLamination] = useState<boolean>(false)
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSavedSuccess(null)
    }
  }, [open])

  // Calculation
  const totalSftPerPiece = width * height
  const totalSft = totalSftPerPiece * quantity
  const baseRate = selectedMaterial.rate + (includeLamination ? 6.0 : 0)
  const rawTotal = totalSft * baseRate
  const vatAmount = rawTotal * 0.075 // 7.5% standard VAT
  const grandTotal = Math.round(rawTotal + vatAmount)

  const handleSaveDraft = () => {
    OfflineDraftManager.saveDraft('c-01', 'quotation', `${quantity}x ${selectedMaterial.name} (${width}ft × ${height}ft)`, {
      customerName,
      customerPhone,
      material: selectedMaterial.name,
      width,
      height,
      quantity,
      totalSft,
      grandTotal,
    })
    setSavedSuccess(tBilingual('Saved as offline draft on your device!', 'ড্রাফট হিসেবে সংরক্ষণ করা হয়েছে!'))
    setTimeout(() => {
      setSavedSuccess(null)
      onClose()
    }, 1200)
  }

  const handleQueueOrder = () => {
    OfflineSyncManager.enqueueAction(
      'c-01',
      'order.create',
      `Order: ${quantity}x ${selectedMaterial.name} for ${customerName}`,
      '/api/orders/create',
      {
        customerName,
        customerPhone,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        width,
        height,
        quantity,
        totalSft,
        grandTotal,
      }
    )
    setSavedSuccess(tBilingual('Order queued in offline sync queue!', 'অর্ডারটি অফলাইন সিঙ্ক কিউ-তে যুক্ত হয়েছে!'))
    setTimeout(() => {
      setSavedSuccess(null)
      onClose()
    }, 1200)
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `*PrintERP Official Estimate*\n` +
      `Client: ${customerName}\n` +
      `Item: ${selectedMaterial.name}\n` +
      `Size: ${width}ft × ${height}ft (${totalSftPerPiece} SFT)\n` +
      `Quantity: ${quantity} pcs (Total: ${totalSft} SFT)\n` +
      `Rate: ৳${baseRate}/SFT\n` +
      `*Estimated Total: ৳${grandTotal.toLocaleString()} (incl. VAT)*\n` +
      `Thank you!`
    )
    window.open(`https://wa.me/${customerPhone ? customerPhone.replace(/\D/g, '') : ''}?text=${text}`, '_blank')
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Mobile Quick Quotation', 'দ্রুত কোটেশন ক্যালকুলেটর')}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                Counter POS
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tBilingual('Instant square-foot pricing calculator for shop counters', 'কাউন্টার বুকিংয়ের জন্য তাৎক্ষণিক স্কয়ার-ফুট রেট ক্যালকুলেটর')}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        {/* Section 1: Material Selection */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Select Media / Substrate', 'উপাদান নির্বাচন')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MATERIAL_PRESETS.map((mat) => {
              const isSelected = selectedMaterial.id === mat.id
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setSelectedMaterial(mat)}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold truncate">{mat.name}</div>
                    <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      ৳{mat.rate}/sft
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Dimensions & Quantity */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Dimensions & Quantity', 'পরিমাপ ও পরিমাণ')}
              </h3>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              {totalSft} SFT ({width}×{height}ft × {quantity}pcs)
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Width (ft)', 'প্রস্থ (ফুট)')}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.5"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-bold text-center"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Height (ft)', 'উচ্চতা (ফুট)')}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.5"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-bold text-center"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Quantity (pcs)', 'পরিমাণ (পিস)')}
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="text-xs h-9 font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Customer Details & Options */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Customer & Finishing', 'গ্রাহক ও ফিনিশিং')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Customer Name', 'গ্রাহকের নাম')}
              </Label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('WhatsApp / Phone', 'মোবাইল নম্বর')}
              </Label>
              <Input
                type="tel"
                inputMode="tel"
                placeholder="+8801..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={includeLamination}
              onChange={(e) => setIncludeLamination(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 h-4 w-4"
            />
            <span>{tBilingual('Include Protective Matte/Gloss Lamination (+৳6/sft)', 'ম্যাট/গ্লস লেমিনেশন যুক্ত করুন (+৳৬/স্কয়ারফুট)')}</span>
          </label>
        </div>

        {/* Breakdown Output Summary Card */}
        <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2 shadow-sm">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Area: {totalSft} SFT ({width}×{height}ft × {quantity}pcs)</span>
            <span>Base: ৳{Math.round(rawTotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {tBilingual('Estimated Total', 'সর্বমোট মূল্য')}
            </span>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ৳{grandTotal.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">
                {tBilingual('incl. 7.5% Mushak VAT', '৭.৫% মূসক ভ্যাট অন্তর্ভুক্ত')}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="min-h-[40px] text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <BookmarkPlus className="h-4 w-4 text-amber-500" />
            <span>{tBilingual('Save Draft', 'ড্রাফট')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleShareWhatsApp}
            className="min-h-[40px] text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-1.5"
          >
            <Share2 className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp</span>
          </Button>

          <Button
            type="button"
            onClick={handleQueueOrder}
            className="min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{tBilingual('Book Order', 'অর্ডার বুক')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
