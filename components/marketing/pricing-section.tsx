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
 RotateCw,
 PhoneCall,
 Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'
import { useDemoModal } from '@/components/marketing/demo-modal-context'

export function PricingSection() {
 const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
 const { tBilingual } = useI18n()
 const { openDemo } = useDemoModal()
 const { paidPlans, trialDays, trialDaysBn, isLoading, refreshPlans } = usePublicSubscriptionPlans()

 const plans = paidPlans || []

 return (
    <section id="pricing"className="py-16 sm:py-24 bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5"/>
            <span>{tBilingual('Authoritative Pricing in BDT', 'স্বচ্ছ ও সাশ্রয়ী মূল্যতালিকা')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual(
              'Simple Plans for Growing Print Shops.',
              'আপনার প্রেসের পরিধি অনুযায়ী সহজ ও সাশ্রয়ী প্যাকেজ।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Choose the plan that matches your monthly order volume and team size. Every plan includes full Bengali localization, BDT currency, and SFT calculation.',
              'আপনার প্রেসের কাজের পরিধি ও স্টাফের সংখ্যা অনুযায়ী সেরা প্ল্যানটি বেছে নিন। প্রতিটি প্ল্যানে রয়েছে পূর্ণাঙ্গ বাংলা ও টাকার হিসাব।'
            )}
          </p>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3 text-xs sm:text-sm">
            <span
 className={`font-semibold cursor-pointer transition-colors ${
 interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
 onClick={() => setInterval('monthly')}
            >
              {tBilingual('Monthly Billing', 'মাসিক বিলিং')}
            </span>

            <button
 type="button"onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
 className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring"role="switch"aria-checked={interval === 'yearly'}
            >
              <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card dark:bg-blue-400 shadow-sm transition duration-200 ease-in-out ${
 interval === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>

            <span
 className={`font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
 interval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
 onClick={() => setInterval('yearly')}
            >
              <span>{tBilingual('Yearly Billing', 'বার্ষিক বিলিং')}</span>
              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {tBilingual('Save ~20%', '২০% পর্যন্ত ছাড়')}
              </span>
            </span>
          </div>
        </div>

        {/* Loading Skeleton State */}
        {isLoading && plans.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto py-8">
            {[1, 2, 3].map((n) => (
              <div
 key={n}
 className="h-96 rounded-xl border border-border bg-muted animate-pulse p-6 space-y-4">
                <div className="h-6 w-24 bg-muted rounded"/>
                <div className="h-10 w-36 bg-muted rounded"/>
                <div className="space-y-2 pt-4">
                  <div className="h-4 w-full bg-muted rounded"/>
                  <div className="h-4 w-3/4 bg-muted rounded"/>
                  <div className="h-4 w-5/6 bg-muted rounded"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty / Error Fallback State */}
        {!isLoading && plans.length === 0 && (
          <div className="max-w-2xl mx-auto p-8 rounded-xl border border-border bg-muted text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground bangla-text">
              {tBilingual('Subscription Plans Synchronizing', 'মূল্যতালিকা প্রস্তুত হচ্ছে')}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto bangla-text">
              {tBilingual(
                'Our plans are currently updating from the platform database. You can still schedule a live screen walkthrough or speak with our Dhaka team directly.',
                'আমাদের প্যাকেজ তালিকা আপডেট হচ্ছে। আপনি এখনই একটি লাইভ স্ক্রিন ডেমো শিডিউল করতে পারেন অথবা ঢাকা টিমের সাথে যোগাযোগ করতে পারেন।'
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
 onClick={openDemo}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-5 h-10 cursor-pointer">
                {tBilingual('Schedule Walkthrough Demo', 'লাইভ ডেমো বুক করুন')}
              </Button>
              <Link href="/contact">
                <Button
 variant="outline"className="border-input text-foreground text-xs px-5 h-10 cursor-pointer">
                  <PhoneCall className="mr-1.5 h-3.5 w-3.5"/>
                  {tBilingual('Contact Sales Desk', 'সেলস ডেস্ক যোগাযোগ')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        {plans.length > 0 && (
          <div
 className={`grid grid-cols-1 ${
 plans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'lg:grid-cols-3 max-w-6xl'
            } gap-6 sm:gap-8 items-stretch mx-auto`}
          >
            {plans.map((p, idx) => {
 const isPopular = p.code === 'business' || (idx === 1 && plans.length === 3)
 const price =
 interval === 'yearly' && p.price_yearly > 0
                  ? Math.round(p.price_yearly / 12)
                  : p.price_monthly
 const annualSavings =
 p.price_monthly > 0 && p.price_yearly > 0
                  ? Math.max(
                      0,
 Math.round(
                        ((p.price_monthly * 12 - p.price_yearly) / (p.price_monthly * 12)) * 100
                      )
                    )
                  : 0

 return (
                <div
 key={p.id || p.code}
 className={`relative rounded-xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
 isPopular
                      ? 'border-2 border-blue-600 dark:border-blue-500 bg-card shadow-xs ring-1 ring-blue-600/10'
                      : 'border border-border bg-card hover:border-input shadow-sm'
                  }`}
                >
                  {/* Popular Tag */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white font-bold text-2xs uppercase tracking-wider shadow-sm whitespace-nowrap">
                      {tBilingual('Most Popular for BD Press', 'প্রেসের জন্য সেরা পছন্দ')}
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground bangla-text">
                          {tBilingual(p.name, p.name_bn)}
                        </h3>
                        {p.code === 'enterprise' && (
                          <Crown className="h-5 w-5 text-amber-500 shrink-0"/>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 min-h-0 sm:min-h-[32px] leading-relaxed bangla-text">
                        {p.description}
                      </p>
                    </div>

                    {/* Price in BDT */}
                    <div className="pt-2 pb-3 border-b border-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-foreground tabular-nums tracking-tight">
                          ৳ {price.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          / month {interval === 'yearly' && '(billed yearly)'}
                        </span>
                      </div>
                      <div className="text-2xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                        {interval === 'yearly'
                          ? `৳ ${p.price_yearly.toLocaleString()} BDT per year ${
 annualSavings > 0 ? `(~${annualSavings}% savings)` : ''
                            }`
                          : 'Standard monthly billing in BDT'}
                      </div>
                    </div>

                    {/* Quota Highlights */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between py-1 border-b border-border /60">
                        <span className="text-muted-foreground">Team Staff Users:</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {p.max_users >= 999 ? 'Unlimited' : `${p.max_users} Staff`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border /60">
                        <span className="text-muted-foreground">Branches / Units:</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {p.max_branches >= 999 ? 'Unlimited' : `${p.max_branches} Locations`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border /60">
                        <span className="text-muted-foreground">Monthly Orders:</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {p.monthly_orders >= 9999 ? 'Unlimited' : `${p.monthly_orders.toLocaleString()} Orders`}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border /60">
                        <span className="text-muted-foreground">Artwork Storage:</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {p.storage_gb >= 999 ? 'Unlimited' : `${p.storage_gb} GB Cloud`}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                        <span>Instant SFT Quotation Generator</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                        <span>Customer Dues & WhatsApp Reminders</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                        <span>Traditional NBR Delivery Challans</span>
                      </div>

                      {p.code !== 'starter' && (
                        <>
                          <div className="flex items-center gap-2 text-foreground">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                            <span>Interactive Production Floor Queue</span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                            <span>Flex & Roll Media Stock Tracker</span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0"/>
                            <span>Job BOM Costing & Net Profit</span>
                          </div>
                        </>
                      )}

                      {p.code === 'enterprise' && (
                        <>
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
                            <Check className="h-4 w-4 text-amber-600 shrink-0"/>
                            <span>Custom Multi-Branch Hierarchy</span>
                          </div>
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
                            <Check className="h-4 w-4 text-amber-600 shrink-0"/>
                            <span>Priority Phone & On-Site Support</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Plan CTA */}
                  <div className="pt-6">
                    <Link href={`/register?plan=${p.code}`} className="block w-full">
                      <Button
 className={`w-full h-11 font-bold text-sm cursor-pointer bangla-text ${
 isPopular
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                            : 'bg-surface-inset hover:bg-card-elevated dark:hover:bg-card-elevated text-foreground'
                        }`}
                      >
                        <span>{tBilingual(`Get Started with ${p.name}`, `${p.name_bn} শুরু করুন`)}</span>
                        <ArrowRight className="ml-1.5 h-4 w-4"/>
                      </Button>
                    </Link>
                    <p className="text-2xs text-center text-muted-foreground mt-2">
                      {tBilingual('Instant account activation • BDT billing', 'ইনস্ট্যান্ট একাউন্ট অ্যাক্টিভেশন • টাকা বিলিং')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dedicated Free Trial Banner */}
        <div className="max-w-4xl mx-auto rounded-xl border border-blue-200/90 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-2xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3"/>
              <span>{tBilingual('Dedicated Free Evaluation Trial', 'ডেডিকেটেড ফ্রি মূল্যায়ন ট্রায়াল')}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-foreground bangla-text">
              {tBilingual(
                `Start with ${trialDays}-Day Full Feature Trial`,
                `${trialDaysBn} দিনের ফ্রি ট্রায়াল দিয়ে শুরু করুন`
              )}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed bangla-text">
              {tBilingual(
                'Explore all ERP modules with team users, SFT quotation calculator, production queue, roll tracker, and accounting. No credit card required.',
                'স্কয়ারফিট কোটেশন, কারখানা প্রোডাকশন কিউ, রোল স্টক এবং সম্পূর্ণ একাউন্টিং ব্যবহারের পূর্ণ সুযোগ। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।'
              )}
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0 flex flex-col items-center sm:items-end gap-1.5">
            <Link href="/register?plan=trial"className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-6 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer bangla-text">
                <span>{tBilingual(`Start ${trialDays}-Day Free Trial`, `${trialDaysBn} দিনের ফ্রি ট্রায়াল শুরু`)}</span>
                <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </Link>
            <span className="text-2xs text-muted-foreground">
              {tBilingual('No credit card • 60-second setup', 'কোনো কার্ড লাগবে না • ১ মিনিটে সেটআপ')}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
