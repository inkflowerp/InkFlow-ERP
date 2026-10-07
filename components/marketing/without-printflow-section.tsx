'use client'

import React from 'react'
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  PhoneCall,
  FileQuestion,
  Clock,
  Scissors,
  XCircle,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function WithoutPrintFlowSection() {
  const { tBilingual } = useI18n()

  const PROBLEMS = [
    {
      categoryEn: 'Handwritten Paper Slips',
      categoryBn: 'কাগজের চিরকুট ও ছেঁড়া স্লিপ',
      impactEn: 'Job orders written on torn paper get stained by solvent ink, torn, or lost on the shop floor. Costly reprints come out of your own pocket.',
      impactBn: 'ছেঁড়া কাগজে হাতে লেখা স্লিপ সলভেন্ট কালিতে নষ্ট হয়ে যায় বা ফ্লোরে হারিয়ে যায়। ভুল প্রিন্ট হলে পুরো লোকসান আপনার নিজের পকেট থেকে যায়।',
      icon: FileText,
      tagEn: 'Misprinted Orders',
      tagBn: 'ভুল প্রিন্ট ও লোকসান',
    },
    {
      categoryEn: 'Roll Stock Guesswork',
      categoryBn: 'অনুমানের স্টক ও মাঝপথে রোল শেষ',
      impactEn: 'Flex and vinyl rolls run out unexpectedly in the middle of a rush print at 10 PM. Operators wait idle while you scramble across town for media.',
      impactBn: 'রাত ১০টায় জরুরি প্রিন্টের মাঝপথে হঠাৎ ফ্লেক্স বা ভিনাইল রোল শেষ হয়ে যায়। মেটেরিয়াল খুঁজতে ছোটাছুটি করতে হয় আর মেশিন অলস বসে থাকে।',
      icon: HelpCircle,
      tagEn: 'Delayed Jobs',
      tagBn: 'দেরি ও কাস্টমার অসন্তোষ',
    },
    {
      categoryEn: 'Scrap Scraps Thrown in Trash',
      categoryBn: 'উপযোগী স্ক্র্যাপ ফেলে অপচয়',
      impactEn: 'Leftover 3ft to 5ft roll cuts are treated as useless garbage and thrown away, losing thousands of Takas in salvageable material every single week.',
      impactBn: 'অর্ডারের পর বেঁচে যাওয়া ৩ থেকে ৫ ফুটের ভালো কাটিং রোল টুকরো আবর্জনা হিসেবে ফেলে দেওয়া হয়। প্রতি সপ্তাহে হাজার টাকার মেটেরিয়াল অপচয় হয়।',
      icon: Scissors,
      tagEn: 'Hidden Waste',
      tagBn: 'প্রতিদিন হাজার টাকার ক্ষতি',
    },
    {
      categoryEn: 'Endless Phone Call Chasing',
      categoryBn: 'কাজের অগ্রগতির খোঁজে ঘন ঘন ফোন',
      impactEn: 'Front desk calls the press operator every 20 minutes: "Bhai print shuru hoise? When will it finish?" Disrupting focus and slowing down the press.',
      impactBn: 'কাজের খোঁজ নিতে সেলস ডেস্ক অপারেটরকে বারবার ফোন দেয়: "ভাই প্রিন্ট কি শুরু হইছে? কখন ডেলিভারি হবে?" কাজের মনোযোগ নষ্ট হয় ও গতি কমে।',
      icon: PhoneCall,
      tagEn: 'Floor Chaos',
      tagBn: 'সারাদিন অহেতুক বিশৃঙ্খলা',
    },
    {
      categoryEn: 'Customer Dues Forgotten in Khatas',
      categoryBn: 'ডায়েরির পাতায় বকেয়া টাকা গায়েব',
      impactEn: 'Customer credit noted in paper diaries gets overlooked. Due balances accumulate for months with zero automated reminders or proof.',
      impactBn: 'খাতায় লিখে রাখা বাকি টাকার হিসাব সহজে নজরে আসে না। মাসের পর মাস লাখ লাখ টাকা কাস্টমারের কাছে আটকে থাকে কোনো তাগাদা ছাড়া।',
      icon: FileQuestion,
      tagEn: 'Blocked Cash Flow',
      tagBn: 'লাখ লাখ টাকা বকেয়া আটক',
    },
    {
      categoryEn: 'Attendance Book Disputes',
      categoryBn: 'হাজিরা খাতার ভুল ও ওভারটাইম ঝামেলা',
      impactEn: 'Paper sign-in registers enable buddy punching, disputes over late arrivals, and inaccurate monthly overtime salary calculations.',
      impactBn: 'কাগজে সই করার খাতায় প্রক্সি হাজিরা, দেরিতে আসা নিয়ে তর্ক এবং মাসের শেষে ওভারটাইম বেতনের হিসাব মেলানো নিয়ে অসন্তোষ তৈরি হয়।',
      icon: Clock,
      tagEn: 'Payroll Friction',
      tagBn: 'বেতনের সময় জটিলতা',
    },
  ]

  return (
    <section className="py-14 sm:py-20 bg-muted/40 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{tBilingual('The Problem: Traditional Print Shop Chaos', 'প্রিন্টফ্লো ছাড়া প্রচলিত প্রেসের যন্ত্রণা')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {tBilingual(
              'Running a Print Shop Without a System Costs You Money Every Day.',
              'সঠিক সিস্টেম ছাড়া প্রিন্টিং প্রেস চালানো মানে প্রতিদিন টাকার অপচয়।'
            )}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tBilingual(
              'Paper notebooks, verbal instructions, and WhatsApp messages create blind spots where profit quietly leaks out of your press.',
              'কাগজের খাতা, মুখের কথা আর হোয়াটসঅ্যাপের বার্তায় কাজ চালালে ব্যবসার লাভ কোথায় হারিয়ে যায় তা বোঝাই যায় না।'
            )}
          </p>
        </div>

        {/* 6 Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-6xl mx-auto">
          {PROBLEMS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-destructive/40 transition-all space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                      <XCircle className="h-3 w-3" />
                      <span>{tBilingual(item.tagEn, item.tagBn)}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {tBilingual(item.categoryEn, item.categoryBn)}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tBilingual(item.impactEn, item.impactBn)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
