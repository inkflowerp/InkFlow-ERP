'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { useDemoModal } from '@/components/marketing/demo-modal-context'

import type { LandingFinalCtaConfig } from '@/types/landing-page.types'
import { DEFAULT_FINAL_CTA_CONFIG } from '@/lib/marketing/landing-defaults'

interface FinalCTASectionProps {
  config?: LandingFinalCtaConfig
  onOpenDemo?: () => void
}

export function FinalCTASection({ config, onOpenDemo }: FinalCTASectionProps) {
  const { tBilingual } = useI18n()
  const { openDemo } = useDemoModal()

  const c = { ...DEFAULT_FINAL_CTA_CONFIG, ...(config || {}) }
  const handleOpenDemo = onOpenDemo || openDemo

  return (
    <section className="py-16 sm:py-24 bg-muted/30 border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Zap className="h-3.5 w-3.5" />
          <span>{tBilingual(c.eyebrowEn || 'Instant Cloud Onboarding', c.eyebrowBn || 'ইনস্ট্যান্ট ক্লাউড অনবোর্ডিং')}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight max-w-2xl mx-auto leading-tight">
          {tBilingual(
            c.headlineEn || 'Ready to Take Total Control of Your Print Shop?',
            c.headlineBn || 'আপনার পুরো প্রেসের সম্পূর্ণ নিয়ন্ত্রণ নিতে প্রস্তুত?'
          )}
        </h2>

        <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {tBilingual(
            c.descriptionEn ||
              'Quotes, roll media stock, floor machines, and staff QR attendance in one connected system.',
            c.descriptionBn ||
              'কোটেশন, রোল স্টক, মেশিন কিউ এবং কিউআর হাজিরা — সব এক সিস্টেমে।'
          )}
        </p>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
          <Link href={c.primaryCtaLink || '/register'} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-11 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
              <span>{tBilingual(c.primaryCtaEn || 'Start 14-Day Free Trial', c.primaryCtaBn || '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন')}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            onClick={handleOpenDemo}
            className="w-full sm:w-auto h-11 px-6 text-sm sm:text-base font-semibold border-input bg-card text-foreground hover:bg-muted cursor-pointer"
          >
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            <span>{tBilingual(c.secondaryCtaEn || 'Book a Live Demo', c.secondaryCtaBn || 'লাইভ ডেমো দেখুন')}</span>
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground pt-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>{tBilingual('No Card Required', 'কার্ড ছাড়াই শুরু')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>{tBilingual('1-Minute Setup', '১ মিনিটে চালু')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>{tBilingual('100% Private Data', 'শতভাগ সুরক্ষিত ডাটা')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
