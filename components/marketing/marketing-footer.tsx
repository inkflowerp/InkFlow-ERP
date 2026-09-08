'use client'

import React from 'react'
import Link from 'next/link'
import {
  Printer,
  Globe2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function MarketingFooter() {
  const { locale, setLocale, tBilingual } = useI18n()

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-12 sm:pt-16 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Brand Info (Full on mobile, 2 cols on md) */}
          <div className="col-span-1 xs:col-span-2 md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-md shrink-0">
                <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                </div>
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Print<span className="text-cyan-400">ERP</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm bangla-text">
              {tBilingual(
                'The specialized operating system for printing presses, signage workshops, acrylic studios, and advertising fabrication hubs in Bangladesh.',
                'বাংলাদেশের প্রিন্টিং প্রেস, সাইনেজ, এক্রিলিক স্টুডিও ও ফ্যাব্রিকেশন কারখানার জন্য বিশেষভাবে তৈরি অপারেটিং সিস্টেম।'
              )}
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 pt-1 font-mono">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Arambagh Press Cluster, Motijheel, Dhaka-1000</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>+880 1819-876543 (Dhaka Desk)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="break-all sm:break-normal">support@printerp.com.bd</span>
              </div>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/#features" className="hover:text-cyan-400 transition-colors">
                  Features & Tools
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-cyan-400 transition-colors">
                  Pricing Plans in BDT
                </a>
              </li>
              <li>
                <Link href="/about" className="hover:text-cyan-400 transition-colors">
                  Security & Architecture
                </Link>
              </li>
              <li>
                <span className="text-slate-500 flex items-center gap-1">
                  Product Updates <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1 rounded">v2.4</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Solutions</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/solutions" className="hover:text-cyan-400 transition-colors">
                  Digital Printing Press
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-cyan-400 transition-colors">
                  Offset Printing House
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-cyan-400 transition-colors">
                  Signage & Acrylic Craft
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-cyan-400 transition-colors">
                  Carton & Box Packaging
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Resources & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-cyan-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-400 transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-cyan-400 transition-colors">
                  FAQ Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-cyan-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Language & Copyright Bar */}
        <div className="pt-6 sm:pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>Language:</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  locale === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLocale('bn')}
                className={`px-2 py-0.5 rounded text-xs transition-colors bangla-text ${
                  locale === 'bn' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          <div className="text-slate-500 text-center sm:text-right text-[11px] sm:text-xs">
            © {new Date().getFullYear()} PrintERP SaaS Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
