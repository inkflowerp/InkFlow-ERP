'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  PlayCircle,
  Building2,
  DollarSign,
  Sparkles,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Printer,
  Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { TRUST_INDICATORS } from '@/lib/marketing/marketing-data'
import { DashboardMockup } from './dashboard-mockup'

interface HeroSectionProps {
  onOpenDemo?: () => void
}

export function HeroSection({ onOpenDemo }: HeroSectionProps) {
  const { tBilingual } = useI18n()

  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Subtle Gradient Glows & Print Motif Details */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[700px] h-[280px] sm:h-[400px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-fuchsia-600/15 blur-[100px] sm:blur-[140px] pointer-events-none -z-10" />
      
      {/* Subtle Print Registration Crop Marks (Top Left & Top Right) */}
      <div className="absolute top-28 left-8 text-slate-800 pointer-events-none hidden xl:block font-mono text-[10px]">
        <span className="inline-block border-t border-l border-slate-700 w-4 h-4 mr-1" />
        REGISTRATION BLEED 3mm
      </div>
      <div className="absolute top-28 right-8 text-slate-800 pointer-events-none hidden xl:block font-mono text-[10px]">
        CMYK 300DPI
        <span className="inline-block border-t border-r border-slate-700 w-4 h-4 ml-1" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Tag Pill Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-inner animate-in fade-in-0 zoom-in-95 duration-500 bangla-text max-w-full">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="truncate sm:whitespace-normal">
              {tBilingual(
                'Next-Gen ERP for Bangladesh Print & Signage Workshops',
                'বাংলাদেশের প্রিন্টিং, সাইনেজ ও ফ্যাব্রিকেশন ব্যবসার স্পেশালাইজড ইআরপি'
              )}
            </span>
            <ChevronRight className="h-3 w-3 text-cyan-400 shrink-0 hidden xs:inline" />
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.15] sm:leading-[1.1] bangla-text">
            {tBilingual(
              'Run Your Print Business Smarter.',
              'আপনার প্রেস ও সাইনেজ ব্যবসা চালান আরও স্মার্টলি।'
            )}
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed bangla-text">
            {tBilingual(
              'Manage quotations, orders, production, inventory, payments, delivery and profit — all from one simple platform.',
              'কোটেশন, জব অর্ডার, কারখানা প্রোডাকশন, কাঁচামাল স্টক, বকেয়া আদায়, ডেলিভারি ও আসল লাভ—সবকিছু এক প্ল্যাটফর্মে।'
            )}
          </p>

          {/* Bangladesh-Specific Supporting Line */}
          <div className="text-xs sm:text-sm font-semibold text-cyan-400 max-w-2xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2 text-center bangla-text">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
            <span>
              {tBilingual(
                'Built specifically for printing, signage, fabrication and advertising businesses in Bangladesh.',
                'বাংলাদেশের প্রিন্টিং প্রেস, সাইনেজ, ফ্যাব্রিকেশন ও অ্যাডভার্টাইজিং এজেন্সির জন্য বিশেষভাবে তৈরি।'
              )}
            </span>
          </div>

          {/* Primary & Secondary Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3.5 pt-2 sm:pt-4 w-full max-w-md sm:max-w-none mx-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-8 text-sm sm:text-base font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 border border-cyan-400/30 group cursor-pointer bangla-text">
                <span>{tBilingual('Start Free Trial', '১৪ দিনের ফ্রি ট্রায়াল শুরু')}</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 sm:h-13 px-5 sm:px-7 text-sm sm:text-base font-semibold border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white cursor-pointer bangla-text"
              >
                <PlayCircle className="mr-2 h-4 w-4 text-cyan-400" />
                <span>{tBilingual('See How It Works', 'কাজের ধাপ দেখুন')}</span>
              </Button>
            </a>

            {onOpenDemo && (
              <Button
                type="button"
                variant="ghost"
                onClick={onOpenDemo}
                className="w-full sm:w-auto h-12 sm:h-13 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white cursor-pointer bangla-text"
              >
                {tBilingual('Book a Live Demo', 'লাইভ ডেমো বুক করুন')}
              </Button>
            )}
          </div>

          {/* 4 Trust Indicators Grid */}
          <div className="pt-6 sm:pt-8 border-t border-slate-800/60 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            {TRUST_INDICATORS.map((t, idx) => {
              const Icon = t.icon
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs text-slate-300 bangla-text"
                >
                  <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-slate-200 text-[11px] sm:text-xs leading-snug">
                    {tBilingual(t.textEn, t.textBn)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hero Visual: Realistic SaaS Dashboard Mockup */}
        <div className="mt-10 sm:mt-14 max-w-6xl mx-auto relative group">
          {/* Subtle Outer Glow Accent */}
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-600/10 to-fuchsia-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-700 pointer-events-none" />
          
          {/* Main Interactive Mockup Component */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
