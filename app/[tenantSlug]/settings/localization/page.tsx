'use client'

import React, { useState } from 'react'
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
import { PrintERPDataStore } from '@/lib/db/data-store'

export default function LocalizationSettingsPage() {
  const { settings } = useTenant()
  const { locale, setLocale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)

  const savedLoc = PrintERPDataStore.get<any>('printerp_tenant_localization' as any)
  const [languageMode, setLanguageMode] = useState<'en' | 'bn'>(savedLoc?.languageMode || locale || 'bn')
  const [currency, setCurrency] = useState(savedLoc?.currency || 'BDT')
  const [dateFormat, setDateFormat] = useState(savedLoc?.dateFormat || 'DD/MM/YYYY')

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setLocale(languageMode)
    PrintERPDataStore.set('printerp_tenant_localization' as any, {
      languageMode,
      currency,
      dateFormat,
      updated_at: new Date().toISOString(),
    })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
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
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <Languages className="h-4 w-4 text-blue-600" />
              Default Language & Presentation Mode
            </CardTitle>
            <CardDescription className="text-xs">
              Controls invoice labels, customer receipts, and system interface language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'bn',
                  title: 'বাংলা (Bengali)',
                  desc: 'All invoices, challans, and menus in pure Bengali typography.',
                },
                {
                  id: 'en',
                  title: 'English',
                  desc: 'Standard commercial international invoice terminology.',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLanguageMode(item.id as typeof languageMode)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    languageMode === item.id
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:bg-blue-950/40 dark:border-blue-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currency & Number Format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Base Currency (মুদ্রা)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Selected Currency</Label>
                <select
                  id="currency"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="BDT">Bangladeshi Taka (৳ BDT) - Default</option>
                  <option value="USD">US Dollar ($ USD)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
                Numbering will format using Bangladeshi comma standards: <strong>৳ ১,৫০,০০০.০০</strong> (Lakh/Crore grouping).
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Date Format (তারিখ ফরম্যাট)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateFormat">Selected Date Format</Label>
                <select
                  id="dateFormat"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 03/09/2024) - BD Standard</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2024-09-03) - ISO</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/03/2024)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
                Delivery challans and quotation expiry dates will display in this format.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Localization Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
