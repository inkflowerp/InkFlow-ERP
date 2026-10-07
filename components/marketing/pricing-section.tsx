'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { usePublicSubscriptionPlans } from '@/hooks/use-public-plans'
import type { LandingPricingConfig } from '@/types/landing-page.types'

interface PricingSectionProps {
  config?: LandingPricingConfig
}

export function PricingSection({ config }: PricingSectionProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const { tBilingual } = useI18n()
  const { paidPlans, trialDays, trialDaysBn, isLoading } = usePublicSubscriptionPlans()

  const titleEn = config?.titleEn || 'Simple Pricing. Start Small.'
  const titleBn = config?.titleBn || 'সহজ মূল্যতালিকা। ছোট থেকেই শুরু করুন।'
  const descEn = config?.descriptionEn || 'Upgrade anytime as your business grows.'
  const descBn = config?.descriptionBn || 'ব্যবসা বাড়ার সাথে সাথে যেকোনো সময় পরিবর্তনযোগ্য।'
  const featuredPlan = config?.featuredPlanCode || 'business'

  const plans = paidPlans || []

  return (
    <section id="pricing" className="py-14 sm:py-20 bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <span>{tBilingual('Pricing', 'মূল্যতালিকা')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual(titleEn, titleBn)}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {tBilingual(descEn, descBn)}
          </p>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-3 flex items-center justify-center gap-3 text-xs sm:text-sm">
            <span
              className={`font-semibold cursor-pointer transition-colors ${
                interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setInterval('monthly')}
            >
              {tBilingual('Monthly', 'মাসিক')}
            </span>

            <button
              type="button"
              onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-border bg-muted p-0.5 transition-colors focus:outline-hidden"
              role="switch"
              aria-checked={interval === 'yearly'}
              aria-label="Toggle annual billing"
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-primary shadow-xs transition duration-200 ${
                  interval === 'yearly' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <span
              className={`font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                interval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setInterval('yearly')}
            >
              <span>{tBilingual('Yearly', 'বার্ষিক')}</span>
              <span className="px-2 py-0.2 rounded-full text-xs font-bold bg-success-surface text-success border border-success-border">
                {tBilingual('Save ~20%', '২০% ছাড়')}
              </span>
            </span>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && plans.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto py-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-xl border border-border bg-muted/40 animate-pulse p-6 space-y-4"
              >
                <div className="h-6 w-24 bg-muted rounded" />
                <div className="h-10 w-32 bg-muted rounded" />
                <div className="space-y-2 pt-4">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clean Pricing Cards */}
        {plans.length > 0 && (
          <div
            className={`grid grid-cols-1 ${
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'lg:grid-cols-3 max-w-5xl'
            } gap-5 sm:gap-6 items-stretch mx-auto`}
          >
            {plans.map((p, idx) => {
              const isPopular = p.code === featuredPlan || (idx === 1 && plans.length === 3)
              const price =
                interval === 'yearly' && p.price_yearly > 0
                  ? Math.round(p.price_yearly / 12)
                  : p.price_monthly

              return (
                <div
                  key={p.id || p.code}
                  className={`relative rounded-xl p-6 flex flex-col justify-between transition-all ${
                    isPopular
                      ? 'border-2 border-primary bg-card shadow-xs ring-1 ring-primary/20'
                      : 'border border-border bg-card hover:border-input shadow-xs'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-xs whitespace-nowrap">
                      {tBilingual('Recommended', 'সেরা পছন্দ')}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-foreground">
                          {tBilingual(p.name, p.name_bn)}
                        </h3>
                        {p.code === 'enterprise' && (
                          <Crown className="h-4 w-4 text-warning shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </div>

                    {/* Price in BDT */}
                    <div className="pt-1 pb-3 border-b border-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
                          ৳ {price.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          / month
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {interval === 'yearly'
                          ? `৳ ${p.price_yearly.toLocaleString()} billed yearly`
                          : 'Monthly billing in BDT'}
                      </span>
                    </div>

                    {/* Key Limits & Features */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-border/50 text-muted-foreground">
                        <span>Staff Users</span>
                        <span className="font-semibold text-foreground">
                          {p.max_users >= 999 ? 'Unlimited' : `${p.max_users} Staff`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/50 text-muted-foreground">
                        <span>Monthly Orders</span>
                        <span className="font-semibold text-foreground">
                          {p.monthly_orders >= 9999 ? 'Unlimited' : `${p.monthly_orders} Orders`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/50 text-muted-foreground">
                        <span>Branches</span>
                        <span className="font-semibold text-foreground">
                          {p.max_branches >= 999 ? 'Unlimited' : `${p.max_branches} Units`}
                        </span>
                      </div>

                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Quotations &amp; SFT Calculation</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Job Orders &amp; Prepress Proofs</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Customer Dues &amp; WhatsApp Challans</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Media Roll Stock &amp; Scrap Salvage</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Staff Roster &amp; QR Attendance</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>Multi-Tenant DB &amp; Daily Cloud Backup</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-6">
                    <Link href={`/register?plan=${p.code}`} className="block w-full">
                      <Button
                        className={`w-full h-10 font-bold text-xs cursor-pointer ${
                          isPopular
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}
                      >
                        <span>{tBilingual(`Choose ${p.name}`, `${p.name_bn} বেছে নিন`)}</span>
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Free Trial Banner */}
        <div className="max-w-3xl mx-auto rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                {tBilingual(
                  `Start with a ${trialDays}-Day Free Trial`,
                  `${trialDaysBn} দিনের ফ্রি ট্রায়াল দিয়ে শুরু করুন`
                )}
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {tBilingual(
                'Full access to all features. Zero setup fee. No credit card required.',
                'সব ফিচারের পূর্ণ সুবিধা। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।'
              )}
            </p>
          </div>

          <Link href="/register?plan=trial" className="w-full sm:w-auto shrink-0">
            <Button className="w-full sm:w-auto h-9 px-5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
              <span>{tBilingual('Start Free Trial', 'ফ্রি ট্রায়াল শুরু')}</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
