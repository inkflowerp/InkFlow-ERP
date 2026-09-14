'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Printer,
  Play,
  Check,
  RotateCcw,
  User,
  Layers,
  FileCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface PracticeModeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PracticeModeModal({ isOpen, onClose }: PracticeModeModalProps) {
  const { tBilingual } = useI18n()
  const [step, setStep] = useState<number>(1)
  const [isCompleted, setIsCompleted] = useState(false)

  const handleReset = () => {
    setStep(1)
    setIsCompleted(false)
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('InkFlow Practice Workshop', 'প্র্যাকটিস মোড — ঝুঁকিমুক্ত প্রশিক্ষণ')}
      size="md"
      hideFooter={true}
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <GraduationCap className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>
            {tBilingual(
              'Practice data is 100% safe and will NEVER alter your real accounting or inventory stock balances.',
              'প্র্যাকটিস মোডের ডাটা পরীক্ষামূলক এবং এটি আপনার আসল হিসাব বা স্টকে কোনো প্রভাব ফেলবে না।'
            )}
          </span>
        </div>

        {/* Step Progression */}
        {!isCompleted ? (
          <div className="space-y-4">
            {/* Step 1 */}
            {step === 1 && (
              <Card className="border-2 border-blue-500 bg-blue-50/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-white">ধাপ ১</Badge>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      কাস্টমার নির্বাচন করুন
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    ধরুন রহিম এন্টারপ্রাইজ দোকানে এসে একটি ৮×৪ ফুট সাইজের ব্যানার অর্ডার করেছে।
                  </p>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">রহিম এন্টারপ্রাইজ (Rahim Enterprise)</div>
                      <div className="text-[11px] text-slate-500 font-mono">01711-223344</div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">নমুনা কাস্টমার</Badge>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10"
                  >
                    কাস্টমার নিশ্চিত করুন <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <Card className="border-2 border-blue-500 bg-blue-50/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-white">ধাপ ২</Badge>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      সাইজ ও মিডিয়া নিশ্চিত করুন
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">মাপ:</span>
                      <span className="font-bold font-mono">৮ ফুট × ৪ ফুট (৩২ স্কয়ার ফিট)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">মিডিয়া:</span>
                      <span className="font-bold">স্টার ফ্লেক্স (Star Flex China)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">মোট বিল:</span>
                      <span className="font-bold font-mono text-emerald-600">৳৪৮০</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-10"
                  >
                    ফ্লোরে প্রিন্ট শুরু করুন <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <Card className="border-2 border-blue-500 bg-blue-50/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600 text-white">ধাপ ৩</Badge>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      প্রেস ফ্লোরে কাজ সম্পন্ন করুন
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Job #1024 — Rahim Banner</div>
                      <div className="text-[11px] text-blue-600 font-semibold">প্রিন্ট চলমান...</div>
                    </div>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsCompleted(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> কাজ সম্পন্ন ও ডেলিভারি প্রস্তুত
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-2 border-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                অভিনন্দন! আপনি সফলভাবে প্র্যাকটিস সম্পন্ন করেছেন।
              </h4>
              <p className="text-xs text-slate-500">
                এখন আপনি বাস্তব অর্ডারের জন্য <span className="font-bold text-blue-600">New Work</span> ব্যবহার করতে পারেন।
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleReset} className="text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> পুনরায় প্র্যাকটিস
              </Button>
              <Button type="button" size="sm" onClick={onClose} className="bg-blue-600 text-white text-xs font-bold px-6">
                প্র্যাকটিস শেষ করুন
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}
