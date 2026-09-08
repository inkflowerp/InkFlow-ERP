'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FAQSection } from '@/components/marketing/faq-section'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react'

export default function PublicPricingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()

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
                    <th className="p-4 text-center">Starter</th>
                    <th className="p-4 text-center text-cyan-400 font-bold">Business</th>
                    <th className="p-4 text-center text-amber-400 font-bold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-4 font-semibold text-white">Monthly Cost (BDT)</td>
                    <td className="p-4 text-center font-mono font-bold text-white">৳ 1,999</td>
                    <td className="p-4 text-center font-mono font-bold text-cyan-300">৳ 4,999</td>
                    <td className="p-4 text-center font-mono font-bold text-amber-300">৳ 9,999</td>
                  </tr>
                  <tr>
                    <td className="p-4">User Accounts Included</td>
                    <td className="p-4 text-center font-mono">3 Users</td>
                    <td className="p-4 text-center font-mono text-cyan-300">10 Users</td>
                    <td className="p-4 text-center font-mono text-amber-300">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-4">Shop Branches & Factories</td>
                    <td className="p-4 text-center font-mono">1 Branch</td>
                    <td className="p-4 text-center font-mono text-cyan-300">3 Branches</td>
                    <td className="p-4 text-center font-mono text-amber-300">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-4">Monthly Job Orders</td>
                    <td className="p-4 text-center font-mono">50 Orders</td>
                    <td className="p-4 text-center font-mono text-cyan-300">500 Orders</td>
                    <td className="p-4 text-center font-mono text-amber-300">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-4">Instant SFT Pricing & Quotes</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4">Customer Dues & WhatsApp Messages</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4">Floor Kanban & Machine Queues</td>
                    <td className="p-4 text-center text-slate-500">—</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4">Flex Roll & Media Inventory</td>
                    <td className="p-4 text-center text-slate-500">—</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4">True Job Costing & Net Profit</td>
                    <td className="p-4 text-center text-slate-500">—</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                    <td className="p-4 text-center text-emerald-400">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="p-4">Dedicated Onboarding Specialist</td>
                    <td className="p-4 text-center text-slate-500">Standard Email</td>
                    <td className="p-4 text-center text-cyan-300">Priority Phone</td>
                    <td className="p-4 text-center text-amber-300">On-Site & 24/7 Dedicated</td>
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
