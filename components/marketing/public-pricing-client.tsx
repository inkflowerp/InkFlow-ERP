'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'
import { PublicPlansProvider, usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PublicPlansData } from '@/actions/subscription.actions'

interface PublicPricingClientProps {
  initialData?: PublicPlansData | null
}

function PricingPageContent() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()
  const { paidPlans, trialDays, trialDaysBn } = usePublicSubscriptionPlans()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        {/* Pricing Header Banner */}
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              Transparent SaaS Plans in BDT
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual(
                'Simple, Affordable Pricing for Every Print Business.',
                'যেকোনো আকারের প্রেসের জন্য সহজ ও সাশ্রয়ী প্যাকেজ।'
              )}
            </h1>
            <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed bangla-text">
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
        <section className="py-16 bg-slate-950 border-t border-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-black text-white text-center mb-8 bangla-text">
              {tBilingual('Detailed Feature Matrix', 'প্ল্যান অনুযায়ী বিস্তারিত ফিচারের তালিকা')}
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-4">Feature / Capability</th>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness
                        ? 'text-cyan-400 font-bold'
                        : isEnterprise
                        ? 'text-amber-400 font-bold'
                        : 'text-white'

                      return (
                        <th key={p.id || p.code} className={`p-4 text-center ${colorClass}`}>
                          {tBilingual(p.name, p.name_bn)}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-4 font-semibold text-white">Monthly Cost (BDT)</td>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness
                        ? 'text-cyan-300'
                        : isEnterprise
                        ? 'text-amber-300'
                        : 'text-white'
                      return (
                        <td key={p.id || p.code} className={`p-4 text-center font-mono font-bold ${colorClass}`}>
                          ৳ {p.price_monthly.toLocaleString()}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">User Accounts Included</td>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness ? 'text-cyan-300' : isEnterprise ? 'text-amber-300' : ''
                      return (
                        <td key={p.id || p.code} className={`p-4 text-center font-mono ${colorClass}`}>
                          {p.max_users >= 999 ? 'Unlimited' : `${p.max_users} Users`}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">Shop Branches & Factories</td>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness ? 'text-cyan-300' : isEnterprise ? 'text-amber-300' : ''
                      return (
                        <td key={p.id || p.code} className={`p-4 text-center font-mono ${colorClass}`}>
                          {p.max_branches >= 999 ? 'Unlimited' : `${p.max_branches} ${p.max_branches === 1 ? 'Branch' : 'Branches'}`}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">Monthly Job Orders</td>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness ? 'text-cyan-300' : isEnterprise ? 'text-amber-300' : ''
                      return (
                        <td key={p.id || p.code} className={`p-4 text-center font-mono ${colorClass}`}>
                          {p.monthly_orders >= 9999 ? 'Unlimited' : `${p.monthly_orders.toLocaleString()} Orders`}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">Cloud Storage (Artworks & Proofs)</td>
                    {paidPlans.map((p) => {
                      const isBusiness = p.code === 'business'
                      const isEnterprise = p.code === 'enterprise'
                      const colorClass = isBusiness ? 'text-cyan-300' : isEnterprise ? 'text-amber-300' : ''
                      return (
                        <td key={p.id || p.code} className={`p-4 text-center font-mono ${colorClass}`}>
                          {p.storage_gb >= 999 ? 'Unlimited' : `${p.storage_gb} GB`}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4">Instant SFT Pricing & Quotes</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center text-emerald-400">
                        ✓ Included
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Customer Dues & WhatsApp Messages</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center text-emerald-400">
                        ✓ Included
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Floor Kanban & Machine Queues</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className={`p-4 text-center ${p.code === 'starter' ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {p.code === 'starter' ? '—' : '✓ Included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Flex Roll & Media Inventory</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className={`p-4 text-center ${p.code === 'starter' ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {p.code === 'starter' ? '—' : '✓ Included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">True Job Costing & Net Profit</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className={`p-4 text-center ${p.code === 'starter' ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {p.code === 'starter' ? '—' : '✓ Included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Employee Shifts & Attendance</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className={`p-4 text-center ${p.code === 'starter' ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {p.code === 'starter' ? '—' : '✓ Included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4">Dedicated Onboarding Specialist</td>
                    {paidPlans.map((p) => {
                      if (p.code === 'starter') {
                        return (
                          <td key={p.id || p.code} className="p-4 text-center text-slate-500">
                            Standard Email
                          </td>
                        )
                      }
                      if (p.code === 'business') {
                        return (
                          <td key={p.id || p.code} className="p-4 text-center text-cyan-300">
                            Priority Phone
                          </td>
                        )
                      }
                      return (
                        <td key={p.id || p.code} className="p-4 text-center text-amber-300">
                          On-Site & 24/7 Dedicated
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-white">Action</td>
                    {paidPlans.map((p) => (
                      <td key={p.id || p.code} className="p-4 text-center">
                        <Link href={`/register?plan=${p.code}`}>
                          <Button size="sm" className="bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white text-xs font-bold px-3 py-1 h-8 rounded-lg transition-colors cursor-pointer bangla-text">
                            {tBilingual(`Choose ${p.name}`, `${p.name_bn} বেছে নিন`)}
                          </Button>
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <FAQSection />
        <FinalCTASection onOpenDemo={() => setDemoOpen(true)} />
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}

export function PublicPricingClient({ initialData }: PublicPricingClientProps) {
  return (
    <PublicPlansProvider initialData={initialData}>
      <PricingPageContent />
    </PublicPlansProvider>
  )
}
