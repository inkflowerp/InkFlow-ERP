'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface FinalCTASectionProps {
  onOpenDemo?: () => void
}

export function FinalCTASection({ onOpenDemo }: FinalCTASectionProps) {
  const { tBilingual } = useI18n()

  return (
    <section className="py-16 sm:py-20 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight max-w-xl mx-auto">
          {tBilingual(
            'Ready to Simplify Your Print Business?',
            'আপনার প্রিন্ট ব্যবসা সহজ করতে প্রস্তুত?'
          )}
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
          {tBilingual(
            'Start managing your business in one connected workflow.',
            'এক সংযুক্ত সিস্টেমে আপনার পুরো ব্যবসা পরিচালনা শুরু করুন।'
          )}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-11 px-7 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer">
              <span>{tBilingual('Start Free Trial', 'ফ্রি ট্রায়াল শুরু করুন')}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          {onOpenDemo && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenDemo}
              className="w-full sm:w-auto h-11 px-6 text-sm font-semibold border-input bg-card text-foreground hover:bg-muted cursor-pointer"
            >
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <span>{tBilingual('Book a Demo', 'লাইভ ডেমো বুক করুন')}</span>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
