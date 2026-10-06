'use client'

import React from 'react'
import Link from 'next/link'
import { Printer, Globe2 } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { usePlatformSettings } from '@/hooks/use-platform-settings'

export function MarketingFooter() {
  const { locale, setLocale, tBilingual } = useI18n()
  const { appName, appLogoUrl } = usePlatformSettings()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-muted/40 text-muted-foreground border-t border-border pt-10 pb-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border/60">
          {/* Brand */}
          <div className="space-y-1.5 max-w-sm">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {appLogoUrl ? (
                <img
                  src={appLogoUrl}
                  alt={appName}
                  className="h-7 w-7 rounded-md object-contain bg-card border border-border p-0.5 shadow-2xs shrink-0"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs shrink-0">
                  <Printer className="h-4 w-4" />
                </div>
              )}
              <span className="text-base font-bold text-foreground tracking-tight">
                {appName}
              </span>
            </Link>
            <p className="text-xs text-muted-foreground">
              {tBilingual(
                'Business management software for print and signage businesses.',
                'প্রিন্ট ও সাইনেজ ব্যবসার আধুনিক ম্যানেজমেন্ট সফটওয়্যার।'
              )}
            </p>
          </div>

          {/* Minimal Links: Product, Pricing, How It Works, FAQ, Privacy, Terms, Contact */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
            <a href="#what-we-manage" className="hover:text-primary transition-colors cursor-pointer">
              {tBilingual('Product', 'প্রোডাক্ট')}
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors cursor-pointer">
              {tBilingual('Pricing', 'মূল্যতালিকা')}
            </a>
            <a href="#workflow" className="hover:text-primary transition-colors cursor-pointer">
              {tBilingual('How It Works', 'কাজের ধাপ')}
            </a>
            <a href="#faq" className="hover:text-primary transition-colors cursor-pointer">
              {tBilingual('FAQ', 'প্রশ্নোত্তর')}
            </a>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {tBilingual('Privacy', 'প্রাইভেসি')}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {tBilingual('Terms', 'শর্তাবলী')}
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              {tBilingual('Contact', 'যোগাযোগ')}
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {currentYear} {appName}. All rights reserved.</span>

          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>{locale === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}</span>
          </button>
        </div>
      </div>
    </footer>
  )
}
