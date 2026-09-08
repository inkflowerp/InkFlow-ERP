'use client'

import React from 'react'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Boxes,
  Users,
  CreditCard,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  PieChart,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'

export function ReportingSection() {
  const { tBilingual } = useI18n()

  const REPORT_CARDS = [
    { titleEn: 'Daily Sales & Revenue', titleBn: 'দৈনিক সেলস ও আয়', descEn: 'Sales broken down by print product, client segment, and branch location.', descBn: 'পণ্য, গ্রাহক ক্যাটাগরি ও ব্রাঞ্চ ভিত্তিক দৈনিক বিক্রির পূর্ণাঙ্গ হিসাব।' },
    { titleEn: 'Machine Production Output', titleBn: 'মেশিন প্রোডাকশন আউটপুট', descEn: 'Square feet printed per machine with downtime analysis and speed bottlenecks.', descBn: 'মেশিন প্রতি প্রিন্ট স্কয়ারফিট, ডাউনটাইম ও উৎপাদন গতি পর্যবেক্ষণ।' },
    { titleEn: 'Raw Material Inventory & Yield', titleBn: 'কাঁচামাল ও রোল ব্যবহার', descEn: 'Flex roll consumption, ink usage in liters, and roll scrap optimization.', descBn: 'ফ্লেক্স রোল ব্যবহার, লিটার প্রতি কালির হিসাব এবং ওয়েস্টেজ বিশ্লেষণ।' },
    { titleEn: 'Expense Vouchers & Petty Cash', titleBn: 'খরচ ভাউচার ও পেটি ক্যাশ', descEn: 'Categorized electricity, transport, rent, tea/snacks, and machine spare parts.', descBn: 'বিদ্যুৎ, দোকান ভাড়া, পরিবহন, আপ্যায়ন ও মেশিন পার্টসের খরচের হিসাব।' },
    { titleEn: 'Customer Due Aging Buckets', titleBn: 'গ্রাহক বকেয়া ও বয়স ভিত্তিক খাতা', descEn: 'Accounts receivable sorted by 15-day, 30-day, and 60-day overdue thresholds.', descBn: '১৫ দিন, ৩০ দিন ও ৬০ দিনের বেশি পুরোনো বকেয়ার নিখুঁত বয়স ভিত্তিক তালিকা।' },
    { titleEn: 'Net Profit & Job Margins', titleBn: 'প্রকৃত নিট লাভ ও মার্জিন', descEn: 'Consolidated gross vs net profit after direct costs and overhead deductions.', descBn: 'প্রত্যক্ষ খরচ ও কারখানার ওভারহেড বাদ দিয়ে প্রকৃত নিট লাভের সামারি।' },
    { titleEn: 'Worker & Operator Shifts', titleBn: 'কারিগরদের কাজের পারফরম্যান্স', descEn: 'Square footage completed, overtime hours logged, and attendance rates.', descBn: 'অপারেটরদের শিফট প্রতি প্রিন্ট সংখ্যা, ওভারটাইম ঘণ্টা ও হাজিরা রিপোর্ট।' },
    { titleEn: 'Material Wastage & Reworks', titleBn: 'মিডিয়া অপচয় ও নষ্ট কাজ নিরীক্ষা', descEn: 'Root-cause tracking for torn flex, misprints, and color calibration errors.', descBn: 'কালি ছিটকে যাওয়া বা ফ্লেক্স কাটার ভুলের কারণে অপচয়ের কারণ ট্র্যাকিং।' },
  ]

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{tBilingual('Business Intelligence & Analytics', 'বিজনেস ইন্টেলিজেন্স ও রিপোর্টস')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Turn Your Business Data Into Better Decisions.',
              'আপনার প্রেসের ডেটা কাজে লাগিয়ে ব্যবসায়িক সিদ্ধান্ত নিন।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'Stop relying on guesswork at the end of the month. PrintERP compiles automatic financial audits, material wastage analytics, and machine yield reports so you know your exact numbers.',
              'মাস শেষে আন্দাজে সিদ্ধান্ত নেওয়া বন্ধ করুন। প্রিন্টইআরপির অটোমেটিক অডিট, ওয়েস্টেজ এনালাইসিস এবং প্রফিট রিপোর্ট দিয়ে জেনে নিন আপনার প্রেসের খাঁটি চিত্র।'
            )}
          </p>
        </div>

        {/* 4 Executive Metric Widgets Banner */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto">
          <div className="p-3.5 sm:p-5 rounded-2xl border border-cyan-500/30 bg-slate-900/90 shadow-lg space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-mono bangla-text truncate block">
              {tBilingual('Monthly Sales', 'মাসিক বিক্রয়')}
            </span>
            <div className="text-xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
              ৳ 125,000
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-400 font-semibold">
              <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> +24% vs last mo
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl border border-emerald-500/30 bg-slate-900/90 shadow-lg space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-mono bangla-text truncate block">
              {tBilingual('Collected Cash', 'আদায়কৃত নগদ')}
            </span>
            <div className="text-xl sm:text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
              ৳ 42,500
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">Cash & MFS</span>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl border border-amber-500/30 bg-slate-900/90 shadow-lg space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-mono bangla-text truncate block">
              {tBilingual('Remaining Due', 'বকেয়া বিল')}
            </span>
            <div className="text-xl sm:text-3xl font-black text-amber-400 tabular-nums tracking-tight">
              ৳ 18,200
            </div>
            <span className="text-[10px] sm:text-[11px] text-amber-400/80 truncate block">3 overdue</span>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl border border-blue-500/30 bg-slate-900/90 shadow-lg space-y-1 sm:space-y-2">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-mono bangla-text truncate block">
              {tBilingual('Estimated Profit', 'আনুমানিক নিট লাভ')}
            </span>
            <div className="text-xl sm:text-3xl font-black text-cyan-300 tabular-nums tracking-tight">
              ৳ 36,800
            </div>
            <span className="text-[10px] sm:text-[11px] text-cyan-400/80 truncate block">After costs</span>
          </div>
        </div>

        {/* 8 Report Cards Grid */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {REPORT_CARDS.map((r, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/80 transition-all space-y-2 sm:space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-900 text-cyan-400 flex items-center justify-center font-bold text-xs border border-slate-800 shrink-0">
                  {idx + 1}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Export: XLS / PDF</span>
              </div>

              <h4 className="text-sm font-bold text-white bangla-text">
                {tBilingual(r.titleEn, r.titleBn)}
              </h4>

              <p className="text-xs text-slate-400 leading-relaxed bangla-text">
                {tBilingual(r.descEn, r.descBn)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
