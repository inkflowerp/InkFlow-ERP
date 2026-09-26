'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
  ShieldCheck,
  Calculator,
  Percent,
  Check,
  Sparkles,
  ArrowRight,
  Landmark,
  Receipt,
  FileSpreadsheet,
  Download,
  Printer,
  Info,
  BadgePercent,
  RefreshCw,
  Sliders,
  Scale,
  DollarSign,
  Phone,
  UserCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'
import {
  DEFAULT_TAX_SETTINGS,
  DEMO_TAX_SETTINGS,
  calculateVat,
} from '@/services/tax-and-docs.service'
import { CompanyTaxSettingsRecord, VatPricingMode } from '@/types/tax-and-docs.types'
import { formatBDT } from '@/lib/formatters'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

const BANGLADESH_COMMISSIONERATES = [
  'Customs, Excise & VAT Commissionerate, Dhaka South',
  'Customs, Excise & VAT Commissionerate, Dhaka North',
  'Customs, Excise & VAT Commissionerate, Dhaka East',
  'Customs, Excise & VAT Commissionerate, Dhaka West',
  'Customs, Excise & VAT Commissionerate, Chittagong',
  'Customs, Excise & VAT Commissionerate, Rajshahi',
  'Customs, Excise & VAT Commissionerate, Khulna',
  'Customs, Excise & VAT Commissionerate, Sylhet',
  'Customs, Excise & VAT Commissionerate, Rangpur',
  'Customs, Excise & VAT Commissionerate, Comilla',
  'Large Taxpayers Unit (LTU-VAT), Dhaka',
]

export default function TaxSettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { locale, tBilingual } = useI18n()
  const pathname = usePathname()
  const slug = company?.slug || 'rangao'
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<'current' | 'previous'>('current')

  useEffect(() => {
    setMounted(true)
  }, [])

  const defaultSettings = useMemo<CompanyTaxSettingsRecord>(
    () => ({
      ...DEFAULT_TAX_SETTINGS,
      bin_number: company?.bin_no || DEFAULT_TAX_SETTINGS.bin_number,
      tin_number: company?.tin_no || DEFAULT_TAX_SETTINGS.tin_number,
      trade_license_number: company?.trade_license_no || DEFAULT_TAX_SETTINGS.trade_license_number,
      vat_enabled: settings?.vat_enabled ?? DEFAULT_TAX_SETTINGS.vat_enabled,
      default_vat_rate: settings?.vat_rate ?? DEFAULT_TAX_SETTINGS.default_vat_rate,
    }),
    [company?.bin_no, company?.tin_no, company?.trade_license_no, settings?.vat_enabled, settings?.vat_rate]
  )

  const [taxSettings, setTaxSettings] = useDataStore<CompanyTaxSettingsRecord>(
    STORAGE_KEYS.TAX_SETTINGS,
    defaultSettings
  )

  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [purchases] = useDataStore<any[]>(STORAGE_KEYS.PURCHASE_ORDERS, [])

  // Compute live NBR VAT return from store (Mushak 9.1 Summary)
  const vatReturnSummary = useMemo(() => {
    const now = new Date()
    const targetMonth = selectedPeriodMonth === 'current' ? now.getMonth() : (now.getMonth() - 1 + 12) % 12
    const targetYear = selectedPeriodMonth === 'current' ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())

    const periodDate = new Date(targetYear, targetMonth, 1)
    const periodLabel = periodDate.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    })

    const filteredInvoices = invoices.filter((inv) => {
      if (!inv.created_at && !inv.issue_date && !inv.invoice_date) return true
      const d = new Date(inv.created_at || inv.issue_date || inv.invoice_date)
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear
    })

    const filteredPurchases = purchases.filter((p) => {
      if (!p.created_at && !p.po_date && !p.order_date) return true
      const d = new Date(p.created_at || p.po_date || p.order_date)
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear
    })

    const grossTurnover = filteredInvoices.reduce(
      (sum, i) => sum + (Number(i.subtotal) || Number(i.total_amount) || Number(i.grand_total) || 0),
      0
    )
    const outputVat = filteredInvoices.reduce(
      (sum, i) => sum + (Number(i.vat_amount) || Number(i.tax_amount) || 0),
      0
    )
    const rawInputVat = filteredPurchases.reduce(
      (sum, p) => sum + (Number(p.vat_amount) || Number(p.tax_amount) || 0),
      0
    )
    
    // If input tax rebate is enabled, subtract input VAT; otherwise 0 rebate
    const inputVat = taxSettings.rebate_enabled !== false ? rawInputVat : 0
    const netPayableVat = Math.max(0, outputVat - inputVat)

    return {
      period: periodLabel,
      invoiceCount: filteredInvoices.length,
      purchaseCount: filteredPurchases.length,
      grossTurnover,
      outputVat,
      inputVat,
      netPayableVat,
    }
  }, [invoices, purchases, locale, selectedPeriodMonth, taxSettings.rebate_enabled])

  // Live Calculator Simulator State
  const [testAmount, setTestAmount] = useState<number>(10000)
  const [testRate, setTestRate] = useState<number>(taxSettings.default_vat_rate || 15)
  const [testMode, setTestMode] = useState<VatPricingMode>(taxSettings.pricing_mode || 'exclusive')
  const [testVdsRate, setTestVdsRate] = useState<number>(taxSettings.vds_enabled ? (taxSettings.vds_rate || 7.5) : 0)
  const [testTdsRate, setTestTdsRate] = useState<number>(taxSettings.tds_enabled ? (taxSettings.tds_rate || 3) : 0)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (company?.id) {
        await updateCompanyAction(company.id, {
          bin_no: taxSettings.bin_number || null,
          tin_no: taxSettings.tin_number || null,
          trade_license_no: taxSettings.trade_license_number || null,
        })
        await updateCompanySettingsAction(company.id, {
          vat_enabled: taxSettings.vat_enabled,
          vat_rate: taxSettings.default_vat_rate,
        })
        await refreshTenant()
      }
      
      const updated = {
        ...taxSettings,
        updated_at: new Date().toISOString(),
      }
      setTaxSettings(updated)

      // Broadcast update across windows & tabs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:tax_settings', { detail: updated }))
        window.dispatchEvent(new CustomEvent('printerp_table_synced:settings', { detail: updated }))
        window.dispatchEvent(new CustomEvent('printerp_table_synced:company', { detail: company }))
        window.dispatchEvent(new CustomEvent('printerp_data_sync', { detail: { table: 'tax_settings' } }))
      }

      showNotification(
        locale === 'bn'
          ? 'বাংলাদেশ ভ্যাট ও এনবিআর ট্যাক্স সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'Bangladesh VAT & NBR Tax settings saved successfully across all active modules!'
      )
    } catch (err: any) {
      console.error('[TaxSettings] Save error:', err)
      showNotification(err?.message || 'Failed to save tax settings')
    } finally {
      setIsLoading(false)
    }
  }

  // Simulator live calculations
  const testCalcResult = useMemo(() => {
    const baseCalc = calculateVat(testAmount, testRate, testMode)
    const vdsAmount = testVdsRate > 0 ? Math.round(baseCalc.baseAmount * (testVdsRate / 100)) : 0
    const tdsAmount = testTdsRate > 0 ? Math.round(baseCalc.baseAmount * (testTdsRate / 100)) : 0
    const netReceivable = Math.max(0, baseCalc.totalAmount - vdsAmount - tdsAmount)

    return {
      ...baseCalc,
      vdsAmount,
      tdsAmount,
      netReceivable,
    }
  }, [testAmount, testRate, testMode, testVdsRate, testTdsRate])

  const handlePrintVatWorksheet = useCallback(() => {
    if (typeof window === 'undefined') return
    window.print()
  }, [])

  // BIN validation helper
  const binIsValid = Boolean(taxSettings.bin_number && taxSettings.bin_number.replace(/\D/g, '').length === 13)
  const tinIsValid = Boolean(taxSettings.tin_number && taxSettings.tin_number.replace(/\D/g, '').length >= 10)

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse p-4 sm:p-0">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Header */}
      <PageHeader
        titleEn="Bangladesh VAT & NBR Tax Settings"
        titleBn="বাংলাদেশ ভ্যাট ও এনবিআর ট্যাক্স সেটিংস"
        descriptionEn="Manage 13-digit BIN, NBR VAT rates, inclusive/exclusive pricing modes, VDS/TDS withholding, and monthly Mushak return summaries."
        descriptionBn="১৩ ডিজিটের বিআইএন, এনবিআর ভ্যাট হার, ভ্যাট অন্তর্ভুক্তি মোড, উৎসে কর কর্তন এবং মাসিক মূসক রিটার্ন সারাংশ পরিচালনা করুন।"
        icon={Landmark}
        iconColor="text-emerald-600 dark:text-emerald-400"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintVatWorksheet}
              className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span>{tBilingual('Print Worksheet', 'ওয়ার্কশিট প্রিন্ট')}</span>
            </Button>
            <Link
              href={getTenantNavHref('/settings/documents', pathname, slug)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>{tBilingual('Document Templates', 'ডকুমেন্ট টেমপ্লেট')}</span>
              <ArrowRight className="h-3 w-3 ml-0.5 text-slate-400" />
            </Link>
          </div>
        }
      />

      <SettingsNav />

      {/* Notification */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 shadow-sm animate-in fade-in-0 slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* NBR Monthly VAT Return Cockpit (Mushak 9.1 Summary) */}
      <Card className="border-l-4 border-l-emerald-600 dark:border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-emerald-200/60 dark:border-emerald-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{tBilingual('NBR Monthly VAT Return Summary (Mushak-9.1)', 'এনবিআর মাসিক মূসক রিটার্ন সারাংশ (মূসক-৯.১)')}</span>
                </h3>
                <Badge className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-2xs font-mono font-bold">
                  {vatReturnSummary.period}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tBilingual(
                  'Automated reconciliation of output VAT collected on sales versus input VAT paid on raw materials (Paper, Plates, Inks, Media).',
                  'বিক্রয়ের উপর সংগৃহীত বিক্রয় মূসক এবং কাঁচামাল ক্রয়ের উপর পরিশোধিত ক্রয় মূসক রেয়াতের স্বয়ংক্রিয় হিসাব।'
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPeriodMonth('current')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                    selectedPeriodMonth === 'current'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tBilingual('This Month', 'চলতি মাস')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriodMonth('previous')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                    selectedPeriodMonth === 'previous'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tBilingual('Last Month', 'গত মাস')}
                </button>
              </div>

              <div className="text-right pl-3 border-l border-emerald-200/80 dark:border-emerald-800/80">
                <span className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                  {tBilingual('Net Treasury Payable', 'সরকারি কোষাগারে প্রদেয়')}
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  {formatBDT(vatReturnSummary.netPayableVat)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-2xs font-semibold">
              <span>{tBilingual('1. Gross Taxable Turnover', '১. মোট করযোগ্য বিক্রয়')}</span>
              <span className="font-mono text-2xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {vatReturnSummary.invoiceCount} {tBilingual('invoices', 'চালান')}
              </span>
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base font-mono">
              {formatBDT(vatReturnSummary.grossTurnover)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-2xs font-semibold">
              <span>{tBilingual('2. Output VAT', '২. প্রদেয় বিক্রয় মূসক')}</span>
              <Badge variant="outline" className="text-2xs font-mono border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                Mushak 6.3
              </Badge>
            </div>
            <div className="font-bold text-blue-600 dark:text-blue-400 text-base font-mono">
              +{formatBDT(vatReturnSummary.outputVat)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-2xs font-semibold">
              <span>{tBilingual('3. Input VAT Rebate', '৩. অনুমোদিত রেয়াত')}</span>
              <span className="font-mono text-2xs bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                {vatReturnSummary.purchaseCount} {tBilingual('bills', 'বিল')}
              </span>
            </div>
            <div className="font-bold text-purple-600 dark:text-purple-400 text-base font-mono">
              -{formatBDT(vatReturnSummary.inputVat)}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveTax} className="space-y-6">
        {/* VAT Master Controls & Pricing Policies */}
        <Card className="p-6 space-y-5 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Percent className="h-4 w-4 text-emerald-600" />
                <span>{tBilingual('Master VAT & Pricing Policies', 'ভ্যাট নীতি ও মূল্য নির্ধারণ মোড')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tBilingual(
                  'Control company-wide VAT enablement, calculation algorithms, and default press rates.',
                  'প্রতিষ্ঠানব্যাপী ভ্যাট সক্রিয়করণ, হিসাব পদ্ধতি এবং ডিফল্ট প্রেস রেট কনফিগার করুন।'
                )}
              </CardDescription>
            </div>

            {/* VAT Master Switch */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {taxSettings.vat_enabled ? tBilingual('VAT Active', 'ভ্যাট সক্রিয়') : tBilingual('VAT Disabled', 'ভ্যাট নিষ্ক্রিয়')}
              </span>
              <Button
                type="button"
                size="sm"
                variant={taxSettings.vat_enabled ? 'default' : 'outline'}
                onClick={() =>
                  setTaxSettings({ ...taxSettings, vat_enabled: !taxSettings.vat_enabled })
                }
                className={`h-8 px-3.5 text-xs font-bold transition-all ${
                  taxSettings.vat_enabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                {taxSettings.vat_enabled ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {tBilingual('Enabled', 'চালু')}
                  </>
                ) : (
                  tBilingual('Disabled', 'বন্ধ')
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Pricing Mode Selection */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {tBilingual('Pricing Calculation Mode', 'মূল্য ও ভ্যাট হিসাবের মোড')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTaxSettings({ ...taxSettings, pricing_mode: 'exclusive' })
                    setTestMode('exclusive')
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    taxSettings.pricing_mode === 'exclusive'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-2 ring-blue-600/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{tBilingual('VAT-Exclusive', 'মূল্য + ভ্যাট (এক্সক্লুসিভ)')}</span>
                    {taxSettings.pricing_mode === 'exclusive' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {tBilingual('VAT is added on top of item rate. Standard for commercial B2B printing.', 'পণ্যের মূল্যের সাথে অতিরিক্ত ভ্যাট যুক্ত হবে।')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaxSettings({ ...taxSettings, pricing_mode: 'inclusive' })
                    setTestMode('inclusive')
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    taxSettings.pricing_mode === 'inclusive'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-2 ring-blue-600/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>{tBilingual('VAT-Inclusive', 'ভ্যাটসহ (ইনক্লুসিভ)')}</span>
                    {taxSettings.pricing_mode === 'inclusive' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {tBilingual('Item price already contains VAT. Standard for retail digital POS counters.', 'পণ্যের নির্ধারিত মূল্যের ভেতর ভ্যাট অন্তর্ভুক্ত থাকবে।')}
                  </div>
                </button>
              </div>
            </div>

            {/* Default VAT Rate Selector */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {tBilingual('Default NBR VAT Rate (%)', 'ডিফল্ট এনবিআর ভ্যাট হার (%)')}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { rate: 15, label: '15% (Standard Press/Signage)' },
                  { rate: 7.5, label: '7.5% (Truncated/Agency)' },
                  { rate: 5, label: '5% (Retail POS)' },
                  { rate: 0, label: '0% (Exempt/Books)' },
                ].map((item) => (
                  <Button
                    key={item.rate}
                    type="button"
                    size="sm"
                    variant={taxSettings.default_vat_rate === item.rate ? 'default' : 'outline'}
                    onClick={() => {
                      setTaxSettings({ ...taxSettings, default_vat_rate: item.rate })
                      setTestRate(item.rate)
                    }}
                    className={`text-xs h-8 px-3 font-bold transition-all ${
                      taxSettings.default_vat_rate === item.rate
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {item.rate}%
                  </Button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={taxSettings.default_vat_rate}
                    onChange={(e) => {
                      const r = Number(e.target.value)
                      setTaxSettings({ ...taxSettings, default_vat_rate: r })
                      setTestRate(r)
                    }}
                    className="w-20 h-8 text-xs font-mono font-bold text-center"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
              <span className="text-2xs text-slate-400 dark:text-slate-500 block leading-snug">
                {tBilingual(
                  'Standard NBR rate for manufacturing, offset printing, and signage is 15%. Truncated rates apply for agency or retail services.',
                  'ম্যানুফ্যাকচারিং, অফসেট প্রিন্টিং ও সাইনেজের জন্য এনবিআরের আদর্শ হার ১৫%।'
                )}
              </span>
            </div>
          </div>
        </Card>

        {/* Withholding Tax & Source Deductions (TDS & VDS) */}
        <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Scale className="h-4 w-4 text-purple-600" />
              <span>{tBilingual('Withholding Tax & Source Deductions (VDS / TDS)', 'উৎসে মূসক ও কর কর্তন সেটিংস')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tBilingual(
                'Configure automatic deduction rates for corporate, banking, telecom, and government tender billing.',
                'কর্পোরেট, ব্যাংক, টেলিকম ও সরকারি টেন্ডারের জন্য উৎসে ভ্যাট ও ট্যাক্স কর্তন কনফিগার করুন।'
              )}
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* VDS Setting */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {tBilingual('VDS (VAT Deducted at Source)', 'উৎসে মূসক কর্তন')}
                  </Label>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    {tBilingual('Withheld by corporate & institutional clients', 'কর্পোরেট গ্রাহক কর্তৃক কর্তিত মূসক')}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={taxSettings.vds_enabled ? 'default' : 'outline'}
                  onClick={() => {
                    const next = !taxSettings.vds_enabled
                    setTaxSettings({ ...taxSettings, vds_enabled: next })
                    setTestVdsRate(next ? (taxSettings.vds_rate || 7.5) : 0)
                  }}
                  className={`h-7 px-2.5 text-xs font-bold ${
                    taxSettings.vds_enabled ? 'bg-purple-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {taxSettings.vds_enabled ? tBilingual('Active', 'সক্রিয়') : tBilingual('Off', 'বন্ধ')}
                </Button>
              </div>

              {taxSettings.vds_enabled && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {tBilingual('Default VDS Deduction Rate:', 'ডিফল্ট কর্তন হার:')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={taxSettings.vds_rate ?? 7.5}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setTaxSettings({ ...taxSettings, vds_rate: val })
                        setTestVdsRate(val)
                      }}
                      className="w-20 h-7 text-xs font-mono font-bold text-center"
                    />
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* TDS Setting */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {tBilingual('TDS (Income Tax Deducted at Source)', 'উৎসে আয়কর কর্তন')}
                  </Label>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    {tBilingual('Income tax deducted on supply of print goods', 'প্রিন্টিং পণ্য সরবরাহের বিপরীতে কর্তিত আয়কর')}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={taxSettings.tds_enabled ? 'default' : 'outline'}
                  onClick={() => {
                    const next = !taxSettings.tds_enabled
                    setTaxSettings({ ...taxSettings, tds_enabled: next })
                    setTestTdsRate(next ? (taxSettings.tds_rate || 3) : 0)
                  }}
                  className={`h-7 px-2.5 text-xs font-bold ${
                    taxSettings.tds_enabled ? 'bg-purple-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {taxSettings.tds_enabled ? tBilingual('Active', 'সক্রিয়') : tBilingual('Off', 'বন্ধ')}
                </Button>
              </div>

              {taxSettings.tds_enabled && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {tBilingual('Default TDS Deduction Rate:', 'ডিফল্ট আয়কর কর্তন হার:')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={taxSettings.tds_rate ?? 3.0}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setTaxSettings({ ...taxSettings, tds_rate: val })
                        setTestTdsRate(val)
                      }}
                      className="w-20 h-7 text-xs font-mono font-bold text-center"
                    />
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* National Board of Revenue (NBR) Legal Particulars */}
        <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Building className="h-4 w-4 text-emerald-600" />
              <span>{tBilingual('National Board of Revenue (NBR) Legal Particulars', 'জাতীয় রাজস্ব বোর্ড (এনবিআর) নিবন্ধনের তথ্য')}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tBilingual(
                'These credentials are automatically rendered on official NBR Mushak 6.3 tax invoices, commercial bills, and challans.',
                'এই তথ্যাবলী অফিসিয়াল মূসক ৬.৩ কর চালানপত্র, বাণিজ্যিক বিল ও ডেলিভারি চালানে মুদ্রিত হবে।'
              )}
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="binNo" required className="text-xs font-semibold">
                  {tBilingual('13-Digit Business Identification Number (BIN)', '১৩ ডিজিটের মূসক নিবন্ধন নম্বর')}
                </Label>
                {taxSettings.bin_number && (
                  <Badge
                    variant="outline"
                    className={`text-2xs font-mono ${
                      binIsValid
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-amber-500 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {taxSettings.bin_number.replace(/\D/g, '').length} / 13 Digits
                  </Badge>
                )}
              </div>
              <Input
                id="binNo"
                placeholder="e.g. 1234567890123"
                value={taxSettings.bin_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, bin_number: e.target.value })}
                required
                className="font-mono font-bold tracking-wider text-sm h-9"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tinNo" required className="text-xs font-semibold">
                  {tBilingual('12-Digit Taxpayer Identification Number (TIN)', '১২ ডিজিটের ই-টিন নম্বর')}
                </Label>
                {taxSettings.tin_number && (
                  <Badge
                    variant="outline"
                    className={`text-2xs font-mono ${
                      tinIsValid
                        ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-amber-500 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {taxSettings.tin_number.replace(/\D/g, '').length} Digits
                  </Badge>
                )}
              </div>
              <Input
                id="tinNo"
                placeholder="e.g. 849201948123"
                value={taxSettings.tin_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, tin_number: e.target.value })}
                required
                className="font-mono text-sm h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="trdLic" required className="text-xs font-semibold">
                {tBilingual('Trade License Number', 'ট্রেড লাইসেন্স নম্বর')}
              </Label>
              <Input
                id="trdLic"
                placeholder="e.g. TRAD/DSCC/019284/2023"
                value={taxSettings.trade_license_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, trade_license_number: e.target.value })}
                required
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatComm" className="text-xs font-semibold">
                {tBilingual('VAT Commissionerate', 'কাস্টমস, এক্সাইজ ও ভ্যাট কমিশনারেট')}
              </Label>
              <Input
                id="vatComm"
                placeholder="e.g. Customs, Excise & VAT, Dhaka South"
                value={taxSettings.vat_commissionerate || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_commissionerate: e.target.value })}
                className="text-xs h-9"
                list="commissionerates-list"
              />
              <datalist id="commissionerates-list">
                {BANGLADESH_COMMISSIONERATES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatCirc" className="text-xs font-semibold">
                {tBilingual('VAT Circle / Division', 'ভ্যাট সার্কেল ও রাজস্ব বিভাগ')}
              </Label>
              <Input
                id="vatCirc"
                placeholder="e.g. Motijheel Circle, Revenue Division-02"
                value={taxSettings.vat_circle || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_circle: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="vatPerson" className="text-xs font-semibold flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                <span>{tBilingual('VAT Authorized Officer / In-Charge', 'দায়িত্বপ্রাপ্ত মূসক কর্মকর্তা')}</span>
              </Label>
              <Input
                id="vatPerson"
                placeholder="e.g. Md. Rafiqul Islam (Manager Finance)"
                value={taxSettings.vat_responsible_person || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_responsible_person: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatPhone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                <span>{tBilingual('Tax Officer Contact Mobile', 'কর্মকর্তার মোবাইল নম্বর')}</span>
              </Label>
              <Input
                id="vatPhone"
                placeholder="e.g. 01712345678"
                value={taxSettings.vat_responsible_phone || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_responsible_phone: e.target.value })}
                className="font-mono text-xs h-9"
              />
            </div>
          </div>

          {/* Statutory Documents Compliance Switches */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {tBilingual('Statutory NBR Documents Auto-Generation', 'এনবিআর সংবিধিবদ্ধ দলিল স্বয়ংক্রিয় তৈরি')}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={taxSettings.mushak_6_3_enabled !== false}
                  onChange={(e) => setTaxSettings({ ...taxSettings, mushak_6_3_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tBilingual('Mushak 6.3 (Tax Invoice)', 'মূসক-৬.৩ কর চালান')}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={taxSettings.mushak_6_5_enabled !== false}
                  onChange={(e) => setTaxSettings({ ...taxSettings, mushak_6_5_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tBilingual('Mushak 6.5 (Factory Transfer)', 'মূসক-৬.৫ কারখানা চালান')}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={taxSettings.mushak_6_6_enabled !== false}
                  onChange={(e) => setTaxSettings({ ...taxSettings, mushak_6_6_enabled: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {tBilingual('Mushak 6.6 (VDS Certificate)', 'মূসক-৬.৬ কর্তন সনদ')}
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-2xs text-slate-500 dark:text-slate-400">
              {tBilingual(
                'Changes take effect immediately on all new invoices, quotations, and challans.',
                'পরিবর্তনসমূহ তাৎক্ষণিকভাবে সকল নতুন ইনভয়েস ও কোটেশনে কার্যকর হবে।'
              )}
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold w-full sm:w-auto h-10 sm:h-9 px-5 shadow-xs"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Save Tax & VAT Settings', 'ভ্যাট ও ট্যাক্স সেটিংস সংরক্ষণ করুন')}
            </Button>
          </div>
        </Card>
      </form>

      {/* Interactive Live VAT Calculation Tester */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {tBilingual('Live Pricing, VAT & Withholding Simulator', 'লাইভ প্রাইসিং, ভ্যাট ও উৎসে কর সিমুলেটর')}
            </h3>
          </div>
          <span className="text-2xs text-slate-500 font-mono">
            {testMode === 'inclusive' ? 'Base = Total / (1 + Rate)' : 'VAT = Base * Rate'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Order Amount', 'অর্ডার মূল্য')}
            </Label>
            <Input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('VAT Rate (%)', 'ভ্যাট হার (%)')}
            </Label>
            <Input
              type="number"
              value={testRate}
              onChange={(e) => setTestRate(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Pricing Mode', 'মূল্য মোড')}
            </Label>
            <select
              value={testMode}
              onChange={(e) => setTestMode(e.target.value as any)}
              className="w-full h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="exclusive">VAT-Exclusive (+ VAT)</option>
              <option value="inclusive">VAT-Inclusive (Contains VAT)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('VDS Deduction (%)', 'উৎসে মূসক কর্তন (%)')}
            </Label>
            <Input
              type="number"
              step="0.5"
              value={testVdsRate}
              onChange={(e) => setTestVdsRate(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
              placeholder="0%"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('TDS Deduction (%)', 'উৎসে আয়কর কর্তন (%)')}
            </Label>
            <Input
              type="number"
              step="0.5"
              value={testTdsRate}
              onChange={(e) => setTestTdsRate(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
              placeholder="0%"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-0.5">
            <span className="text-slate-500 text-2xs uppercase">{tBilingual('Base Price', 'মূল পণ্যের দাম')}:</span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {formatBDT(testCalcResult.baseAmount)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-blue-600 dark:text-blue-400 text-2xs uppercase">
              {tBilingual('VAT Amount', 'ভ্যাট পরিমাণ')} ({testCalcResult.vatRate}%):
            </span>
            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
              +{formatBDT(testCalcResult.vatAmount)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-purple-600 dark:text-purple-400 text-2xs uppercase">
              {tBilingual('Withheld (VDS+TDS)', 'মোট উৎসে কর্তন')}:
            </span>
            <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">
              -{formatBDT(testCalcResult.vdsAmount + testCalcResult.tdsAmount)}
            </div>
          </div>

          <div className="space-y-0.5 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <span className="text-emerald-700 dark:text-emerald-300 text-2xs uppercase font-bold">
              {tBilingual('Net Cash/Bank Due', 'নেট প্রাপ্তব্য টাকা')}:
            </span>
            <div className="font-black text-emerald-700 dark:text-emerald-300 text-base">
              {formatBDT(testCalcResult.netReceivable)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
