'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { PracticeModeModal } from './practice-mode-modal'

export function PracticeModeBanner() {
  const { tBilingual } = useI18n()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs z-30 relative animate-in fade-in-0">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="h-4 w-4 shrink-0 text-emerald-200" />
          <span className="truncate">
            {tBilingual(
              'New to InkFlow? Try Practice Mode to learn how to book and produce jobs safely.',
              'নতুন শুরু করছেন? প্র্যাকটিস মোড চালু করে ঝুঁকিমুক্তভাবে কাজ তৈরি ও প্রিন্ট শিখুন।'
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 bg-white text-emerald-900 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-1 shadow-2xs"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{tBilingual('Start Practice', 'প্র্যাকটিস শুরু করুন')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-emerald-200 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <PracticeModeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
