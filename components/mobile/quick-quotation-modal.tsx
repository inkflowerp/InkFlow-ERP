'use client'

import React, { useState } from 'react'
import {
  X,
  Calculator,
  Share2,
  BookmarkPlus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_PRESETS[0])
  const [width, setWidth] = useState<number>(10)
  const [height, setHeight] = useState<number>(5)
  const [quantity, setQuantity] = useState<number>(1)
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [includeLamination, setIncludeLamination] = useState<boolean>(false)
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null)

  if (!open) return null

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
    setSavedSuccess('Saved as offline draft on your phone!')
    setTimeout(() => {
      setSavedSuccess(null)
      onClose()
    }, 1500)
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
    setSavedSuccess('Order queued in offline sync!')
    setTimeout(() => {
      setSavedSuccess(null)
      onClose()
    }, 1500)
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
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in-0 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Mobile Quick Quotation</h3>
            <p className="text-xs text-slate-400">Instant square-foot pricing calculator for shop counters</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        {/* Step 1: Material Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Select Media / Substrate</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MATERIAL_PRESETS.map((mat) => (
              <button
                key={mat.id}
                type="button"
                onClick={() => setSelectedMaterial(mat)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedMaterial.id === mat.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs truncate">{mat.name}</div>
                <div className="text-[11px] font-mono text-indigo-400 mt-0.5">৳{mat.rate}/sft</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Dimensions & Quantity */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-slate-400">Width (ft)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.5"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm font-bold text-white text-center focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-400">Height (ft)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.5"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm font-bold text-white text-center focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-slate-400">Quantity (pcs)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm font-bold text-white text-center focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Customer info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="font-medium text-slate-400 block mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-white"
            />
          </div>
          <div>
            <label className="font-medium text-slate-400 block mb-1">WhatsApp / Phone</label>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+8801..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-white"
            />
          </div>
        </div>

        {/* Lamination Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={includeLamination}
            onChange={(e) => setIncludeLamination(e.target.checked)}
            className="rounded border-slate-800 text-indigo-600 h-4 w-4"
          />
          <span>Include Protective Matte/Gloss Lamination (+৳6/sft)</span>
        </label>

        {/* Price Output Breakdown Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950/40 border border-indigo-900/40 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Area: {totalSft} SFT ({width}×{height}ft × {quantity}pcs)</span>
            <span>Base: ৳{Math.round(rawTotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Estimated Total</span>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400">৳{grandTotal.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500">incl. 7.5% Mushak VAT</div>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons (Full Width, >= 48px touch targets) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="h-12 text-xs border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-800 rounded-xl font-bold flex items-center justify-center gap-1.5"
          >
            <BookmarkPlus className="h-4 w-4 text-amber-400" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleShareWhatsApp}
            className="h-12 text-xs border-emerald-800/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 rounded-xl font-bold flex items-center justify-center gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            <span>WhatsApp</span>
          </Button>

          <Button
            type="button"
            onClick={handleQueueOrder}
            className="h-12 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
          >
            <span>Book Order</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
