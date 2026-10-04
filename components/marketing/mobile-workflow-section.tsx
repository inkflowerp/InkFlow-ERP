'use client'

import React from 'react'
import {
 Smartphone,
 CheckCircle2,
 Clock,
 CreditCard,
 Bell,
 ArrowRight,
 Printer,
 UserCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function MobileWorkflowSection() {
 const { tBilingual } = useI18n()

 const MOBILE_BENEFITS = [
    {
 titleEn: 'Check Live Job Status',
 titleBn: 'চলমান কাজের অগ্রগতি দেখুন',
 descEn: 'See what is printing, laminating, or ready for delivery from your phone without calling the operator.',
 descBn: 'অপারেটরকে ফোন না দিয়েও যেকোনো সময় ফোন থেকেই জেনে নিন কোন কাজ প্রিন্ট হচ্ছে আর কোনটা রেডি।',
    },
    {
 titleEn: 'Review Customer Dues & Aging',
 titleBn: 'গ্রাহকের বকেয়া খাতা যাচাই',
 descEn: 'Check overdue balances before agreeing to new credit terms or dispatching high-value orders.',
 descBn: 'নতুন বাকির অর্ডার দেওয়ার আগে বা ডেলিভারির পূর্বে গ্রাহকের পুরোনো বকেয়া এক ক্লিকে দেখে নিন।',
    },
    {
 titleEn: 'Floor Task Updates on Budget Android',
 titleBn: 'কমদামী অ্যান্ড্রয়েডে ফ্লোর আপডেট',
 descEn: 'Operators tap"Start"and"Complete"on their mobile touch terminal with zero complexity.',
 descBn: 'মেশিন অপারেটররা কোনো ঝামেলা ছাড়াই মোবাইলে টাচ করে কাজ শুরু ও শেষ মার্ক করতে পারেন।',
    },
    {
 titleEn: 'Real-Time Operational Alerts',
 titleBn: 'রিয়েল-টাইম নোটিফিকেশন',
 descEn: 'Get instant alerts when emergency materials run low, quotes are approved, or payments are received.',
 descBn: 'রোল স্টক কমে গেলে, কোটেশন অ্যাপ্রুভ হলে কিংবা পেমেন্ট জমা পড়লে তাৎক্ষণিক অ্যালার্ট পান।',
    },
  ]

 return (
    <section className="py-16 sm:py-24 bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary bg-primary/10 text-primary border border-primary/20/70 border-border/60 uppercase tracking-wider">
            <Smartphone className="h-3.5 w-3.5"/>
            <span>{tBilingual('Anywhere Access', 'যেকোনো স্থান থেকে নিয়ন্ত্রণ')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight bangla-text">
            {tBilingual("Your Business, Even When You're Away From the Office.",
              'অফিস বা দোকানের বাইরে থাকলেও ব্যবসার পূর্ণ নিয়ন্ত্রণ আপনার হাতে।'
            )}
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed bangla-text">
            {tBilingual(
              'Whether meeting clients in Motijheel, visiting an installation site in Gazipur, or traveling outside Dhaka, stay fully connected to sales, production, and cash collections.',
              'মতিঝিলে ক্লায়েন্ট মিটিংয়ে থাকুন কিংবা গাজীপুরের সাইট পরিদর্শনে—মোবাইল থেকেই সেলস, প্রোডাকশন ও ক্যাশ কালেকশন তদারকি করুন।'
            )}
          </p>
        </div>

        {/* 2-Column Layout: Benefits List on Left, Realistic Mobile Snapshot on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Column (7 cols): Practical Benefits */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {MOBILE_BENEFITS.map((item, idx) => (
              <div
 key={idx}
 className="p-4 sm:p-5 rounded-xl border border-border bg-card shadow-2xs hover:border-input transition-all flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 bg-primary/10 text-primary text-primary flex items-center justify-center shrink-0 mt-0.5 border border-border border-border/60 font-bold text-xs">
                  0{idx + 1}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground bangla-text mb-1">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                    {tBilingual(item.descEn, item.descBn)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column (5 cols): Clean, Realistic Mobile Card Snapshot (No exaggerated device chrome) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl border border-border bg-card shadow-xs p-5 sm:p-6 space-y-4">
              {/* Phone Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Printer className="h-4 w-4 text-primary"/>
                  <span>PrintERP Mobile</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-surface text-success bg-success-surface text-success">
 Online Sync
                </span>
              </div>

              {/* Quick Today's Sales Stat */}
              <div className="p-3.5 rounded-xl bg-primary/10/60 bg-primary/10 border border-border border-border/40 space-y-1">
                <span className="text-xs text-primary text-primary font-semibold block uppercase">
                  {tBilingual("Today's Collections", 'আজকের কালেকশন')}
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black text-foreground tabular-nums">
                    ৳ 48,500
                  </span>
                  <span className="text-xs font-semibold text-success text-success">
                    6 Orders Settled
                  </span>
                </div>
              </div>

              {/* Representative Active Machine Task */}
              <div className="p-3.5 rounded-xl border border-border bg-muted space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Flora 10ft Solvent #1</span>
                  <span className="text-primary font-semibold">Running</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Job #084 (Star Flex):</span>
                    <span className="font-semibold text-foreground">200 SFT</span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-3/4 rounded-full"/>
                  </div>
                </div>
              </div>

              {/* Outstanding Due Snapshot */}
              <div className="p-3.5 rounded-xl border border-border bg-muted space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Akram Advertising</span>
                  <span className="text-destructive font-semibold">৳ 12,500 Due</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>14 days credit</span>
                  <span className="text-primary hover:underline font-semibold cursor-pointer">
 WhatsApp Reminder →
                  </span>
                </div>
              </div>

              {/* Operator Station Button */}
              <div className="pt-2">
                <div className="w-full h-10 rounded-xl bg-surface-inset text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                  <UserCheck className="h-3.5 w-3.5 text-primary"/>
                  <span>{tBilingual('Operator Floor Station Active', 'অপারেটর ফ্লোর স্টেশন সক্রিয়')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
