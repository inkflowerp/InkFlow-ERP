'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  Printer,
  Menu,
  X,
  ArrowRight,
  Globe2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { MARKETING_NAV_ITEMS } from '@/lib/marketing/marketing-data'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'

interface MarketingNavbarProps {
  onOpenDemo?: () => void
}

export function MarketingNavbar({ onOpenDemo }: MarketingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { locale, setLocale, tBilingual } = useI18n()
  const { trialDays } = usePublicSubscriptionPlans()
  const router = useRouter()

  const trialDaysBn = toBengaliDigits(trialDays)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleLanguage = () => {
    if (locale === 'en') setLocale('bn')
    else setLocale('en')
  }

  const getLanguageLabel = () => {
    if (locale === 'en') return 'EN'
    return 'বাং'
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
              {/* CMYK Accent Dots */}
              <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" title="Cyan" />
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" title="Magenta" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Yellow" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900 border border-slate-700" title="Key" />
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white nav-link-nowrap">
                  Print<span className="text-cyan-400">ERP</span>
                </span>
                <span className="rounded bg-cyan-500/10 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-cyan-400 border border-cyan-500/20 nav-link-nowrap">
                  BD SaaS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline leading-none nav-link-nowrap">
                Printing & Signage OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Visible on LG 1024px+) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink-0">
            {MARKETING_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link-nowrap px-2.5 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors bangla-text shrink-0"
              >
                {tBilingual(item.labelEn, item.labelBn)}
              </a>
            ))}

            <Link
              href="/about"
              className="nav-link-nowrap px-2.5 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors bangla-text shrink-0 hidden 2xl:inline-block"
            >
              {tBilingual('About', 'আমাদের সম্পর্কে')}
            </Link>
            <Link
              href="/contact"
              className="nav-link-nowrap px-2.5 xl:px-3 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors bangla-text shrink-0 hidden 2xl:inline-block"
            >
              {tBilingual('Contact', 'যোগাযোগ')}
            </Link>
          </nav>

          {/* Right Action CTAs (Visible on LG 1024px+) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="nav-link-nowrap flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Switch Language: English / বাংলা"
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="nav-link-nowrap font-bold">{getLanguageLabel()}</span>
            </button>

            {/* Login Link */}
            <Link
              href="/login"
              className="nav-link-nowrap text-xs xl:text-sm font-semibold text-slate-300 hover:text-white px-2.5 xl:px-3 py-1.5 xl:py-2 transition-colors bangla-text shrink-0"
            >
              {tBilingual('Sign In', 'লগইন')}
            </Link>

            {/* Start Free Trial Primary CTA */}
            <Link href="/register" className="shrink-0">
              <Button className="nav-link-nowrap bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs xl:text-sm px-3.5 xl:px-5 h-9 xl:h-10 shadow-lg shadow-cyan-500/20 border border-cyan-400/30 group cursor-pointer shrink-0 bangla-text">
                <span>{tBilingual('Start Free Trial', 'ফ্রি ট্রায়াল শুরু করুন')}</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 xl:h-4 xl:w-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Button>
            </Link>
          </div>

          {/* Mobile / Tablet Header Bar (Visible under LG 1024px) */}
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            {/* Language Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="nav-link-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white shrink-0 cursor-pointer"
              aria-label="Switch Language"
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold nav-link-nowrap">{getLanguageLabel()}</span>
            </button>

            {/* Tablet/Mobile Sign In */}
            <Link
              href="/login"
              className="hidden sm:inline-flex nav-link-nowrap text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 shrink-0 bangla-text"
            >
              {tBilingual('Sign In', 'লগইন')}
            </Link>

            {/* Tablet/Mobile Try Free */}
            <Link href="/register" className="shrink-0">
              <Button size="sm" className="nav-link-nowrap bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold px-3 h-8 shrink-0 bangla-text">
                {tBilingual('Try Free', 'ট্রায়াল')}
              </Button>
            </Link>

            {/* Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 sm:top-20 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden bg-slate-950/98 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 backdrop-blur-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto shadow-2xl">
          <div className="flex flex-col space-y-1">
            {MARKETING_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-400 transition-colors bangla-text"
              >
                {tBilingual(item.labelEn, item.labelBn)}
              </a>
            ))}
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-400 transition-colors bangla-text"
            >
              {tBilingual('About PrintERP', 'প্রিন্টইআরপি পরিচিতি')}
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-400 transition-colors bangla-text"
            >
              {tBilingual('Contact & Support', 'যোগাযোগ ও সাপোর্ট')}
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button
                variant="ghost"
                className="w-full justify-center border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white h-11 font-semibold bangla-text cursor-pointer"
              >
                {tBilingual('Sign In to Account', 'একাউন্টে লগইন করুন')}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button className="w-full justify-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold h-11 bangla-text">
                <span>{tBilingual(`Start ${trialDays}-Day Free Trial`, `${trialDaysBn} দিনের ফ্রি ট্রায়াল শুরু`)}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
