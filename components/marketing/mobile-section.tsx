'use client'

import React, { useState } from 'react'
import {
  Smartphone,
  CheckCircle2,
  DollarSign,
  Printer,
  CreditCard,
  PlusCircle,
  Boxes,
  PhoneCall,
  Sparkles,
  ArrowRight,
  Send,
  Clock,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'

export function MobileSection() {
  const { tBilingual } = useI18n()
  const [mobileScreen, setMobileScreen] = useState<'sales' | 'jobs' | 'due' | 'quote'>('sales')

  const MOBILE_FEATURES = [
    {
      id: 'sales',
      titleEn: "Check Today's Sales & Cash",
      titleBn: 'আজকের বিক্রি ও নগদ ক্যাশ দেখা',
      descEn: 'See gross collections, bank transfers, and cash-in-hand live from your smartphone.',
      descBn: 'দোকানে না থেকেও মোবাইলে লাইভ দেখুন কত টাকা বিক্রি হলো আর ড্রয়ারে কত ক্যাশ আছে।',
    },
    {
      id: 'jobs',
      titleEn: 'Track Machine & Job Status',
      titleBn: 'মেশিন ও জব অর্ডারের অগ্রগতি',
      descEn: 'Check which billboard is on the press, which is in lamination, and what is ready.',
      descBn: 'কোন কাজটা মেশিনে রানিং, কোনটা ফিনিশিংয়ে আর কোনটা ডেলিভারি রেডি তা এক ক্লিকে জানুন।',
    },
    {
      id: 'due',
      titleEn: 'Check Dues & Send WhatsApp',
      titleBn: 'বকেয়া চেক ও হোয়াটসঅ্যাপ রিমাইন্ডার',
      descEn: 'Look up customer ledger balances and send 1-click polite payment reminder messages.',
      descBn: 'গ্রাহকের বাকি টাকার পরিমাণ দেখুন এবং ১ ট্যাপে হোয়াটসঅ্যাপে তাগাদার মেসেজ পাঠিয়ে দিন।',
    },
    {
      id: 'quote',
      titleEn: 'Create Fast Quotes on the Go',
      titleBn: 'যাত্রাপথেও দ্রুত কোটেশন তৈরি',
      descEn: 'Client called on the road? Enter dimensions and quote accurate SFT rates in 30 seconds.',
      descBn: 'পথে থাকা অবস্থায় ক্লায়েন্ট ফোন করলে মাপ বসিয়ে ৩০ সেকেন্ডেই নির্ভুল কোটেশন দিন।',
    },
  ]

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Left Text Column (6 Cols) */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider bangla-text">
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              <span>{tBilingual('Installable PWA Architecture', 'স্মার্টফোন ফ্রেন্ডলি মোবাইল ইআরপি')}</span>
            </div>

            <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
              {tBilingual(
                'Run Your Business From Anywhere.',
                'যেকোনো স্থান থেকে আপনার প্রেস ব্যবসা পরিচালনা করুন।'
              )}
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 leading-relaxed italic font-medium bangla-text">
              &ldquo;
              {tBilingual(
                "Your business doesn't stop when you leave the office.",
                'অফিস থেকে বের হলেও আপনার ব্যবসা কিন্তু থেমে থাকে না।'
              )}
              &rdquo;
            </p>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed bangla-text">
              {tBilingual(
                'PrintERP was crafted from day one as a lightweight, touch-optimized mobile experience. Whether you are at a client meeting, inspecting a billboard on the highway, or sitting at home, you have 100% control.',
                'প্রিন্টইআরপি শুরু থেকেই স্মার্টফোনের জন্য অত্যন্ত দ্রুতগতি ও হালকা করে তৈরি। ক্লায়েন্ট মিটিংয়ে থাকুন, হাইওয়েতে বিলবোর্ড পরিদর্শনে যান বা বাড়িতে থাকুন—পুরো ব্যবসা আপনার হাতের মুঠোয়।'
              )}
            </p>

            {/* Interactive Feature Selectors */}
            <div className="space-y-2.5 sm:space-y-3 pt-2">
              {MOBILE_FEATURES.map((f) => {
                const isSelected = mobileScreen === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => setMobileScreen(f.id as any)}
                    className={`cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-900 shadow-md shadow-cyan-950/40'
                        : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-white bangla-text">
                        {tBilingual(f.titleEn, f.titleBn)}
                      </h4>
                      {isSelected && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-wider shrink-0 ml-2">
                          Viewing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-relaxed bangla-text">
                      {tBilingual(f.descEn, f.descBn)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Smartphone Mockup Visual (6 Cols) */}
          <div className="lg:col-span-6 flex justify-center w-full overflow-hidden">
            <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[340px] rounded-[36px] sm:rounded-[44px] border-[6px] sm:border-[8px] border-slate-800 bg-slate-950 p-3 sm:p-4 shadow-2xl shadow-cyan-950/50 mx-auto">
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 sm:h-4 w-24 sm:w-28 bg-slate-800 rounded-full flex items-center justify-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-slate-900 inline-block mr-2" />
                <span className="h-1 sm:h-1.5 w-6 sm:w-8 bg-slate-900 rounded-full inline-block" />
              </div>

              {/* Mobile Screen Content */}
              <div className="mt-3 sm:mt-4 rounded-[26px] sm:rounded-[32px] bg-slate-900 p-3 sm:p-4 border border-slate-800/80 space-y-3.5 sm:space-y-4 min-h-[460px] sm:min-h-[520px] text-xs">
                {/* Mobile App Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-cyan-500 text-white flex items-center justify-center font-bold text-xs">
                      P
                    </div>
                    <span className="font-bold text-white text-xs">Padma Digital</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/40 py-0 h-4">
                    Online
                  </Badge>
                </div>

                {/* DYNAMIC SCREEN PREVIEW ACCORDING TO USER CLICK */}
                {mobileScreen === 'sales' && (
                  <div className="space-y-2.5 sm:space-y-3 animate-in fade-in-0 duration-200">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-mono">Today's Revenue</span>
                      <div className="text-lg sm:text-xl font-black text-white tabular-nums mt-0.5">৳ 48,500</div>
                      <span className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold">+18% vs Yesterday</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[9px] sm:text-[10px] text-slate-400">Cash in Drawer</span>
                        <div className="font-bold text-white tabular-nums mt-0.5 text-xs sm:text-sm">৳ 24,000</div>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[9px] sm:text-[10px] text-slate-400">bKash Merchant</span>
                        <div className="font-bold text-white tabular-nums mt-0.5 text-xs sm:text-sm">৳ 24,500</div>
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase">Recent Mobile Invoices</span>
                      <div className="text-[10px] sm:text-[11px] text-slate-300 flex justify-between">
                        <span className="truncate pr-1">Beximco Expo Standee</span>
                        <span className="font-bold text-white shrink-0">৳ 6,800</span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-300 flex justify-between">
                        <span className="truncate pr-1">Akij Star Flex Banner</span>
                        <span className="font-bold text-white shrink-0">৳ 18,500</span>
                      </div>
                    </div>
                  </div>
                )}

                {mobileScreen === 'jobs' && (
                  <div className="space-y-2 sm:space-y-2.5 animate-in fade-in-0 duration-200">
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase">Live Machine Queue</div>
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-1">
                      <div className="flex justify-between font-semibold text-white text-[11px]">
                        <span className="truncate pr-1">ORD-284 Akij Billboard</span>
                        <span className="text-cyan-400 font-bold shrink-0">Printing</span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400">Flora 10ft Solvent • 80% Done</div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex justify-between font-semibold text-white text-[11px]">
                        <span className="truncate pr-1">ORD-285 Rollup Stand</span>
                        <span className="text-amber-400 font-bold shrink-0">Lamination</span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400">Finishing Station • 3 pcs</div>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex justify-between font-semibold text-white text-[11px]">
                        <span className="truncate pr-1">ORD-286 Acrylic Letters</span>
                        <span className="text-fuchsia-400 font-bold shrink-0">Laser Cut</span>
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400">Fabrication Hub • Red Cast</div>
                    </div>
                  </div>
                )}

                {mobileScreen === 'due' && (
                  <div className="space-y-2.5 sm:space-y-3 animate-in fade-in-0 duration-200">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/30 border border-amber-500/40">
                      <span className="text-[9px] sm:text-[10px] text-amber-400 uppercase font-mono">Total Pending Due</span>
                      <div className="text-lg sm:text-xl font-black text-amber-300 tabular-nums mt-0.5">৳ 1,24,000</div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400">8 client accounts overdue</span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between font-bold text-white text-[10px] sm:text-[11px]">
                        <span className="truncate pr-1">Rahim Advertising</span>
                        <span className="text-amber-400 shrink-0">৳ 20,000 Due</span>
                      </div>
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] h-7">
                        <Send className="h-3 w-3 mr-1" /> WhatsApp Due Reminder
                      </Button>
                    </div>
                  </div>
                )}

                {mobileScreen === 'quote' && (
                  <div className="space-y-2 sm:space-y-2.5 animate-in fade-in-0 duration-200">
                    <div className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase">Quick SFT Estimator</div>
                    <div className="p-2 sm:p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Size: 5ft × 10ft</span>
                        <span className="font-bold text-white">50 SFT</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Media: Star Flex</span>
                        <span className="font-bold text-cyan-400">৳ 80 / sft</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white">
                        <span>Total Estimate:</span>
                        <span className="text-cyan-300">৳ 4,000</span>
                      </div>
                      <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] h-7 mt-1">
                        Generate Quote PDF
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mobile Bottom Navigation Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-[10px] text-slate-400">
                  <span className="text-cyan-400 font-bold">Home</span>
                  <span>Orders</span>
                  <span>Queue</span>
                  <span>Due</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
