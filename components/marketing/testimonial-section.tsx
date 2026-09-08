'use client'

import React from 'react'
import {
  Star,
  Quote,
  Building2,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { TESTIMONIALS } from '@/lib/marketing/marketing-data'

export function TestimonialSection() {
  const { tBilingual } = useI18n()

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-950 relative overflow-hidden border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>{tBilingual('Customer Stories', 'গ্রাহকের বাস্তব অভিজ্ঞতা')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Trusted by Bangladesh Print & Signage Leaders.',
              'বাংলাদেশের প্রথম সারির প্রিন্ট ও সাইনেজ ব্যবসায়ীদের আস্থা।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'See how commercial workshops across Dhaka, Chittagong, and Bogura transformed their shop operations with PrintERP.',
              'ঢাকা, চট্টগ্রাম ও বগুড়ার শীর্ষস্থানীয় প্রেসগুলো কীভাবে প্রিন্টইআরপি ব্যবহার করে তাদের লোকসান বন্ধ করেছে।'
            )}
          </p>
        </div>

        {/* 3 Testimonials Grid */}
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {TESTIMONIALS.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7 md:p-8 flex flex-col justify-between relative group hover:border-slate-700 transition-colors shadow-lg"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* 5 Star Rating */}
                <div className="flex items-center gap-1">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[11px] sm:text-xs font-bold text-slate-400 ml-1.5">5.0 / 5</span>
                </div>

                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic bangla-text">
                  &ldquo;{tBilingual(item.quoteEn, item.quoteBn)}&rdquo;
                </p>

                {/* Highlight Badge */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] sm:text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5 bangla-text">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{tBilingual(item.highlightEn, item.highlightBn)}</span>
                </div>
              </div>

              {/* Author Footer */}
              <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-800/80 flex items-center gap-3 sm:gap-3.5">
                <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shrink-0">
                  {item.nameEn.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs sm:text-sm truncate bangla-text">
                    {tBilingual(item.nameEn, item.nameBn)}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 truncate bangla-text">
                    {tBilingual(item.roleEn, item.roleBn)} • {tBilingual(item.companyEn, item.companyBn)}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-500 mt-0.5 bangla-text">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{tBilingual(item.locationEn, item.locationBn)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Development Placeholder Notice */}
        <div className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-slate-500 font-mono">
          * Representative customer testimonials based on real Bangladesh commercial printing workflows.
        </div>
      </div>
    </section>
  )
}
