'use client'

import React, { useState } from 'react'
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Printer,
  TrendingUp,
  FileText,
  Clock,
  Briefcase,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { ROLE_DETAILS } from '@/lib/marketing/marketing-data'

export function RoleBasedSection() {
  const { tBilingual } = useI18n()
  const [activeRole, setActiveRole] = useState<string>('owner')

  const current = ROLE_DETAILS.find((r) => r.id === activeRole) || ROLE_DETAILS[0]

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-slate-900/60 relative overflow-hidden border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider bangla-text">
            <Users className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>{tBilingual('Role-Based Access Control (RBAC)', 'ভূমিকা ভিত্তিক সুনির্দিষ্ট ইন্টারফেস')}</span>
          </div>

          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight bangla-text">
            {tBilingual(
              'Everyone Knows What They Need to Do.',
              'প্রতিটি কর্মীর জন্য সুনির্দিষ্ট ও পরিষ্কার কর্মপরিকল্পনা।'
            )}
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 leading-relaxed bangla-text">
            {tBilingual(
              'PrintERP provides tailor-made workspaces for each team member. Machine operators are not overwhelmed with financial balance sheets, and designers only see artwork proofs and dimensions.',
              'মালিকের সামনে থাকবে সামগ্রিক আর্থিক লাভ ও বকেয়ার চিত্র, ডিজাইনার পাবেন শুধুমাত্র আর্টওয়ার্কের প্রুফ, আর অপারেটর পাবেন তার মেশিনের কাজের তালিকা।'
            )}
          </p>
        </div>

        {/* Horizontal Role Switcher Pills */}
        <div className="mt-8 sm:mt-12 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 sm:pb-4 no-scrollbar">
          {ROLE_DETAILS.map((r) => {
            const isSelected = activeRole === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer bangla-text shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50 border border-purple-400/40'
                    : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tBilingual(r.titleEn, r.titleBn)}
              </button>
            )
          })}
        </div>

        {/* Selected Role Interactive Showcase Box */}
        <div className="mt-4 sm:mt-6 max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-slate-950/90 p-4 sm:p-8 md:p-10 shadow-2xl shadow-purple-950/20 space-y-6 sm:space-y-8 animate-in fade-in-0 duration-300">
          {/* Header Bar of Active Role */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white bangla-text">
                  {tBilingual(current.titleEn, current.titleBn)}
                </h3>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] sm:text-xs">
                  {tBilingual(current.badgeEn, current.badgeBn)}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Optimized interface tailored for operational responsibilities and speed.
              </p>
            </div>

            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-800 shrink-0 self-start sm:self-auto">
              Role ID: {current.id.toUpperCase()}
            </span>
          </div>

          {/* 4 Role Specific KPIs */}
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 sm:mb-3">
              Role Focused KPI Dashboard
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {current.metrics.map((m, idx) => (
                <div key={idx} className="p-2.5 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block bangla-text">
                    {tBilingual(m.labelEn, m.labelBn)}
                  </span>
                  <div className="text-sm sm:text-lg font-black text-white tabular-nums tracking-tight">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Permissions & Daily Duties */}
          <div className="pt-2">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 sm:mb-3">
              Primary Responsibilities & Permission Guardrails
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {current.dutiesEn.map((duty, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs sm:text-sm text-slate-200"
                >
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed bangla-text">
                    {tBilingual(duty, current.dutiesBn[idx])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
