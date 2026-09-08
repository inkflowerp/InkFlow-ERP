'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  DEMO_TAX_SETTINGS,
  DEMO_VAT_MONTHLY_RETURN,
  calculateVat,
} from '@/services/tax-and-docs.service'
import { CompanyTaxSettingsRecord, VatPricingMode } from '@/types/tax-and-docs.types'
import { formatBDT } from '@/lib/formatters'

export default function TaxSettingsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [taxSettings, setTaxSettings] = useDataStore<CompanyTaxSettingsRecord>(
    STORAGE_KEYS.TAX_SETTINGS,
    DEMO_TAX_SETTINGS
  )
  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [purchases] = useDataStore<any[]>(STORAGE_KEYS.PURCHASE_ORDERS, [])
  const [notification, setNotification] = useState<string | null>(null)

  // Compute live NBR VAT return from store
  const vatReturnSummary = React.useMemo(() => {
    const currentMonthInvoices = invoices.filter((inv) => {
      if (!inv.created_at && !inv.issue_date) return true
      const d = new Date(inv.created_at || inv.issue_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const grossTurnover = currentMonthInvoices.reduce((sum, i) => sum + (Number(i.subtotal) || Number(i.total_amount) || 0), 0)
    const outputVat = currentMonthInvoices.reduce((sum, i) => sum + (Number(i.vat_amount) || Number(i.tax_amount) || 0), 0)
    const inputVat = purchases.reduce((sum, p) => sum + (Number(p.vat_amount) || Number(p.tax_amount) || 0), 0)
    const netPayableVat = Math.max(0, outputVat - inputVat)

    return {
      period: new Date().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' }),
      grossTurnover,
      outputVat,
      inputVat,
      netPayableVat,
    }
  }, [invoices, purchases, locale])

  // Live Calculator State
  const [testAmount, setTestAmount] = useState<number>(10000)
  const [testRate, setTestRate] = useState<number>(taxSettings.default_vat_rate)
  const [testMode, setTestMode] = useState<VatPricingMode>(taxSettings.pricing_mode)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault()
    setTaxSettings(taxSettings)
    showNotification('Company tax and Bangladesh VAT settings saved successfully!')
  }

  const testCalcResult = calculateVat(testAmount, testRate, testMode)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <PageHeader
        titleEn="Bangladesh VAT & Tax Configuration"
        titleBn="বাংলাদেশ ভ্যাট ও ট্যাক্স সেটিংস"
        descriptionEn="Configure 13-digit BIN, NBR VAT rates, inclusive/exclusive pricing modes, and monthly Mushak return summaries."
        descriptionBn="১৩ ডিজিটের বিআইএন, এনবিআর ভ্যাট হার, ভ্যাট অন্তর্ভুক্তি মোড এবং মাসিক মূসক রিটার্ন কনফিগার করুন।"
        icon={Landmark}
        iconColor="text-emerald-600"
        actions={
          <Link
            href={`/${slug}/settings/documents`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 bangla-text"
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            {tBilingual('Document Designer & Templates', 'ডকুমেন্ট ডিজাইনার ও টেমপ্লেট')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* NBR Monthly VAT Return Cockpit (Mushak 9.1 Summary) */}
      <Card className="p-5 border-l-4 border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-emerald-950 dark:text-emerald-200">
                NBR Monthly VAT Return Summary (মূসক-৯.১ সারাংশ)
              </h3>
              <Badge className="bg-emerald-200 text-emerald-900 text-[10px]">
                {vatReturnSummary.period}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Net VAT payable to Government Treasury after input tax rebate deduction.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Net Treasury Payable</span>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              ৳ {formatBDT(vatReturnSummary.netPayableVat)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase">1. Gross Taxable Turnover:</span>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              ৳ {formatBDT(vatReturnSummary.grossTurnover)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border space-y-0.5">
            <span className="text-blue-600 text-[10px] uppercase font-bold">2. Output VAT Collected (বিক্রয় মূসক):</span>
            <div className="font-bold text-blue-600 text-sm">
              +৳ {formatBDT(vatReturnSummary.outputVat)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border space-y-0.5">
            <span className="text-purple-600 text-[10px] uppercase font-bold">3. Input VAT Paid (ক্রয় মূসক রেয়াত):</span>
            <div className="font-bold text-purple-600 text-sm">
              -৳ {formatBDT(vatReturnSummary.inputVat)}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveTax} className="space-y-6">
        {/* VAT Master Controls */}
        <Card className="p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <CardTitle className="text-base">VAT &amp; Pricing Policies</CardTitle>
              <CardDescription className="text-xs">
                Control company-wide VAT calculation, tax inclusion, and default rates.
              </CardDescription>
            </div>

            {/* VAT Master Switch */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {taxSettings.vat_enabled ? 'VAT Enabled' : 'VAT Disabled'}
              </span>
              <Button
                type="button"
                size="sm"
                variant={taxSettings.vat_enabled ? 'default' : 'outline'}
                onClick={() =>
                  setTaxSettings({ ...taxSettings, vat_enabled: !taxSettings.vat_enabled })
                }
                className={`h-7 px-3 text-xs font-bold ${
                  taxSettings.vat_enabled ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                {taxSettings.vat_enabled ? 'Active' : 'Disabled'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pricing Mode */}
            <div className="space-y-2">
              <Label className="font-bold text-xs">Pricing Calculation Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTaxSettings({ ...taxSettings, pricing_mode: 'exclusive' })
                    setTestMode('exclusive')
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    taxSettings.pricing_mode === 'exclusive'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">VAT-Exclusive (মূল্য + ভ্যাট)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    VAT added on top of item rate.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaxSettings({ ...taxSettings, pricing_mode: 'inclusive' })
                    setTestMode('inclusive')
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    taxSettings.pricing_mode === 'inclusive'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">VAT-Inclusive (ভ্যাটসহ)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Item price already contains VAT.
                  </div>
                </button>
              </div>
            </div>

            {/* Default VAT Rate */}
            <div className="space-y-2">
              <Label className="font-bold text-xs">Default VAT Rate (%)</Label>
              <div className="flex items-center gap-2">
                {[5, 7.5, 10, 15].map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    size="sm"
                    variant={taxSettings.default_vat_rate === rate ? 'default' : 'outline'}
                    onClick={() => {
                      setTaxSettings({ ...taxSettings, default_vat_rate: rate })
                      setTestRate(rate)
                    }}
                    className="text-xs h-9 px-3.5 font-bold"
                  >
                    {rate}%
                  </Button>
                ))}
                <Input
                  type="number"
                  step="0.5"
                  value={taxSettings.default_vat_rate}
                  onChange={(e) => {
                    const r = Number(e.target.value)
                    setTaxSettings({ ...taxSettings, default_vat_rate: r })
                    setTestRate(r)
                  }}
                  className="w-20 h-9 text-xs font-mono font-bold"
                />
              </div>
              <span className="text-[11px] text-slate-400 block">
                Standard NBR rate for manufacturing and signage is 15%. Truncated rates (5% / 7.5%) apply for specific service categories.
              </span>
            </div>
          </div>
        </Card>

        {/* Company Tax Particulars */}
        <Card className="p-6 space-y-4">
          <CardTitle className="text-base">National Board of Revenue (NBR) Particulars</CardTitle>
          <CardDescription className="text-xs">
            Printed on official NBR Mushak 6.3 tax invoices, commercial bills, and challans.
          </CardDescription>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="binNo" required>13-Digit Business Identification Number (BIN)</Label>
              <Input
                id="binNo"
                placeholder="e.g. 1234567890123"
                value={taxSettings.bin_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, bin_number: e.target.value })}
                required
                className="font-mono font-bold tracking-widest text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tinNo" required>12-Digit Taxpayer Identification Number (TIN)</Label>
              <Input
                id="tinNo"
                placeholder="e.g. 849201948123"
                value={taxSettings.tin_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, tin_number: e.target.value })}
                required
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="trdLic" required>Trade License Number</Label>
              <Input
                id="trdLic"
                placeholder="e.g. TRAD/DSCC/019284/2023"
                value={taxSettings.trade_license_number || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, trade_license_number: e.target.value })}
                required
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatComm">VAT Commissionerate</Label>
              <Input
                id="vatComm"
                placeholder="e.g. Customs, Excise & VAT, Dhaka South"
                value={taxSettings.vat_commissionerate || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_commissionerate: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatCirc">VAT Circle / Division</Label>
              <Input
                id="vatCirc"
                placeholder="e.g. Motijheel Circle, Revenue Division-02"
                value={taxSettings.vat_circle || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, vat_circle: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Tax Particulars
            </Button>
          </div>
        </Card>
      </form>

      {/* Interactive Live VAT Calculation Tester */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Live Pricing &amp; VAT Calculation Simulator
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Entered Amount (৳)</Label>
            <Input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">VAT Rate (%)</Label>
            <Input
              type="number"
              value={testRate}
              onChange={(e) => setTestRate(Number(e.target.value))}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Pricing Mode</Label>
            <select
              value={testMode}
              onChange={(e) => setTestMode(e.target.value as any)}
              className="w-full h-8 px-2 rounded-md border text-xs font-bold"
            >
              <option value="exclusive">VAT-Exclusive (+ VAT)</option>
              <option value="inclusive">VAT-Inclusive (Contains VAT)</option>
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border text-xs font-mono space-y-0.5">
            <div className="flex justify-between">
              <span>Base:</span>
              <strong>৳ {formatBDT(testCalcResult.baseAmount)}</strong>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>VAT ({testCalcResult.vatRate}%):</span>
              <strong>৳ {formatBDT(testCalcResult.vatAmount)}</strong>
            </div>
            <div className="flex justify-between border-t pt-0.5 font-bold text-slate-900 dark:text-white">
              <span>Total:</span>
              <strong>৳ {formatBDT(testCalcResult.totalAmount)}</strong>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
