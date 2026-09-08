'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'
import { FileText, CheckCircle2, ShieldCheck, Scale, DollarSign } from 'lucide-react'

export default function TermsOfServicePage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { tBilingual } = useI18n()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        {/* Banner */}
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              Terms & Agreements
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual('Terms of Service & Subscription', 'ব্যবহারের শর্তাবলী ও সাবস্ক্রিপশন')}
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'Clear, fair terms governing the usage, billing, and support of the PrintERP SaaS platform.',
                'প্রিন্টইআরপি প্ল্যাটফর্ম ব্যবহার ও সেবার নীতিমালা।'
              )}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="h-5 w-5 text-cyan-400" />
              <span>1. SaaS Subscription & Free Trial</span>
            </h2>
            <p>
              PrintERP provides a 14-day fully featured trial with zero credit card commitment. At the conclusion of the trial period, organizations can select an active plan (Starter, Business, or Enterprise) billed in Bangladeshi Taka (৳ BDT) on a monthly or annual cycle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span>2. Billing, Upgrades & Cancellations</span>
            </h2>
            <p>
              Subscriptions can be upgraded, downgraded, or cancelled at any time through the tenant settings console. Payments can be settled via bKash Merchant, Nagad, direct Bank EFT, or authorized commercial credit channels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-fuchsia-400" />
              <span>3. Service Level Agreement (SLA) & Uptime</span>
            </h2>
            <p>
              PrintERP guarantees a 99.9% uptime SLA across all production infrastructure. Enterprise tier subscribers receive 24/7 dedicated telephone and on-site engineering escalation support in Bangladesh.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
