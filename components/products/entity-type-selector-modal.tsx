'use client'

import React from 'react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Package, Wrench, Boxes, ArrowRight, Layers, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/context'

interface EntityTypeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: 'product' | 'service' | 'material' | 'outsource') => void
}

export function EntityTypeSelectorModal({ isOpen, onClose, onSelect }: EntityTypeSelectorModalProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const options = [
    {
      id: 'product' as const,
      title: 'Ready Product',
      titleBn: 'রেডি প্রোডাক্ট (তৈরি পণ্য)',
      subtitle: 'X-Stand, Roll-up Banner Stand, Display Frames, Ready Promo Items',
      subtitleBn: 'এক্স-স্ট্যান্ড, রোল-আপ ব্যানার স্ট্যান্ড, ডিসপ্লে ফ্রেম, রেডি প্রমো আইটেম',
      description: 'Physical items sold ready-to-use by piece/pack. No roll formulas or production bleeds.',
      descriptionBn: 'পিস বা প্যাকে বিক্রি হওয়া সরাসরি ব্যবহারযোগ্য পণ্য। কোনো রোল ফর্মুলা বা প্রোডাকশন ব্লিডের প্রয়োজন নেই।',
      icon: Package,
      badge: 'Ready to Sell',
      badgeBn: 'সরাসরি বিক্রয়যোগ্য',
      borderClass: 'border-primary/30 hover:border-primary hover:bg-primary/5 dark:border-primary/30 dark:hover:border-primary dark:hover:bg-primary/10',
      badgeClass: 'bg-primary text-primary-foreground font-semibold border-transparent shadow-2xs',
      iconClass: 'bg-primary text-primary-foreground shadow-2xs',
    },
    {
      id: 'service' as const,
      title: 'Print / Production Service',
      titleBn: 'প্রিন্ট / প্রোডাকশন সার্ভিস',
      subtitle: 'UV Vinyl Print, Eco PVC Banner, Acrylic Signage, CNC Laser Cutting',
      subtitleBn: 'ইউভি ভিনাইল প্রিন্ট, ইকো পিভিসি ব্যানার, এক্রিলিক সাইনেজ, সিএনসি লেজার কাটিং',
      description: 'Custom work configured by dimensions, required materials, finishing, and allowance geometry.',
      descriptionBn: 'সাইজ (দৈর্ঘ্য×প্রস্থ), প্রয়োজনীয় উপাদান, ফিনিশিং ও ওয়েস্টেজ অনুযায়ী প্রস্তুতকৃত কাস্টম কাজ।',
      icon: Wrench,
      badge: 'Custom Jobs',
      badgeBn: 'কাস্টম কাজ',
      borderClass: 'border-success/30 hover:border-success hover:bg-success-surface/40 dark:border-success-border dark:hover:border-success dark:hover:bg-success-surface/20',
      badgeClass: 'bg-success text-success-foreground font-semibold border-transparent shadow-2xs',
      iconClass: 'bg-success text-success-foreground shadow-2xs',
    },
    {
      id: 'material' as const,
      title: 'Raw Material',
      titleBn: 'কাঁচামাল (ইনভেন্টরি স্টক)',
      subtitle: 'Vinyl Sticker Rolls (3/4/5ft), PVC Rolls (3.25/4.25/5.25ft), UV Ink Bottles',
      subtitleBn: 'ভিনাইল স্টিকার রোল (৩/৪/৫ ফিট), পিভিসি রোল (৩.২৫/৪.২৫/৫.২৫ ফিট), ইউভি কালির বোতল',
      description: 'Stock materials purchased in bulk/rolls, tracked by roll length, and consumed during production.',
      descriptionBn: 'রোল বা বাল্ক হিসেবে কেনা উপাদান, যা রোল দৈর্ঘ্য বা এককে ট্র্যাক হয় এবং প্রোডাকশনে ব্যবহৃত হয়।',
      icon: Boxes,
      badge: 'Inventory Stock',
      badgeBn: 'ইনভেন্টরি স্টক',
      borderClass: 'border-warning/30 hover:border-warning hover:bg-warning-surface/40 dark:border-warning-border dark:hover:border-warning dark:hover:bg-warning-surface/20',
      badgeClass: 'bg-warning text-warning-foreground font-semibold border-transparent shadow-2xs',
      iconClass: 'bg-warning text-warning-foreground shadow-2xs',
    },
    {
      id: 'outsource' as const,
      title: 'Outsource Product',
      titleBn: 'আউটসোর্স প্রোডাক্ট ও সার্ভিস',
      subtitle: 'Offset Printing, Neon Flex Signs, Computer Embroidery, Gold Foil Stamping',
      subtitleBn: 'অফসেট প্রিন্টিং, নিয়ন ফ্লেক্স সাইন, কম্পিউটার এমব্রয়ডারি, গোল্ড ফয়েল স্ট্যাম্পিং',
      description: 'Jobs & items contracted to third-party vendors. Direct vendor costing, lead times, and zero stock depletion.',
      descriptionBn: 'তৃতীয় পক্ষের ভেন্ডর দ্বারা সম্পন্ন কাজ। সরাসরি ভেন্ডর খরচ, ডেলিভারি সময় এবং নিজস্ব স্টক ছাড়া পরিচালিত।',
      icon: Share2,
      badge: 'Non-Inventory',
      badgeBn: 'নন-ইনভেন্টরি',
      borderClass: 'border-info/30 hover:border-info hover:bg-info-surface/40 dark:border-info-border dark:hover:border-info dark:hover:bg-info-surface/20',
      badgeClass: 'bg-info text-info-foreground font-semibold border-transparent shadow-2xs',
      iconClass: 'bg-info text-info-foreground shadow-2xs',
    },
  ]

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('text-base font-bold text-foreground', isBn && 'font-bangla')}>
                {tBilingual('What would you like to add?', 'আপনি কী যুক্ত করতে চান?')}
              </span>
            </div>
            <p className={cn('text-xs text-muted-foreground', isBn && 'font-bangla leading-relaxed')}>
              {tBilingual(
                'Select the appropriate entity type to open the dedicated commercial configuration form.',
                'সঠিক আইটেম ক্যাটাগরি নির্বাচন করে সংশ্লিষ্ট কনফিগারেশন ফর্মটি খুলুন।'
              )}
            </p>
          </div>
        </div>
      }
      hideFooter={true}
    >
      <div className="space-y-4 py-1">
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelect(opt.id)
                  onClose()
                }}
                className={cn(
                  'w-full text-left p-4 rounded-xl border bg-card transition-all duration-150 flex items-start justify-between group shadow-xs hover:shadow-xs cursor-pointer',
                  opt.borderClass
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn('p-2.5 rounded-xl mt-0.5 shrink-0 transition-transform group-hover:scale-105', opt.iconClass)}>
                    <Icon className="w-5 h-5 text-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('font-bold text-foreground text-sm group-hover:text-primary dark:group-hover:text-primary transition-colors', isBn && 'font-bangla')}>
                        {tBilingual(opt.title, opt.titleBn)}
                      </span>
                      <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-md border select-none', opt.badgeClass, isBn && 'font-bangla')}>
                        {tBilingual(opt.badge, opt.badgeBn)}
                      </span>
                    </div>
                    <p className={cn('text-xs font-semibold text-muted-foreground mt-0.5', isBn && 'font-bangla leading-relaxed')}>
                      {tBilingual(opt.subtitle, opt.subtitleBn)}
                    </p>
                    <p className={cn('text-xs text-muted-foreground mt-1 leading-relaxed', isBn && 'font-bangla leading-relaxed')}>
                      {tBilingual(opt.description, opt.descriptionBn)}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-full text-muted-foreground group-hover:text-primary dark:group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Standardized Bottom Action */}
        <div className="pt-3 border-t border-border flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn('h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted dark:hover:bg-muted', isBn && 'font-bangla')}
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
