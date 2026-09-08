import React from 'react'
import { LanguageSwitcher } from '@/components/shell/language-switcher'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left Branding Showcase Column */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-12 text-white overflow-hidden">
        {/* Background Subtle Gradient Blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid grid-cols-2 gap-1 p-1.5 rounded-lg bg-slate-800 shadow-md">
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="h-3 w-3 rounded-full bg-pink-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white">
              Print<span className="text-cyan-400">ERP</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Bangladesh SaaS
            </span>
          </div>
        </div>

        {/* Center Philosophy & BD Printing Showcase */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cyan-300 backdrop-blur-md border border-white/10">
            <span>🇧🇩 Tailored for Bangladesh Print & Signage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-white">
            Easier than Excel. <br />
            Faster than paper. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Built for your shop floor.
            </span>
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            From Fakirapool offset presses to Chittagong LED signage fabricators—track quotations, square-foot calculations, production jobs, and delivery with ease.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <p className="font-bold text-white text-base">১২+ ইন্ডাস্ট্রি</p>
              <p className="text-slate-400">ডিজিটাল, অফসেট, ব্যানার, এলইডি ও সাইনেজ</p>
            </div>
            <div>
              <p className="font-bold text-white text-base">৳ BDT ও বাংলা</p>
              <p className="text-slate-400">দ্বিভাষিক ইনভয়েস ও এলাকা ভিত্তিক ডেলিভারি</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} PrintERP Bangladesh. All rights reserved.</span>
          <span className="font-medium">Unicode UTF-8 & RLS Secured</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto w-full max-w-md my-auto py-8">
          {children}
        </div>

        <div className="text-center text-xs text-slate-400">
          <span>Need support? Call hotline: </span>
          <span className="font-medium text-slate-600 dark:text-slate-300">+880 1700-000000</span>
        </div>
      </div>
    </div>
  )
}
