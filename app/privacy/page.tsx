'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'
import { ShieldCheck, Lock, Database, Eye, FileText } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
              Legal & Compliance
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual('Privacy Policy & Data Security', 'গোপনীয়তা নীতি ও ডেটা সুরক্ষা')}
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'How PrintERP protects your customer records, financial ledgers, and artwork files with bank-grade security standards.',
                'আপনার প্রতিষ্ঠানের আর্থিক হিসাব, গ্রাহকের তথ্য ও ফাইলসমূহ কীভাবে সুরক্ষিত রাখা হয়।'
              )}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <span>1. Tenant Isolation & Data Ownership</span>
            </h2>
            <p>
              Your print shop data belongs 100% to your enterprise. PrintERP utilizes row-level multi-tenant isolation and PostgreSQL encryption to guarantee that no other shop or unauthorized third party can ever view your quotation pricing, profit margins, customer credit ledgers, or employee salaries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" />
              <span>2. Encryption & Financial Data</span>
            </h2>
            <p>
              All traffic between your browser or mobile phone and the PrintERP cloud is encrypted using TLS 1.3 with AES-256 standards. Financial records (e.g. bKash TrxID numbers, cash receipts, and customer debts) are audited with immutable timestamping.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-fuchsia-400" />
              <span>3. Automated Backups & Disaster Recovery</span>
            </h2>
            <p>
              Daily automated encrypted backups are distributed across multiple geo-redundant data centers. In the event of device failure at your printing press in Dhaka or Chattogram, your entire operating state is recoverable in under 60 seconds.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-400" />
              <span>4. Contact & Data Inquiries</span>
            </h2>
            <p>
              If you have any questions regarding data compliance, export requests, or security audits, contact our Dhaka data protection desk at <span className="text-cyan-400 font-mono">privacy@printerp.com.bd</span>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
