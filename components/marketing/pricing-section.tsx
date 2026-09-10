'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'
import { FEATURE_METADATA } from '@/lib/subscription/subscription-constants'
import { FeatureCode } from '@/types/subscription.types'

export function PricingSection() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const { tBilingual, locale } = useI18n()
  const { paidPlans, trialDays } = usePublicSubscriptionPlans()

  const plans = paidPlans

  const trialDaysBn = toBengaliDigits(trialDays)

  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-28 bg-slate-900/60 relative overflow-hidden border-t border-slate-800">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] md:w-[800px] h-[300px] sm:h-[500px] bg-cyan-600/10 blur-[100px] sm:blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>{tBilingual('Transparent Pricing in BDT', 'স্বচ্ছ ও সাশ্রয়ী মূল্যতালিকা')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Simple Plans for Growing Businesses.',
              'আপনার প্রেসের পরিধি অনুযায়ী সহজ প্ল্যান।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Choose the right plan for your print shop, or start with our dedicated free trial. Upgrade, downgrade, or cancel anytime.',
              'আপনার প্রেসের পরিধি অনুযায়ী সেরা প্ল্যানটি বেছে নিন, অথবা ডেডিকেটেড ফ্রি ট্রায়াল দিয়ে শুরু করুন। যেকোনো সময় পরিবর্তনযোগ্য।'
            )}
          </p>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-3 sm:pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span
              className={`font-semibold cursor-pointer ${
                interval === 'monthly' ? 'text-white' : 'text-slate-400'
              }`}
              onClick={() => setInterval('monthly')}
            >
              {tBilingual('Monthly Billing', 'মাসিক বিলিং')}
            </span>

            <button
              type="button"
              onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-800 p-0.5 transition-colors duration-200 ease-in-out focus:outline-none"
              role="switch"
              aria-checked={interval === 'yearly'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-cyan-400 shadow-md ring-0 transition duration-200 ease-in-out ${
                  interval === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>

            <span
              className={`font-semibold flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                interval === 'yearly' ? 'text-white' : 'text-slate-400'
              }`}
              onClick={() => setInterval('yearly')}
            >
              <span>{tBilingual('Yearly Billing', 'বার্ষিক বিলিং')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {tBilingual('Save ~20%', '২০% পর্যন্ত ছাড়')}
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className={`mt-10 sm:mt-14 grid grid-cols-1 ${plans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'lg:grid-cols-3 max-w-6xl'} gap-6 sm:gap-8 items-stretch mx-auto`}>
          {plans.map((p, idx) => {
            const isPopular = p.code === 'business' || (idx === 1 && plans.length === 3)
            const price = interval === 'yearly' && p.price_yearly > 0 ? Math.round(p.price_yearly / 12) : p.price_monthly
            const annualSavings = p.price_monthly > 0 && p.price_yearly > 0
              ? Math.max(0, Math.round(((p.price_monthly * 12 - p.price_yearly) / (p.price_monthly * 12)) * 100))
              : 0

            return (
              <div
                key={p.id || p.code}
                className={`relative rounded-3xl p-5 sm:p-7 md:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'border-2 border-cyan-400 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl shadow-cyan-950/40 scale-100 lg:-translate-y-2'
                    : 'border border-slate-800 bg-slate-950/80 hover:border-slate-700'
                }`}
              >
                {/* Popular Ribbon Tag */}
                {isPopular && (
                  <div className="absolute -top-3 sm:-top-3.5 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-md whitespace-nowrap">
                    Most Popular for BD Press
                  </div>
                )}

                <div className="space-y-4 sm:space-y-6">
                  {/* Plan Name & Tagline */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-black text-white bangla-text">
                        {tBilingual(p.name, p.name_bn)}
                      </h3>
                      {p.code === 'enterprise' && (
                        <Crown className="h-5 w-5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 min-h-0 sm:min-h-[36px] leading-relaxed bangla-text">
                      {p.description}
                    </p>
                  </div>

                  {/* Price in BDT */}
                  <div className="pt-2 pb-3 sm:pb-4 border-b border-slate-800">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-2xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                        ৳ {price.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        / month {interval === 'yearly' && '(billed annually)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-400 font-semibold mt-1">
                      {interval === 'yearly'
                        ? `৳ ${p.price_yearly.toLocaleString()} BDT per year ${annualSavings > 0 ? `(~${annualSavings}% savings)` : ''}`
                        : 'Standard monthly billing in BDT'}
                    </div>
                  </div>

                  {/* Quota Limits Highlights */}
                  <div className="space-y-2 sm:space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Team Users:</span>
                      <span className="font-bold text-white font-mono">{p.max_users >= 999 ? 'Unlimited' : `${p.max_users} Staff`}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Branches / Units:</span>
                      <span className="font-bold text-white font-mono">{p.max_branches >= 999 ? 'Unlimited' : `${p.max_branches} Locations`}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Monthly Job Orders:</span>
                      <span className="font-bold text-white font-mono">{p.monthly_orders >= 9999 ? 'Unlimited' : `${p.monthly_orders.toLocaleString()} Orders`}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Cloud Storage:</span>
                      <span className="font-bold text-white font-mono">{p.storage_gb >= 999 ? 'Unlimited' : `${p.storage_gb} GB Artwork`}</span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 text-xs pt-1 sm:pt-2">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                      <span>Instant SFT Quotation Generator</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                      <span>Customer Dues & WhatsApp Reminders</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                      <span>Traditional A4 Delivery Challan</span>
                    </div>

                    {p.code !== 'starter' && (
                      <>
                        <div className="flex items-center gap-2 text-slate-200">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                          <span>Interactive Production Floor Kanban</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-200">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                          <span>Flex & Media Roll Inventory Tracker</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-200">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                          <span>Real Job Profit & BOM Costing</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-200">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 shrink-0" />
                          <span>Employee Shifts, Overtime & Payroll</span>
                        </div>
                      </>
                    )}

                    {p.code === 'enterprise' && (
                      <>
                        <div className="flex items-center gap-2 text-amber-300 font-semibold">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                          <span>Custom Multi-Stage Approval Workflows</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-300 font-semibold">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
                          <span>Dedicated 24/7 Phone & On-Site Support</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card CTA Button for Paid Plan */}
                <div className="pt-6 sm:pt-8">
                  <Link href={`/register?plan=${p.code}`} className="block w-full">
                    <Button
                      className={`w-full h-11 font-bold text-sm cursor-pointer bangla-text ${
                        isPopular
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                          : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                      }`}
                    >
                      <span>{tBilingual(`Get Started with ${p.name}`, `${p.name_bn} শুরু করুন`)}</span>
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-[10px] sm:text-[11px] text-center text-slate-500 mt-2 bangla-text">
                    {tBilingual('Instant account activation • BDT billing', 'ইনস্ট্যান্ট একাউন্ট অ্যাক্টিভেশন • টাকা বিলিং')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dedicated Free Trial Plan Feature Banner */}
        <div className="mt-8 sm:mt-12 max-w-5xl mx-auto rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/40 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-sm">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider bangla-text">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>{tBilingual('Dedicated Free Trial Plan', 'ডেডিকেটেড ফ্রি ট্রায়াল প্ল্যান')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white bangla-text">
              {tBilingual(
                `Start with ${trialDays}-Day Free Evaluation Trial`,
                `${trialDaysBn} দিনের ডেডিকেটেড ফ্রি ট্রায়াল দিয়ে শুরু করুন`
              )}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed bangla-text">
              {tBilingual(
                'Explore all ERP modules with 5 team users, SFT quotation calculator, production Kanban, roll tracker, and accounting. No credit card required.',
                '৫ জন স্টাফ, স্কয়ারফিট কোটেশন, কারখানা কানবান, রোল স্টক এবং সম্পূর্ণ একাউন্টিং ব্যবহারের পূর্ণ সুযোগ। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।'
              )}
            </p>
          </div>
          <div className="w-full md:w-auto shrink-0 flex flex-col items-center sm:items-end gap-1.5">
            <Link href="/register?plan=trial" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-7 text-sm sm:text-base font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 border border-cyan-400/30 cursor-pointer bangla-text">
                <span>{tBilingual(`Start ${trialDays}-Day Free Trial`, `${trialDaysBn} দিনের ফ্রি ট্রায়াল শুরু`)}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <span className="text-[11px] text-slate-400 bangla-text">
              {tBilingual('No credit card • Free instant setup', 'কোনো কার্ড লাগবে না • ইনস্ট্যান্ট সেটআপ')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
