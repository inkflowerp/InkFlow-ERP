'use client'

import React, { useState, useEffect } from 'react'
import {
  Globe2,
  Save,
  CheckCircle2,
  Calendar,
  DollarSign,
  Languages,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { PrintERPDataStore } from '@/lib/db/data-store'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'

export default function LocalizationSettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { locale, setLocale, tBilingual } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [languageMode, setLanguageMode] = useState<'en' | 'bn'>(
    (settings?.default_language as 'en' | 'bn') || (company?.default_locale as 'en' | 'bn') || locale || 'bn'
  )
  const [currency, setCurrency] = useState(company?.currency || settings?.default_currency || 'BDT')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (company || settings) {
      if (company?.currency || settings?.default_currency) {
        setCurrency(company?.currency || settings?.default_currency || 'BDT')
      }
      if (settings?.default_language || company?.default_locale) {
        const lang = (settings?.default_language || company?.default_locale) as 'en' | 'bn'
        setLanguageMode(lang)
      }
    }
  }, [company, settings])

  React.useEffect(() => {
    const savedLoc = PrintERPDataStore.get<any>('printerp_tenant_localization' as any)
    if (savedLoc) {
      if (savedLoc.languageMode) setLanguageMode(savedLoc.languageMode)
      if (savedLoc.currency) setCurrency(savedLoc.currency)
      if (savedLoc.dateFormat) setDateFormat(savedLoc.dateFormat)
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setIsSaved(false)
    try {
      setLocale(languageMode)
      if (company?.id) {
        await updateCompanyAction(company.id, {
          currency,
          default_locale: languageMode,
        })
        await updateCompanySettingsAction(company.id, {
          default_currency: currency,
          default_language: languageMode,
        })
        await refreshTenant()
      }
      PrintERPDataStore.set('printerp_tenant_localization' as any, {
        languageMode,
        currency,
        dateFormat,
        updated_at: new Date().toISOString(),
      })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3500)
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Localization, Language & Formats"
        titleBn="আঞ্চলিক ভাষা ও মুদ্রা সেটিংস"
        descriptionEn="Configure interface presentation mode, base currency, and standard Bangladeshi date numbering conventions."
        descriptionBn="ইন্টারফেসের ভাষা মোড, মূল মুদ্রা এবং বাংলাদেশি তারিখ ও নম্বর ফরম্যাট কনফিগার করুন।"
        icon={Globe2}
        iconColor="text-emerald-600"
      />

      <SettingsNav />

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Localization preferences updated and applied across document engines.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Language Selection */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2 bangla-text">
                <Languages className="h-4 w-4 text-blue-600" />
                {tBilingual('Default Language & Display Mode', 'ডিফল্ট ভাষা ও ডিসপ্লে')}
              </CardTitle>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Controls invoice labels, customer receipts, and system interface language.', 'চালান, রসিদ এবং সফটওয়্যারের ভাষা নিয়ন্ত্রণ করে।')}
              </CardDescription>
            </div>
            <LanguageSwitcher />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'bn',
                  title: tBilingual('Bengali', 'বাংলা'),
                  desc: tBilingual('All invoices, challans, and menus in pure Bengali.', 'সকল চালান, রসিদ এবং মেনু সহজ বাংলায় দেখা যাবে।'),
                },
                {
                  id: 'en',
                  title: tBilingual('English', 'ইংরেজি'),
                  desc: tBilingual('Standard commercial English invoice and software terminology.', 'ইংরেজি ভাষায় সফটওয়্যার ও চালানের তথ্য প্রদর্শিত হবে।'),
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setLanguageMode(item.id as typeof languageMode)
                    setLocale(item.id as typeof languageMode)
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    locale === item.id || languageMode === item.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:bg-blue-950/40 dark:border-blue-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white bangla-text">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 bangla-text">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currency & Number Format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 bangla-text">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                {tBilingual('Base Currency', 'মূল মুদ্রা')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency" className="bangla-text">{tBilingual('Selected Currency', 'নির্বাচিত মুদ্রা')}</Label>
                <select
                  id="currency"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold bangla-text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="BDT">{tBilingual('Bangladeshi Taka (BDT) - Default', 'বাংলাদেশি টাকা (ডিফল্ট)')}</option>
                  <option value="USD">{tBilingual('US Dollar (USD)', 'ইউএস ডলার')}</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 bangla-text">
                {tBilingual('Numbering will format using Bangladeshi comma standards: BDT 1,50,000 (Lakh/Crore grouping).', 'টাকার হিসাব বাংলাদেশি নিয়মে কমা দিয়ে দেখানো হবে: ৳ ১,৫০,০০০ (লক্ষ/কোটি)।')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2 bangla-text">
                <Calendar className="h-4 w-4 text-purple-600" />
                {tBilingual('Date Format', 'তারিখ ফরম্যাট')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateFormat" className="bangla-text">{tBilingual('Selected Date Format', 'নির্বাচিত তারিখের ধরন')}</Label>
                <select
                  id="dateFormat"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono bangla-text"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  <option value="DD/MM/YYYY">{tBilingual('DD/MM/YYYY (e.g. 03/09/2026) - BD Standard', 'দিন/মাস/বছর (যেমন: ০৩/০৯/২০২৬) - মানসম্মত')}</option>
                  <option value="YYYY-MM-DD">{tBilingual('YYYY-MM-DD (e.g. 2026-09-03) - ISO Standard', 'বছর-মাস-দিন (যেমন: ২০২৬-০৯-০৩)')}</option>
                  <option value="MM/DD/YYYY">{tBilingual('MM/DD/YYYY (e.g. 09/03/2026)', 'মাস/দিন/বছর (যেমন: ০৯/০৩/২০২৬)')}</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 bangla-text">
                {tBilingual('Delivery challans, invoices, and quotation expiry dates will display in this format.', 'চালান, বিল এবং কোটেশনের মেয়াদ এই ফরম্যাটে প্রদর্শিত হবে।')}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold bangla-text">
            <Save className="mr-1.5 h-4 w-4" />
            {tBilingual('Save Localization Settings', 'ভাষা ও মুদ্রা সেটিংস সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </div>
  )
}
