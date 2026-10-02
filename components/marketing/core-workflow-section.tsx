'use client'

import React, { useState } from 'react'
import {
 FileText,
 Layers,
 Printer,
 Truck,
 CreditCard,
 CheckCircle2,
 GitFork,
 ArrowRight,
 ShieldCheck,
 ChevronRight,
 Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { CORE_WORKFLOW_LIFECYCLE } from '@/lib/marketing/marketing-data'

export function CoreWorkflowSection() {
 const { tBilingual } = useI18n()
 const [selectedStage, setSelectedStage] = useState(0)

 return (
    <section className="py-16 sm:py-24 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <span>{tBilingual('End-to-End Lifecycle', 'সম্পূর্ণ কাজের চক্র')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual(
              'From Customer Request to Delivery — One System.',
              'কাস্টমার অনুসন্ধান থেকে চালান ডেলিভারি — একটি সম্পূর্ণ সিস্টেমে।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'PrintERP reflects the actual reality of printing and signage businesses: flexible stages, multi-department execution, and connected financial ledgers.',
              'প্রিন্টইআরপি প্রেস ও সাইনেজ ব্যবসার বাস্তব কর্মপ্রবাহের সাথে মানানসই: প্রয়োজন অনুযায়ী নমনীয় ধাপ, বহুমুখী কাজের বিভাজন ও স্বচ্ছ হিসাব।'
            )}
          </p>
        </div>

        {/* 2 Crucial Real-World Highlights (Flexible Gates & Multi-Job Fan-Out) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <div className="p-5 sm:p-6 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4"/>
              <span>{tBilingual('Not Every Job Needs Every Stage', 'সব কাজে সব ধাপের প্রয়োজন নেই')}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'Walk-in cash jobs can jump straight from counter booking to printing, while complex nationwide signage hoardings pass through design proofs, structural fabrication, and site installation audits.',
                'কাউন্টারের সাধারণ ক্যাশ প্রিন্ট তাৎক্ষণিক বুকিং থেকে সরাসরি মেশিনে চলে যায়, আর জটিল সাইনবোর্ডের কাজগুলো ডিজাইন প্রুফ, মেটাল কাঠামো ও অন-সাইট ফিটিংয়ের সুনির্দিষ্ট ধাপ অতিক্রম করে।'
              )}
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              <GitFork className="h-4 w-4"/>
              <span>{tBilingual('1 Invoice → Multiple Production Jobs', '১টি ইনভয়েস থেকে একাধিক প্রোডাকশন জব')}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
              {tBilingual(
                'A single customer order can automatically fan out into 3 distinct jobs: digital flex printing for the solvent press, CNC acrylic cutting for the laser room, and MS welding for the metal workshop.',
                'একটি একক গ্রাহক অর্ডার থেকে স্বয়ংক্রিয়ভাবে আলাদা ৩টি জব তৈরি হতে পারে: সলভেন্ট প্রেসের জন্য ডিজিটাল ব্যানার, লেজার রুমের জন্য এক্রিলিক বর্ণ এবং মেটাল কারখানার জন্য ফ্রেম ওয়েল্ডিং।'
              )}
            </p>
          </div>
        </div>

        {/* Vertical/Horizontal Interactive Lifecycle Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {CORE_WORKFLOW_LIFECYCLE.map((stage, idx) => {
 const isSelected = selectedStage === idx
 return (
              <div
 key={stage.id}
 onClick={() => setSelectedStage(idx)}
 className={`p-4 sm:p-5 rounded-xl border text-left cursor-pointer transition-all ${
 isSelected
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30'
                    : 'border-border bg-muted hover:border-input dark:hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
 className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
 isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-muted-foreground '
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-2xs text-muted-foreground uppercase font-semibold">STAGE</span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-foreground bangla-text mb-1">
                  {tBilingual(stage.titleEn, stage.titleBn)}
                </h3>

                <p className="text-2xs sm:text-xs text-muted-foreground leading-relaxed bangla-text">
                  {tBilingual(stage.descEn, stage.descBn)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
