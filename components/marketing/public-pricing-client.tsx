'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { useI18n } from '@/i18n/context'
import { PublicPlansProvider, usePublicSubscriptionPlans } from '@/hooks/use-public-plans'
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PublicPlansData } from '@/actions/subscription.actions'

interface PublicPricingClientProps {
 initialData?: PublicPlansData | null
}

function PricingPageContent() {
 const { tBilingual } = useI18n()
 const { paidPlans, trialDays, trialDaysBn } = usePublicSubscriptionPlans()

 return (
    <div className="min-h-screen bg-muted text-foreground selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar />

      <main className="pt-20">
        {/* Pricing Header Banner */}
        <div className="py-16 sm:py-20 bg-card border-b border-border text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5"/>
              <span>{tBilingual('Transparent Plans in BDT', 'স্বচ্ছ মূল্যতালিকা')}</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight bangla-text">
              {tBilingual(
                'Simple, Affordable Pricing for Every Print Business.',
                'যেকোনো আকারের প্রেসের জন্য সহজ ও সাশ্রয়ী প্যাকেজ।'
              )}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'Choose the plan that matches your monthly order volume and machine count. All plans include full Bengali localization and BDT currency support.',
                'আপনার অর্ডারের পরিধি ও মেশিনের সংখ্যা অনুযায়ী সেরা প্ল্যানটি বেছে নিন। প্রতিটি প্ল্যানেই রয়েছে পূর্ণাঙ্গ বাংলা ও টাকার হিসাব।'
              )}
            </p>
          </div>
        </div>

        {/* Pricing Cards & Toggles */}
        <PricingSection />

        {/* Plan Comparison Table Matrix */}
        <section className="py-16 bg-muted border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h3 className="text-2xl font-black text-foreground text-center bangla-text">
              {tBilingual('Detailed Feature Matrix', 'প্ল্যান অনুযায়ী বিস্তারিত ফিচারের তালিকা')}
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground uppercase tabular-nums border-b border-border">
                  <tr>
                    <th className="p-4 font-bold">Feature / Capability</th>
                    {paidPlans.map((p) => {
 const isBusiness = p.code === 'business'
 return (
                        <th
 key={p.id || p.code}
 className={`p-4 text-center ${
 isBusiness ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-foreground'
                          }`}
                        >
                          {tBilingual(p.name, p.name_bn)}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  <tr>
                    <td className="p-4 font-semibold text-foreground">Monthly Cost (BDT)</td>
                    {paidPlans.map((p) => {
 const isBusiness = p.code === 'business'
 return (
                        <td
 key={p.id || p.code}
 className={`p-4 text-center tabular-nums font-bold ${
 isBusiness ? 'text-blue-600 dark:text-blue-400 text-sm' : 'text-foreground text-sm'
                          }`}
                        >
                          ৳ {p.price_monthly.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">User Accounts Included</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center tabular-nums font-medium">
                        {p.max_users >= 999 ? 'Unlimited' : `${p.max_users} Staff`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Shop Branches & Factories</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center tabular-nums font-medium">
                        {p.max_branches >= 999 ? 'Unlimited' : `${p.max_branches} Units`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Monthly Job Orders</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center tabular-nums font-medium">
                        {p.monthly_orders >= 9999 ? 'Unlimited' : `${p.monthly_orders.toLocaleString()} Orders`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Cloud Artwork Storage</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center tabular-nums font-medium">
                        {p.storage_gb >= 999 ? 'Unlimited' : `${p.storage_gb} GB`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">SFT Quotation Auto-Calculator</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Traditional Delivery Challan (NBR)</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">WhatsApp Payment Reminders</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Production Floor Queue & Machine Board</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        {p.code === 'starter' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Flex & Roll Media Stock Tracker</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        {p.code === 'starter' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">True Job Net Profit & BOM Costing</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        {p.code === 'starter' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600 mx-auto"/>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Priority Onboarding Support</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        {p.code === 'enterprise' ? (
                          <span className="text-xs font-bold text-blue-600">Dedicated 24/7</span>
                        ) : (
                          <span className="text-muted-foreground">Business Hours</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <FAQSection />
        <FinalCTASection />
      </main>

      <MarketingFooter />
    </div>
  )
}

export function PublicPricingClient({ initialData }: PublicPricingClientProps) {
 return (
    <PublicPlansProvider initialData={initialData}>
      <MarketingDemoProvider>
        <PricingPageContent />
      </MarketingDemoProvider>
    </PublicPlansProvider>
  )
}


