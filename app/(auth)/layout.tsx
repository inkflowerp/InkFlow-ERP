'use client'

import React from 'react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { Printer, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { usePlatformSettings } from '@/hooks/use-platform-settings'
import { useI18n } from '@/i18n/context'
import { BRAND } from '@/config/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { appName, appLogoUrl, tagline, supportHelpline, contactPhone } = usePlatformSettings()
  const { locale } = useI18n()

  const isBn = locale === 'bn'

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background text-foreground">
      {/* Left Branding Showcase Column (Visible on LG 1024px+) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-card p-10 xl:p-14 text-foreground overflow-hidden border-r border-border shadow-xs">
        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group cursor-pointer">
            {appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt={appName || 'PrintFlow'}
                className="h-10 w-10 rounded-xl object-contain bg-card border border-border p-1 shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
            ) : (
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Printer className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {appName || 'PrintFlow'}
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
                  {isBn ? 'বিডি ক্লাউড' : 'BD SaaS'}
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                {isBn ? 'প্রিন্টিং ও সাইনেজ অপারেটিং সিস্টেম' : (tagline || 'Printing & Signage Operating System')}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Philosophy & BD Printing Showcase */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>
              {isBn
                ? '🇧🇩 বাংলাদেশের প্রিন্টিং, সাইনেজ ও প্যাকেজিংয়ের জন্য তৈরি'
                : '🇧🇩 Tailored for Bangladesh Print, Signage & Packaging'}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black leading-tight tracking-tight text-foreground">
              {isBn ? (
                <>
                  এক্সেলের চেয়ে সহজ। <br />
                  কাগজের চেয়ে দ্রুত। <br />
                  <span className="text-primary">
                    আপনার প্রেসের জন্য তৈরি।
                  </span>
                </>
              ) : (
                <>
                  Easier than Excel. <br />
                  Faster than paper. <br />
                  <span className="text-primary">
                    Built for your shop floor.
                  </span>
                </>
              )}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isBn
                ? 'ফকিরাপুলের অফসেট প্রেস ও নীলক্ষেতের ডিজিটাল হাব থেকে চট্টগ্রামের এলইডি সাইনেজ কারখানা—স্কয়ার ফিট হিসাব, জব টিকিট ট্র্যাকিং, কাগজের স্টক এবং পেমেন্ট আদায় করুন সহজেই।'
                : 'From Fakirapool offset presses and Nilkhet digital hubs to Chittagong LED signage fabricators—estimate square feet, track job tickets, manage paper inventory, and collect payments effortlessly.'}
            </p>
          </div>

          {/* Quick Value Props Chips */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>{isBn ? '১২+ প্রিন্ট ইন্ডাস্ট্রি' : '12+ Print Segments'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'ডিজিটাল, অফসেট, ব্যানার, এক্রিলিক, এলইডি ও ডাই-কাটিং'
                  : 'Digital, offset, banner, acrylic, LED & die-cutting'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>{isBn ? '৳ BDT ও বাংলা ইনভয়েস' : '৳ BDT & Invoicing'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'মূসক ৬.৩ চালান, গেটপাস, ডিসকাউন্ট ও বকেয়া খাতা'
                  : 'Mushak 6.3 challan, gate pass, discounts & due ledger'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>
              {isBn
                ? 'মাল্টি-টেন্যান্ট RLS এবং ২৫৬-বিট SSL সুরক্ষিত'
                : 'Multi-Tenant RLS & 256-Bit SSL Isolated'}
            </span>
          </div>
          <span className="font-medium text-muted-foreground">© {new Date().getFullYear()} {appName || 'PrintFlow'}</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-14 overflow-y-auto">
        {/* Top Bar on Right: Mobile Logo + Language Switcher */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-2 shrink-0">
          {/* Mobile Only Brand Icon */}
          <Link href="/" className="lg:hidden flex items-center gap-2 group">
            {appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt={appName || 'PrintFlow'}
                className="h-8 w-8 rounded-lg object-contain bg-card border border-border p-1 shadow-xs"
              />
            ) : (
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Printer className="h-4 w-4" />
              </div>
            )}
            <span className="text-base font-black tracking-tight text-foreground">
              {appName || 'PrintFlow'}
            </span>
          </Link>

          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Dynamic Auth Children Form */}
        <div className="mx-auto w-full max-w-md my-auto py-4">
          {children}
        </div>

        {/* Support Hotline / Help */}
        <div className="text-center text-xs text-muted-foreground mt-4 shrink-0">
          <span>
            {isBn
              ? 'সেটআপ বা অনবোর্ডিং সহায়তা প্রয়োজন? হটলাইন: '
              : 'Need setup assistance or customized onboarding? Hotline: '}
          </span>
          <a
            href={`tel:${(supportHelpline || contactPhone || BRAND.helplineE164).replace(/[^\d+]/g, '')}`}
            className="font-semibold text-primary hover:underline tabular-nums"
          >
            {supportHelpline || contactPhone || BRAND.helplineDisplay}
          </a>
        </div>
      </div>
    </div>
  )
}
