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
  Clock,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { DEFAULT_PLANS } from '@/services/subscription.service'

export function PricingSection() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const { tBilingual } = useI18n()

  const plans = DEFAULT_PLANS

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
              'Get started with a 14-day full-feature trial. No credit card required. Upgrade, downgrade, or cancel anytime.',
              '১৪ দিনের পূর্ণাঙ্গ ফ্রি ট্রায়াল দিয়ে শুরু করুন। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই। যেকোনো সময় আপগ্রেড করতে পারবেন।'
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
                {tBilingual('Save 20%', '২০% ছাড়')}
              </span>
            </span>
          </div>
        </div>

        {/* 3 Pricing Cards (Starter, Business, Enterprise) */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((p) => {
            const isPopular = p.code === 'business'
            const price = interval === 'yearly' ? Math.round(p.price_yearly / 12) : p.price_monthly

            return (
              <div
                key={p.code}
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
                    <p className="text-xs text-slate-400 mt-1 min-h-0 sm:min-h-[36px] leading-relaxed">
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
                        ? `৳ ${p.price_yearly.toLocaleString()} BDT per year (~2 months free)`
                        : 'Standard monthly billing in BDT'}
                    </div>
                  </div>

                  {/* Quota Limits Highlights */}
                  <div className="space-y-2 sm:space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Team Users:</span>
                      <span className="font-bold text-white font-mono">{p.max_users} Staff</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Branches / Units:</span>
                      <span className="font-bold text-white font-mono">{p.max_branches} Locations</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Monthly Job Orders:</span>
                      <span className="font-bold text-white font-mono">{p.monthly_orders.toLocaleString()} Orders</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Cloud Storage:</span>
                      <span className="font-bold text-white font-mono">{p.storage_gb} GB Artwork</span>
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

                {/* Card CTA Button */}
                <div className="pt-6 sm:pt-8">
                  <Link href={`/register?plan=${p.code}`} className="block w-full">
                    <Button
                      className={`w-full h-11 font-bold text-sm cursor-pointer bangla-text ${
                        isPopular
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                          : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                      }`}
                    >
                      <span>{tBilingual('Start 14-Day Free Trial', '১৪ দিনের ফ্রি ট্রায়াল')}</span>
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-[10px] sm:text-[11px] text-center text-slate-500 mt-2">
                    No credit card required • Instant setup
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
