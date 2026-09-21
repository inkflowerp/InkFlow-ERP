'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ShieldCheck, Printer, AlertTriangle } from 'lucide-react'
import type { DesignJobRecord } from '@/types/design.types'
import { PRINT_MACHINERY_LIST, type PreflightState } from '../types'

interface DesignPreflightModalProps {
  isOpen: boolean
  onClose: () => void
  job: DesignJobRecord | null
  currentPreflight: PreflightState
  onToggleCheck: (jobId: string, checkKey: keyof PreflightState, designNumber?: string) => void
  onConfirmAndRoute: (job: DesignJobRecord, targetMachineId: string) => Promise<void>
  onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const DesignPreflightModal = React.memo(function DesignPreflightModal({
  isOpen,
  onClose,
  job,
  currentPreflight,
  onToggleCheck,
  onConfirmAndRoute,
  onShowNotification,
}: DesignPreflightModalProps) {
  const [selectedMachine, setSelectedMachine] = useState('heidelberg_sm74')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (job) {
      // Intelligently pre-select machine based on title or material
      const titleLower = (job.title + ' ' + (job.material || '')).toLowerCase()
      if (titleLower.includes('banner') || titleLower.includes('flex') || titleLower.includes('vinyl')) {
        setSelectedMachine('roland_truevis')
      } else if (titleLower.includes('uv') || titleLower.includes('board') || titleLower.includes('acrylic')) {
        setSelectedMachine('docan_uv_flatbed')
      } else if (titleLower.includes('sticker') && titleLower.includes('cut')) {
        setSelectedMachine('graphtec_cutter')
      } else if (titleLower.includes('card') || titleLower.includes('visiting') || titleLower.includes('digital')) {
        setSelectedMachine('konica_c1085')
      } else {
        setSelectedMachine('heidelberg_sm74')
      }
    }
  }, [job])

  if (!job) return null

  const allPassed = currentPreflight.cmyk && currentPreflight.dpi300 && currentPreflight.bleed && currentPreflight.curves

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onConfirmAndRoute(job, selectedMachine)
      onClose()
    } catch (err: any) {
      onShowNotification?.(err.message || 'Routing failed', 'warning')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMachineObj = PRINT_MACHINERY_LIST.find((m) => m.id === selectedMachine)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
            <span>Pre-Press Quality Health & Print Floor Routing (প্রি-ফ্লাইট ও মেশিন অনুমোদন)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            জব: <span className="font-semibold text-slate-800 dark:text-slate-200">{job.title}</span> (#{job.design_number}) | কাস্টমার: {job.customer_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 4-Item Interactive Pre-Press Checklist */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              প্রি-প্রেস কোয়ালিটি চেকলিস্ট (Pre-Flight Verification):
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* CMYK Check */}
              <div
                onClick={() => onToggleCheck(job.id, 'cmyk', job.design_number)}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  currentPreflight.cmyk
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                    currentPreflight.cmyk ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {currentPreflight.cmyk && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Color Mode: CMYK Process</div>
                  <div className="text-[10px] opacity-80">RGB কালার শিফট এড়াতে CMYK নিশ্চিত</div>
                </div>
              </div>

              {/* 300 DPI Check */}
              <div
                onClick={() => onToggleCheck(job.id, 'dpi300', job.design_number)}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  currentPreflight.dpi300
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                    currentPreflight.dpi300 ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {currentPreflight.dpi300 && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Resolution: ≥ 300 DPI High-Res</div>
                  <div className="text-[10px] opacity-80">ফাটা/ব্লার ছবি বাদ দিয়ে হাই-রেজ আর্টওয়ার্ক</div>
                </div>
              </div>

              {/* Bleed Check */}
              <div
                onClick={() => onToggleCheck(job.id, 'bleed', job.design_number)}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  currentPreflight.bleed
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                    currentPreflight.bleed ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {currentPreflight.bleed && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Bleed: 3mm / 2.0&quot; Margins</div>
                  <div className="text-[10px] opacity-80">কাটিং ও ফ্রেমিং মার্জিন সংরক্ষিত</div>
                </div>
              </div>

              {/* Curves Check */}
              <div
                onClick={() => onToggleCheck(job.id, 'curves', job.design_number)}
                className={`p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-all ${
                  currentPreflight.curves
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                    currentPreflight.curves ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {currentPreflight.curves && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <div className="font-bold text-xs">Fonts: Converted to Outlines/Curves</div>
                  <div className="text-[10px] opacity-80">ফন্ট মিসিং সমস্যা এড়াতে কার্ভ করা হয়েছে</div>
                </div>
              </div>
            </div>
          </div>

          {!allPassed && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>টিপস: চারটি কোয়ালিটি চেকবক্স পূরণ করলে প্রেসে কোনো টেকনিক্যাল ওয়েস্টেজ হবে না।</span>
            </div>
          )}

          {/* Machine Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              টার্গেট প্রিন্ট ফ্লোর মেশিন (Select Target Printing Machine):
            </Label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200"
            >
              {PRINT_MACHINERY_LIST.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.type}]
                </option>
              ))}
            </select>
            {selectedMachineObj && (
              <div className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">স্পেসিফিকেশন:</span> {selectedMachineObj.specs} | <span className="font-bold text-slate-700 dark:text-slate-300">ফ্লোর:</span> {selectedMachineObj.location}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              বাতিল (Cancel)
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'অনুমোদন ও প্রেসে পাঠান (Authorize & Route)'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})
