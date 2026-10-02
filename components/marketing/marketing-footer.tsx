'use client'

import React from 'react'
import Link from 'next/link'
import {
 Printer,
 Phone,
 Mail,
 MapPin,
 Globe2,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { usePlatformSettings } from '@/hooks/use-platform-settings'

export function MarketingFooter() {
 const { locale, setLocale, tBilingual } = useI18n()
 const { appName, appLogoUrl, tagline, contactAddress, contactPhone, contactEmail, supportHelpline } = usePlatformSettings()

 const currentYear = new Date().getFullYear()

 return (
    <footer className="bg-muted text-muted-foreground border-t border-border pt-12 sm:pt-16 pb-10 sm:pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Top 4 Columns Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info (takes 2 cols on lg) */}
          <div className="sm:col-span-2 space-y-4">
            <Link href="/"className="flex items-center gap-2.5 shrink-0">
              {appLogoUrl ? (
                <img
 src={appLogoUrl}
 alt={appName}
 className="h-8 w-8 rounded-lg object-contain bg-card border border-border p-0.5 shadow-2xs shrink-0"/>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
                  <Printer className="h-4 w-4"/>
                </div>
              )}
              <span className="text-base font-bold text-foreground tracking-tight">
                {appName}
              </span>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm bangla-text">
              {tBilingual(
 tagline || 'The operating system for print and signage businesses in Bangladesh.',
                'বাংলাদেশের প্রিন্টিং প্রেস, সাইনেজ ও ফ্যাব্রিকেশন কারখানার জন্য সমন্বিত অপারেটিং সিস্টেম।'
              )}
            </p>

            <div className="space-y-2 text-xs text-muted-foreground pt-1">
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5"/>
                <span>{contactAddress || 'Arambagh Press Cluster, Motijheel, Dhaka-1000'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0"/>
                <span className="tabular-nums">{contactPhone || supportHelpline || '+880 1819-876543'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0"/>
                <span>{contactEmail || 'support@printerp.com.bd'}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#features"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 How It Works
                </Link>
              </li>
              <li>
                <Link href="/#pricing"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/register?plan=trial"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium text-blue-600 dark:text-blue-400">
 Free Trial
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Solutions</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#solutions"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Digital Printing
                </Link>
              </li>
              <li>
                <Link href="/#solutions"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Offset Press
                </Link>
              </li>
              <li>
                <Link href="/#solutions"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Flex & Banner
                </Link>
              </li>
              <li>
                <Link href="/#solutions"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Acrylic & Signage
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Resources & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#faq"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 FAQ
                </Link>
              </li>
              <li>
                <Link href="/about"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 About Us
                </Link>
              </li>
              <li>
                <Link href="/contact"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Contact Sales & Support
                </Link>
              </li>
              <li>
                <Link href="/privacy"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms"className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
 Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© {currentYear} {appName}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
 type="button"onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')}
 className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-600 cursor-pointer">
              <Globe2 className="h-3.5 w-3.5"/>
              <span>{locale === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
