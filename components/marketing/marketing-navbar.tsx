'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Printer,
  Menu,
  X,
  ArrowRight,
  Globe2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { MARKETING_NAV_ITEMS } from '@/lib/marketing/marketing-data'
import { usePlatformSettings } from '@/hooks/use-platform-settings'
import { ThemeToggle } from '@/components/shell/theme-toggle'

interface MarketingNavbarProps {
  onOpenDemo?: () => void
}

export function MarketingNavbar({ onOpenDemo }: MarketingNavbarProps = {}) {
  const { appName, appLogoUrl } = usePlatformSettings()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { locale, setLocale, tBilingual } = useI18n()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleLanguage = () => {
    if (locale === 'en') setLocale('bn')
    else setLocale('en')
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-2xs'
          : 'bg-card/80 backdrop-blur-xs border-b border-border/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            {appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt={appName}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain bg-card border border-border p-0.5 shadow-2xs shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                <Printer className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            )}
            <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {appName}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {MARKETING_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {tBilingual(item.labelEn, item.labelBn)}
              </a>
            ))}
          </nav>

          {/* Right Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
            {/* Direct Dark/Light Switch */}
            <ThemeToggle variant="switch" size="md" />

            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer h-9"
              title={locale === 'en' ? 'Switch to Bangla' : 'Switch to English'}
              aria-label="Toggle language"
            >
              <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{locale === 'en' ? 'বাং' : 'EN'}</span>
            </button>

            {/* Log In Link */}
            <Link href="/login">
              <Button
                variant="ghost"
                className="h-9 px-3 text-xs sm:text-sm font-semibold text-foreground hover:text-foreground cursor-pointer"
              >
                {tBilingual('Log In', 'লগ ইন')}
              </Button>
            </Link>

            {/* Start Free CTA */}
            <Link href="/register">
              <Button className="h-9 px-4 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
                <span>{tBilingual('Start Free', 'ফ্রি শুরু')}</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Actions: Theme Switch + Language + Hamburger */}
          <div className="flex md:hidden items-center gap-1.5">
            <ThemeToggle variant="switch" size="sm" />

            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center justify-center p-2 rounded-lg border border-border text-xs font-bold text-foreground h-8 px-2"
              title="Toggle language"
              aria-label="Toggle language"
            >
              <span>{locale === 'en' ? 'বাং' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-foreground hover:bg-muted transition-colors cursor-pointer h-8 w-8 flex items-center justify-center"
              title={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {MARKETING_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
              >
                {tBilingual(item.labelEn, item.labelBn)}
              </a>
            ))}
          </nav>

          <div className="pt-2 pb-1 border-t border-border flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {tBilingual('Appearance & Theme', 'থিম ও ডিসপ্লে')}
            </span>
            <ThemeToggle variant="switch" size="sm" />
          </div>

          <div className="pt-2 border-t border-border flex flex-col gap-2.5">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-semibold border-input text-foreground cursor-pointer"
              >
                {tBilingual('Log In', 'লগ ইন')}
              </Button>
            </Link>

            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <Button className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                <span>{tBilingual('Start Free', 'ফ্রি শুরু')}</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
