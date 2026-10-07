'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { useDemoModal } from '@/components/marketing/demo-modal-context'

interface FinalCTASectionProps {
  onOpenDemo?: () => void
}

export function FinalCTASection({ onOpenDemo }: FinalCTASectionProps) {
  const { tBilingual } = useI18n()
  const { openDemo } = useDemoModal()

  const handleOpenDemo = onOpenDemo || openDemo

  return (
    <section className="py-16 sm:py-24 bg-card border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Zap className="h-3.5 w-3.5" />
          <span>{tBilingual('Instant Cloud Onboarding', 'ইনস্ট্যান্ট ক্লাউড অনবোর্ডিং')}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight max-w-2xl mx-auto leading-tight">
          {tBilingual(
            'Ready to Eliminate Chaos and Take Total Control of Your Print Shop?',
            'কাগজের বিশৃঙ্খলা ভুলে আপনার পুরো প্রেসের নিয়ন্ত্রণ নিতে প্রস্তুত?'
          )}
        </h2>

        <p className="text-xs sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {tBilingual(
            'Join over 200 print and signage companies across Bangladesh managing quotes, roll media stock, floor machines, and staff QR attendance in one place.',
            'বাংলাদেশের ২০০+ আধুনিক প্রেস ও সাইনেজ প্রতিষ্ঠানের সাথে যোগ দিন। কোটেশন, রোল স্টক, মেশিন কিউ এবং কিউআর হাজিরা পরিচালনা করুন এক ছাদের নিচে।'
          )}
        </p>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-11 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
              <span>{tBilingual('Start 14-Day Free Trial', '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন')}</span>
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
            <span>{tBilingual('Book a Live Demo', 'লাইভ ডেমো বুক করুন')}</span>
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground pt-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>{tBilingual('No Credit Card Required', 'কোনো কার্ড লাগবে না')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>{tBilingual('Instant Account Setup in 60s', '৬০ সেকেন্ডে অ্যাকাউন্ট রেডি')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>{tBilingual('100% Isolated Tenant Database', 'শতভাগ সুরক্ষিত ডাটাবেজ')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
