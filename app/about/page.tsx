'use client'

import React from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { FinalCTASection } from '@/components/marketing/final-cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingDemoProvider } from '@/components/marketing/demo-modal-context'
import { useI18n } from '@/i18n/context'
import {
  ShieldCheck,
  Target,
  HeartHandshake,
} from 'lucide-react'

export default function PublicAboutPage() {
  const { tBilingual } = useI18n()

  return (
    <MarketingDemoProvider>
      <div className="min-h-screen bg-muted text-foreground selection:bg-primary selection:text-white font-sans antialiased overflow-x-hidden">
        <MarketingNavbar />

        <main className="pt-20">
          {/* Banner */}
          <div className="py-16 sm:py-20 bg-card border-b border-border text-center px-4">
            <div className="mx-auto space-y-4">
              <span className="text-xs font-bold text-primary text-primary uppercase tracking-wider bg-primary/10 bg-primary/10 px-3 py-1 rounded-full border border-primary/20/70 border-border/60">
                Our Mission & Story
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground dark:text-white bangla-text tracking-tight">
                {tBilingual(
                  'Built for the Heart of Bangladesh Manufacturing.',
                  'বাংলাদেশের প্রিন্টিং ও সাইনেজ শিল্পের আধুনিক রূপান্তর।'
                )}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed bangla-text">
                {tBilingual(
                  'We believe Bangladesh’s printing presses and signage workshops deserve enterprise software crafted specifically for their craft, not generic corporate spreadsheets.',
                  'আমরা বিশ্বাস করি দেশের প্রতিটি প্রিন্টিং প্রেস ও সাইনেজ ওয়ার্কশপের নিজস্ব কাজের ধরনের সাথে মানানসই আধুনিক সফটওয়্যার পাওয়া উচিত।'
                )}
              </p>
            </div>
          </div>

          {/* Narrative & Origin Section */}
          <section className="py-16 sm:py-20 mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="space-y-6 text-sm sm:text-base text-foreground leading-relaxed">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground dark:text-white bangla-text">
                {tBilingual('Why Generic ERPs Fail in Print Shops', 'সাধারণ বিদেশি ইআরপি কেন প্রেসের কাজে ব্যর্থ হয়')}
              </h2>
              <p className="bangla-text">
                Traditional ERP systems like SAP, QuickBooks, or Odoo were built for standard retail products sold in integer quantities—like 5 shirts or 10 boxes of medicine.
              </p>
              <p className="bangla-text">
                A printing shop does not work that way. Every single order is a custom manufacturing project: a billboard is 20 feet by 10 feet (200 SFT) printed on Star Flex with 5% operator scrap, heat-welded hems, eyelet rings every 2 feet, pickup transport to the highway, and crane installation at midnight.
              </p>
              <p className="bangla-text">
                When press owners try to force generic retail software onto their floor, chaos ensues. Quotations are miscalculated, roll yields are untracked, and client dues get lost across WhatsApp conversations.
              </p>
            </div>

            {/* 3 Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="h-10 w-10 rounded-xl bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center font-bold border border-primary/20/60 border-border/60">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground dark:text-white bangla-text">
                  {tBilingual('Precision Math', 'নিখুঁত এসএফটি ও রোল হিসাব')}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                  Native algorithms for square footage, running feet perimeters, roll width nesting, and ink consumption.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="h-10 w-10 rounded-xl bg-success-surface bg-success-surface/60 text-success text-success flex items-center justify-center font-bold border border-success-border/60 border-success-border/60">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground dark:text-white bangla-text">
                  {tBilingual('Local Culture First', 'বাস্তব দেশীয় প্রেস কালচার')}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                  Built for BDT Taka, pure Bengali with Hind Siliguri, NBR Mushak 6.3 invoices, and bKash TrxID tracking.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-3 shadow-2xs">
                <div className="h-10 w-10 rounded-xl bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center font-bold border border-primary/20/60 border-border/60">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground dark:text-white bangla-text">
                  {tBilingual('Zero Data Loss', '১০০% নিরাপদ ক্লাউড ডেটা')}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                  Isolated multi-tenant architecture with automated backups and bank-grade encryption for all financial ledgers.
                </p>
              </div>
            </div>
          </section>

          <FinalCTASection />
        </main>

        <MarketingFooter />
      </div>
    </MarketingDemoProvider>
  )
}

