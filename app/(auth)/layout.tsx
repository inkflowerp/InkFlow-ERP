import React from 'react'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { Printer, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50 dark:bg-[#080B16]">
      {/* Left Branding Showcase Column (Visible on LG 1024px+) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-[#0B1024] via-[#0E1630] to-[#121B3B] p-10 xl:p-14 text-white overflow-hidden border-r border-slate-800/80">
        {/* Background Ambient Color Orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group cursor-pointer">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform shrink-0">
              <Printer className="h-5 w-5" />
              {/* CMYK Accent Dots */}
              <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" title="Cyan" />
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" title="Magenta" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Yellow" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900 border border-slate-700" title="Key" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  InkFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">PrintERP</span>
                </span>
                <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/30">
                  BD SaaS
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                Printing & Signage Operating System
              </span>
            </div>
          </Link>
        </div>

        {/* Center Philosophy & BD Printing Showcase */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-950/60 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md border border-cyan-800/50 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>🇧🇩 Tailored for Bangladesh Print, Signage & Packaging</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-black leading-[1.18] tracking-tight text-white">
              Easier than Excel. <br />
              Faster than paper. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                Built for your shop floor.
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              From Fakirapool offset presses and Nilkhet digital hubs to Chittagong LED signage fabricators—estimate square feet, track job tickets, manage paper inventory, and collect payments effortlessly.
            </p>
          </div>

          {/* Quick Value Props Chips */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>১২+ প্রিন্ট ইন্ডাস্ট্রি</span>
              </div>
              <p className="text-[11px] text-slate-400">ডিজিটাল, অফসেট, ব্যানার, এক্রিলিক, এলইডি ও ডাই-কাটিং</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>৳ BDT ও বাংলা ইনভয়েস</span>
              </div>
              <p className="text-[11px] text-slate-400">মুসক ৬.৩ চালান, গেটপাস, ডিসকাউন্ট ও বকেয়া খাতা</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>Multi-Tenant RLS & 256-Bit SSL Isolated</span>
          </div>
          <span className="font-medium text-slate-400">© {new Date().getFullYear()} InkFlow PrintERP</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-14 overflow-y-auto">
        {/* Top Bar on Right: Mobile Logo + Language Switcher */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-2 shrink-0">
          {/* Mobile Only Brand Icon */}
          <Link href="/" className="lg:hidden flex items-center gap-2 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
              <Printer className="h-4 w-4" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              InkFlow <span className="text-cyan-600 dark:text-cyan-400">PrintERP</span>
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
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 shrink-0">
          <span>Need setup assistance or customized onboarding? Hotline: </span>
          <a
            href="tel:+8801700000000"
            className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            +880 1700-000000
          </a>
        </div>
      </div>
    </div>
  )
}

