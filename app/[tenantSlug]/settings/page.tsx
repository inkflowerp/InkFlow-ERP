'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Save,
  Globe,
  Percent,
} from 'lucide-react'
import { companySettingsSchema, CompanySettingsFormData } from '@/features/tenant/tenant.schemas'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'

export default function CompanySettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { locale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'prefixes' | 'regional'>('general')

  const lastLoadedCompanyIdRef = React.useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: company?.name || '',
      name_bn: company?.name_bn || '',
      logo_url: company?.logo_url || '',
      phone: company?.phone || settings?.phone || '',
      whatsapp: company?.whatsapp || settings?.whatsapp || '',
      email: company?.email || settings?.email || '',
      address: company?.address || '',
      address_bn: company?.address_bn || '',
      area: company?.area || '',
      bin_no: company?.bin_no || '',
      tin_no: company?.tin_no || '',
      trade_license_no: company?.trade_license_no || '',
      invoice_prefix: settings?.invoice_prefix || 'INV',
      quotation_prefix: settings?.quotation_prefix || 'QT',
      challan_prefix: settings?.challan_prefix || 'CH',
      default_currency: settings?.default_currency || 'BDT',
      default_language: (settings?.default_language as 'en' | 'bn') || 'bn',
      vat_enabled: settings?.vat_enabled ?? true,
      vat_rate: Number(settings?.vat_rate ?? 7.5),
    },
  })

  // Synchronize form when company data loads asynchronously from database
  useEffect(() => {
    if (company && (!lastLoadedCompanyIdRef.current || lastLoadedCompanyIdRef.current !== company.id)) {
      if (!isDirty) {
        lastLoadedCompanyIdRef.current = company.id
        reset({
          name: company.name || '',
          name_bn: company.name_bn || '',
          logo_url: company.logo_url || '',
          phone: company.phone || settings?.phone || '',
          whatsapp: company.whatsapp || settings?.whatsapp || '',
          email: company.email || settings?.email || '',
          address: company.address || '',
          address_bn: company.address_bn || '',
          area: company.area || '',
          bin_no: company.bin_no || '',
          tin_no: company.tin_no || '',
          trade_license_no: company.trade_license_no || '',
          invoice_prefix: settings?.invoice_prefix || 'INV',
          quotation_prefix: settings?.quotation_prefix || 'QT',
          challan_prefix: settings?.challan_prefix || 'CH',
          default_currency: settings?.default_currency || 'BDT',
          default_language: (settings?.default_language as 'en' | 'bn') || 'bn',
          vat_enabled: settings?.vat_enabled ?? true,
          vat_rate: Number(settings?.vat_rate ?? 7.5),
        })
      }
    }
  }, [company, settings, reset, isDirty])

  const watchedVatEnabled = watch('vat_enabled')

  const onSubmit = async (data: CompanySettingsFormData) => {
    if (!company) return
    setIsLoading(true)
    setIsSaved(false)

    try {
      // 1. Update company record
      await updateCompanyAction(company.id, {
        name: data.name,
        name_bn: data.name_bn || null,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        email: data.email,
        address: data.address,
        address_bn: data.address_bn || null,
        bin_no: data.bin_no || null,
        tin_no: data.tin_no || null,
        trade_license_no: data.trade_license_no || null,
      })

      // 2. Update company settings record
      await updateCompanySettingsAction(company.id, {
        invoice_prefix: data.invoice_prefix,
        quotation_prefix: data.quotation_prefix,
        challan_prefix: data.challan_prefix,
        vat_enabled: data.vat_enabled,
        vat_rate: data.vat_rate,
        default_currency: data.default_currency,
        default_language: data.default_language,
        whatsapp: data.whatsapp || null,
        phone: data.phone,
        email: data.email,
      })

      await refreshTenant()
      reset(data) // Establish saved data as clean form state
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Actions */}
      <PageHeader
        titleEn="Company Settings"
        titleBn="কোম্পানি সেটিংস"
        descriptionEn="Configure enterprise identity, tax registrations, document numbering sequences, and localization."
        descriptionBn="প্রতিষ্ঠানের তথ্য, ট্যাক্স নিবন্ধন, চালান নম্বর ক্রম এবং আঞ্চলিক ভাষা সেটিংস।"
        icon={Building2}
        iconColor="text-blue-600"
        actions={
          isSaved ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bangla-text">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {tBilingual('Settings saved successfully!', 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!')}
            </div>
          ) : undefined
        }
      />

      <SettingsNav />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: 'general', label: 'General Identity', icon: Building2 },
          { id: 'tax', label: 'BIN, TIN & VAT', icon: ShieldCheck },
          { id: 'prefixes', label: 'Document Prefixes', icon: FileText },
          { id: 'regional', label: 'Regional & Language', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* TAB 1: GENERAL IDENTITY */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>General Company Information</CardTitle>
              <CardDescription>
                Details printed on customer quotations, work orders, invoices, and delivery challans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" required>
                    Company Name (English)
                  </Label>
                  <Input id="name" {...register('name')} error={errors.name?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name_bn">প্রতিষ্ঠানের নাম (বাংলায়)</Label>
                  <Input id="name_bn" {...register('name_bn')} error={errors.name_bn?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" required>
                    Primary Phone (ফোন)
                  </Label>
                  <Input id="phone" {...register('phone')} error={errors.phone?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp">
                    WhatsApp Business (হোয়াটসঅ্যাপ)
                  </Label>
                  <Input id="whatsapp" {...register('whatsapp')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" required>
                    Official Email (ইমেইল)
                  </Label>
                  <Input id="email" type="email" {...register('email')} error={errors.email?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" required>
                    Full Address (English)
                  </Label>
                  <Input id="address" {...register('address')} error={errors.address?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address_bn">ঠিকানা (বাংলায়)</Label>
                  <Input id="address_bn" {...register('address_bn')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo_url">Company Logo URL</Label>
                <Input id="logo_url" placeholder="https://..." {...register('logo_url')} />
                <span className="text-[11px] text-slate-500">
                  Will appear on printed invoices and PDF work challans.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: TAX & REGISTRATIONS */}
        {activeTab === 'tax' && (
          <Card>
            <CardHeader>
              <CardTitle>Government & Tax Registrations</CardTitle>
              <CardDescription>
                NBR VAT registration, Taxpayer Identification, and City Corporation Trade License.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bin_no">
                    BIN (Business Identification Number / ভ্যাট নিবন্ধন নং)
                  </Label>
                  <Input id="bin_no" placeholder="e.g. 004819284-0101" {...register('bin_no')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tin_no">TIN (Tax Identification Number / ই-টিন নং)</Label>
                  <Input id="tin_no" placeholder="e.g. 8492049182" {...register('tin_no')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="trade_license_no">
                    Trade License Number (ট্রেড লাইসেন্স নং)
                  </Label>
                  <Input id="trade_license_no" placeholder="TRAD/DNCC/..." {...register('trade_license_no')} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      Automated VAT Calculation (ভ্যাট গণনা)
                    </div>
                    <p className="text-xs text-slate-500">
                      Automatically calculate VAT on printing jobs and billings.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="vat_enabled"
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    {...register('vat_enabled')}
                  />
                </div>

                {watchedVatEnabled && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-48 space-y-1">
                      <Label htmlFor="vat_rate">Default VAT Rate (%)</Label>
                      <div className="relative">
                        <Input
                          id="vat_rate"
                          type="number"
                          step="0.1"
                          {...register('vat_rate', { valueAsNumber: true })}
                        />
                        <Percent className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-5">
                      Standard VAT in Bangladesh: 7.5% for printing services, 15% standard rate.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: DOCUMENT PREFIXES */}
        {activeTab === 'prefixes' && (
          <Card>
            <CardHeader>
              <CardTitle>Document Numbering & Sequences</CardTitle>
              <CardDescription>
                Customize the serial prefixes generated on quotations, tax invoices, and delivery challans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quotation_prefix" required>
                    Quotation Prefix (কোটেশন প্রিফিক্স)
                  </Label>
                  <Input id="quotation_prefix" placeholder="QT" {...register('quotation_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: QT-2024-0012</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice_prefix" required>
                    Invoice Prefix (ইনভয়েস প্রিফিক্স)
                  </Label>
                  <Input id="invoice_prefix" placeholder="INV" {...register('invoice_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: INV-2024-0482</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="challan_prefix" required>
                    Challan Prefix (চালান প্রিফিক্স)
                  </Label>
                  <Input id="challan_prefix" placeholder="CH" {...register('challan_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: CH-2024-0091</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: REGIONAL & LOCALIZATION */}
        {activeTab === 'regional' && (
          <Card>
            <CardHeader>
              <CardTitle>Regional & Language Preferences</CardTitle>
              <CardDescription>
                Default currency and presentation language for vouchers and system interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="default_currency">Default Currency</Label>
                  <Input id="default_currency" value="BDT (৳)" readOnly className="bg-slate-50" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="default_language">Default Interface Language</Label>
                  <select
                    id="default_language"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    {...register('default_language')}
                  >
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="submit" isLoading={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-1.5 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
