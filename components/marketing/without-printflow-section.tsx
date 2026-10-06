'use client'

import React from 'react'
import {
  MessageSquare,
  FileText,
  PhoneCall,
  HelpCircle,
  FileQuestion,
  AlertTriangle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function WithoutPrintFlowSection() {
  const { tBilingual } = useI18n()

  const PROBLEMS = [
    {
      channelEn: 'WhatsApp',
      channelBn: 'হোয়াটসঅ্যাপ',
      issueEn: 'Quotations',
      issueBn: 'কোটেশন',
      icon: MessageSquare,
    },
    {
      channelEn: 'Paper Slips',
      channelBn: 'ছেঁড়া কাগজ',
      issueEn: 'Job Orders',
      issueBn: 'জব অর্ডার',
      icon: FileText,
    },
    {
      channelEn: 'Phone Calls',
      channelBn: 'ঘন ঘন ফোন',
      issueEn: 'Employee Updates',
      issueBn: 'কাজের খোঁজ',
      icon: PhoneCall,
    },
    {
      channelEn: 'Guesswork',
      channelBn: 'অনুমানের হিসাব',
      issueEn: 'Inventory & Stock',
      issueBn: 'রোল স্টক',
      icon: HelpCircle,
    },
    {
      channelEn: 'Paper Notes',
      channelBn: 'ডায়েরির নোট',
      issueEn: 'Customer Dues',
      issueBn: 'বাকি টাকা',
      icon: FileQuestion,
    },
  ]

  return (
    <section className="py-14 sm:py-18 bg-muted/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-3 w-3" />
            <span>{tBilingual('Without PrintFlow', 'প্রিন্টফ্লো ছাড়া অবস্থা')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {tBilingual('Too Much Work. Too Many Places.', 'অনেক কাজ। নানা জায়গায় ছড়িয়ে-ছিটিয়ে।')}
          </h2>
        </div>

        {/* 5 Minimal Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
          {PROBLEMS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-destructive/30 transition-all text-center space-y-3"
              >
                <div className="h-10 w-10 mx-auto rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    {tBilingual(item.channelEn, item.channelBn)}
                  </span>
                  <span className="text-sm font-bold text-foreground block mt-0.5">
                    {tBilingual(item.issueEn, item.issueBn)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
