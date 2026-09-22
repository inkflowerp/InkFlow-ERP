'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
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
  Clock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Landmark,
  Sparkles,
  Palette,
  GitBranch,
  QrCode,
  Bell,
  Users,
  Workflow,
  Crown,
  ArrowRight,
  Hash,
  Globe2,
  RefreshCw,
} from 'lucide-react'
import { companySettingsSchema, CompanySettingsFormData } from '@/features/tenant/tenant.schemas'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

const OFFICE_HOURS_PRESETS = [
  '9:00 AM - 8:00 PM (Sat - Thu)',
  '10:00 AM - 9:00 PM (Sat - Thu)',
  '9:30 AM - 7:30 PM (Sun - Thu)',
  '8:30 AM - 6:30 PM (Sat - Thu)',
  '24/7 Production Floor',
]

const HOLIDAY_PRESETS = [
  'Friday (সাপ্তাহিক ছুটি)',
  'Friday & Saturday (দ্বি-সাপ্তাহিক ছুটি)',
  'Friday & Govt Holidays (শুক্রবার ও সরকারি ছুটি)',
  'Sunday (রবিবার)',
]

export default function CompanySettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { locale, tBilingual } = useI18n()
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'rangao'

  const [mounted, setMounted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'tax' | 'prefixes' | 'regional'>('general')

  const lastLoadedCompanyIdRef = React.useRef<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: company?.name || '',
      name_bn: company?.name_bn || '',
      legal_name: company?.legal_name || (settings as any)?.legal_name || '',
      logo_url: company?.logo_url || settings?.logo_url || '',
      phone: company?.phone || settings?.phone || '',
      whatsapp: company?.whatsapp || settings?.whatsapp || '',
      email: company?.email || settings?.email || '',
      address: company?.address || '',
      address_bn: company?.address_bn || '',
      area: company?.area || '',
      office_hours: company?.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
      holidays: company?.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Synchronize form when company data loads asynchronously from database
  useEffect(() => {
    if (company && (!lastLoadedCompanyIdRef.current || lastLoadedCompanyIdRef.current !== company.id)) {
      if (!isDirty) {
        lastLoadedCompanyIdRef.current = company.id
        reset({
          name: company.name || '',
          name_bn: company.name_bn || '',
          legal_name: company.legal_name || (settings as any)?.legal_name || '',
          logo_url: company.logo_url || settings?.logo_url || '',
          phone: company.phone || settings?.phone || '',
          whatsapp: company.whatsapp || settings?.whatsapp || '',
          email: company.email || settings?.email || '',
          address: company.address || '',
          address_bn: company.address_bn || '',
          area: company.area || '',
          office_hours: company.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
          holidays: company.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
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

  // Real-time synchronization listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSync = () => {
      refreshTenant?.()
    }

    window.addEventListener('printerp_table_synced:company', handleSync)
    window.addEventListener('printerp_table_synced:settings', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:company', handleSync)
      window.removeEventListener('printerp_table_synced:settings', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [refreshTenant])

  const watchedVatEnabled = watch('vat_enabled')
  const watchedLogoUrl = watch('logo_url')

  const onSubmit = async (data: CompanySettingsFormData) => {
    if (!company) return
    setIsLoading(true)
    setIsSaved(false)

    try {
      // 1. Update company record with all company fields
      await updateCompanyAction(company.id, {
        name: data.name,
        name_bn: data.name_bn || null,
        legal_name: data.legal_name || null,
        logo_url: data.logo_url || null,
        phone: data.phone,
        whatsapp: data.whatsapp || null,
        email: data.email,
        address: data.address,
        address_bn: data.address_bn || null,
        area: data.area || null,
        office_hours: data.office_hours || null,
        holidays: data.holidays || null,
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
        logo_url: data.logo_url || null,
        office_hours: data.office_hours || null,
        holidays: data.holidays || null,
      })

      await refreshTenant()
      reset(data) // Establish saved data as clean form state
      setIsSaved(true)

      // Broadcast update across windows
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:settings', { detail: { companyId: company.id } }))
        window.dispatchEvent(new CustomEvent('printerp_table_synced:company', { detail: { companyId: company.id } }))
      }

      setTimeout(() => setIsSaved(false), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Actions */}
      <PageHeader
        titleEn="Company Profile & Settings"
        titleBn="প্রতিষ্ঠান পরিচিতি ও সেটিংস"
        descriptionEn="Manage corporate identity, legal entity details, NBR tax registrations, office hours, and official contact channels."
        descriptionBn="প্রাতিষ্ঠানিক তথ্য, আইনি সত্তা, এনবিআর ট্যাক্স নিবন্ধন, অফিস সময়সূচি এবং যোগাযোগের তথ্য পরিচালনা করুন।"
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

      {/* Master Settings Modules Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            title: 'Company Profile',
            titleBn: 'প্রতিষ্ঠান পরিচিতি',
            desc: 'Legal entity, office hours, contacts & trade license',
            path: '/settings/company',
            icon: Building2,
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
            badge: company?.name ? 'Configured' : 'Setup Required',
          },
          {
            title: 'Branding & Theme',
            titleBn: 'ব্র্যান্ডিং ও লোগো',
            desc: 'Custom colors, header logos, and bill footer terms',
            path: '/settings/branding',
            icon: Palette,
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50',
            badge: 'Theme Active',
          },
          {
            title: 'Language & Formats',
            titleBn: 'ভাষা ও মুদ্রা',
            desc: 'BDT / USD, DD/MM/YYYY, Bengali/English UI',
            path: '/settings/localization',
            icon: Globe2,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
            badge: `${company?.currency || 'BDT'} / ${company?.default_locale === 'en' ? 'EN' : 'BN'}`,
          },
          {
            title: 'Tax & NBR BIN/TIN',
            titleBn: 'ট্যাক্স ও ভ্যাট',
            desc: '13-digit BIN, Mushak 6.3 rates, inclusive/exclusive pricing',
            path: '/settings/tax',
            icon: Landmark,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
            badge: company?.bin_no ? 'BIN Active' : 'No BIN',
          },
          {
            title: 'Document Numbering',
            titleBn: 'ডকুমেন্ট নাম্বারিং',
            desc: 'INV, QUO, CHL sequence prefixes and padding',
            path: '/settings/document-numbering',
            icon: Hash,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
            badge: 'PostgreSQL Safe',
          },
          {
            title: 'Document Templates',
            titleBn: 'ডকুমেন্ট টেমপ্লেট',
            desc: 'PDF invoice, quotation designer & WhatsApp variables',
            path: '/settings/documents',
            icon: FileText,
            color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50',
            badge: 'Live Preview',
          },
          {
            title: 'Workflow Automations',
            titleBn: 'কাজের অটোমেশন',
            desc: 'Auto-convert quotations, trigger jobs & status alerts',
            path: '/settings/automations',
            icon: Workflow,
            color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/50',
            badge: 'Pipelines Active',
          },
          {
            title: 'Branches & Factories',
            titleBn: 'শাখা ও কারখানা',
            desc: 'Showrooms, print floors & regional fabrication hubs',
            path: '/settings/branches',
            icon: GitBranch,
            color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50',
            badge: 'Hubs Managed',
          },
          {
            title: 'Attendance & QR',
            titleBn: 'হাজিরা ও কিউআর',
            desc: 'Workplace geofence GPS and cryptographic QR tokens',
            path: '/settings/attendance',
            icon: QrCode,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
            badge: 'Geofence Active',
          },
          {
            title: 'Notifications & SMS',
            titleBn: 'নোটিফিকেশন ও এসএমএস',
            desc: 'Bangladeshi masked SMS, WhatsApp & audio chimes',
            path: '/settings/notifications',
            icon: Bell,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
            badge: 'Audio & SMS',
          },
          {
            title: 'Email Gateway',
            titleBn: 'ইমেইল গেটওয়ে',
            desc: 'Gmail OAuth 2.0 and custom authenticated SMTP server',
            path: '/settings/email',
            icon: Mail,
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
            badge: 'Gmail / SMTP',
          },
          {
            title: 'Team Users',
            titleBn: 'টিম মেম্বার',
            desc: 'Manage staff accounts, departments & responsibilities',
            path: '/settings/users',
            icon: Users,
            color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50',
            badge: 'RBAC Members',
          },
          {
            title: 'Roles & Permissions',
            titleBn: 'অনুমতি ম্যাট্রিক্স',
            desc: 'Custom roles & granular module action checkboxes',
            path: '/settings/roles',
            icon: ShieldCheck,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
            badge: 'Permission Matrix',
          },
          {
            title: 'Subscription & Quotas',
            titleBn: 'সাবস্ক্রিপশন ও কোটা',
            desc: 'Plan tier, 6 resource limit meters & billing statements',
            path: '/settings/subscription',
            icon: Crown,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
            badge: 'Tier Status',
          },
        ].map((item) => {
          const Icon = item.icon
          const targetHref = getTenantNavHref(item.path, pathname, tenantSlug)
          return (
            <Link
              key={item.path}
              href={targetHref}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group min-h-[120px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${item.color} shrink-0`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                    {item.badge}
                  </Badge>
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    <span>{item.title}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.titleBn}</div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Settings Tabs */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>{tBilingual('Quick Settings Editor', 'কুইক সেটিংস এডিটর')}</span>
          </h2>
          <span className="text-xs text-slate-400">
            {tBilingual('Inline General & Tax Configuration', 'সাধারণ ও ট্যাক্স কনফিগারেশন')}
          </span>
        </div>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto touch-scroll">
          {[
            { id: 'general', labelEn: 'General Identity', labelBn: 'সাধারণ তথ্য', icon: Building2 },
            { id: 'schedule', labelEn: 'Office Hours & Holidays', labelBn: 'অফিস সময় ও ছুটি', icon: Clock },
            { id: 'tax', labelEn: 'BIN, TIN & Trade License', labelBn: 'ট্যাক্স ও নিবন্ধন', icon: ShieldCheck },
            { id: 'prefixes', labelEn: 'Document Prefixes', labelBn: 'ডকুমেন্ট প্রিফিক্স', icon: FileText },
            { id: 'regional', labelEn: 'Regional & Language', labelBn: 'ভাষা ও অঞ্চল', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap h-10 sm:h-9 shrink-0 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* TAB 1: GENERAL IDENTITY */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {tBilingual('Corporate Identity & Branding', 'প্রাতিষ্ঠানিক পরিচয় ও ব্র্যান্ডিং')}
                </CardTitle>
                <CardDescription>
                  {tBilingual(
                    'Display names, registered legal entity, and corporate logo printed on invoices and contracts.',
                    'ইনভয়েস এবং চুক্তিতে মুদ্রিত প্রদর্শনী নাম, আইনি সত্তা এবং লোগো।'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" required>
                      {tBilingual('Display Name (English)', 'প্রদর্শনী নাম (ইংরেজি)')}
                    </Label>
                    <Input id="name" {...register('name')} error={errors.name?.message} placeholder="e.g. Rapid Print & Media" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="name_bn">
                      {tBilingual('Display Name (বাংলা)', 'প্রদর্শনী নাম (বাংলা)')}
                    </Label>
                    <Input id="name_bn" {...register('name_bn')} error={errors.name_bn?.message} placeholder="উদা: র‍্যাপিড প্রিন্ট অ্যান্ড মিডিয়া" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="legal_name">
                      {tBilingual('Registered Legal Entity Name (for NBR & Contracts)', 'নিবন্ধিত আইনি নাম (চুক্তি ও এনবিআর এর জন্য)')}
                    </Label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      {tBilingual('For contracts & VAT challans', 'চুক্তি ও ভ্যাট চালানের জন্য')}
                    </span>
                  </div>
                  <Input
                    id="legal_name"
                    placeholder="e.g. Rapid Print Solutions Limited"
                    {...register('legal_name')}
                  />
                  <p className="text-[11px] text-slate-500">
                    {tBilingual(
                      'Official registered company name used for formal contracts, legal tender submissions, and NBR Mushak forms.',
                      'অফিসিয়াল নিবন্ধিত নাম যা সরকারি চুক্তি, টেন্ডার এবং এনবিআর মূসক ফর্মে ব্যবহৃত হয়।'
                    )}
                  </p>
                </div>

                {/* Company Logo with Live Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label htmlFor="logo_url">
                    {tBilingual('Company Logo URL', 'কোম্পানির লোগো লিংক (URL)')}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="h-16 w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                      {watchedLogoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={watchedLogoUrl}
                          alt="Company Logo Preview"
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="text-center p-2">
                          <ImageIcon className="h-5 w-5 mx-auto text-slate-400" />
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {tBilingual('No Logo', 'লোগো নেই')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-1">
                      <Input
                        id="logo_url"
                        placeholder="https://example.com/logo.png"
                        {...register('logo_url')}
                      />
                      <span className="text-[11px] text-slate-500 block">
                        {tBilingual(
                          'Will appear on header of printed quotations, job challans, and customer receipts.',
                          'প্রিন্টকৃত কোটেশন, ডেলিভারি চালান ও মানি রসিদের শীর্ষে প্রদর্শিত হবে।'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  {tBilingual('Official Contact Channels', 'অফিশিয়াল যোগাযোগের মাধ্যম')}
                </CardTitle>
                <CardDescription>
                  {tBilingual(
                    'Phone, WhatsApp, and official billing email for customer support and payment notifications.',
                    'গ্রাহক সেবা ও পেমেন্ট বিজ্ঞপ্তির জন্য অফিস ফোন, হোয়াটসঅ্যাপ ও ইমেইল।'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" required>
                      {tBilingual('Office Phone Number', 'অফিস ফোন নম্বর')}
                    </Label>
                    <Input id="phone" placeholder="+880 1711-000000" {...register('phone')} error={errors.phone?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp">
                      {tBilingual('Business WhatsApp Number', 'বিজনেস হোয়াটসঅ্যাপ নম্বর')}
                    </Label>
                    <Input id="whatsapp" placeholder="+880 1811-000000" {...register('whatsapp')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" required>
                      {tBilingual('Official Billing Email', 'অফিসিয়াল বিলিং ইমেইল')}
                    </Label>
                    <Input id="email" type="email" placeholder="billing@company.com" {...register('email')} error={errors.email?.message} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  {tBilingual('Address & Production Hub', 'ঠিকানা ও উৎপাদন হাব')}
                </CardTitle>
                <CardDescription>
                  {tBilingual(
                    'Physical factory location, commercial printing hub, and showroom address.',
                    'কারখানার অবস্থান, কমার্শিয়াল প্রিন্টিং মার্কেট এবং শোরুমের ঠিকানা।'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="area">
                    {tBilingual('Commercial Area / Printing Hub', 'মার্কেট বা বাণিজ্যিক এলাকা')}
                  </Label>
                  <Input id="area" placeholder="e.g. Fakirapool, Arambagh, Banglabazar, Nilkhet" {...register('area')} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" required>
                      {tBilingual('Full Address (English)', 'পূর্ণাঙ্গ ঠিকানা (ইংরেজি)')}
                    </Label>
                    <Input id="address" placeholder="e.g. 14/A Toyenbee Circular Road, Motijheel" {...register('address')} error={errors.address?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address_bn">
                      {tBilingual('Full Address (বাংলা)', 'পূর্ণাঙ্গ ঠিকানা (বাংলা)')}
                    </Label>
                    <Input id="address_bn" placeholder="উদা: ১৪/এ তোয়েনবি সার্কুলার রোড, মতিঝিল" {...register('address_bn')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: OFFICE HOURS & HOLIDAYS */}
        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-600" />
                {tBilingual('Office Hours & Operational Holiday Schedule', 'অফিস সময়সূচি ও সাপ্তাহিক ছুটি')}
              </CardTitle>
              <CardDescription>
                {tBilingual(
                  'Define your shop opening hours and weekly holidays for customer inquiries and order delivery scheduling.',
                  'গ্রাহকদের অর্ডার ডেলিভারি ও কাজের জন্য দোকান খোলার সময় ও ছুটির দিন নির্ধারণ করুন।'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="office_hours" className="text-sm font-semibold">
                  {tBilingual('Office Hours / Business Hours', 'অফিস সময়সূচী')}
                </Label>
                <Input
                  id="office_hours"
                  placeholder="e.g. 9:00 AM - 8:00 PM (Sat - Thu)"
                  {...register('office_hours')}
                />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">{tBilingual('Quick Presets:', 'কুইক প্রিসেট:')}</span>
                  {OFFICE_HOURS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue('office_hours', preset, { shouldDirty: true })}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 min-h-[32px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Label htmlFor="holidays" className="text-sm font-semibold">
                  {tBilingual('Weekly Holiday & Closed Days', 'সাপ্তাহিক ছুটি ও বন্ধের দিন')}
                </Label>
                <Input
                  id="holidays"
                  placeholder="e.g. Friday (সাপ্তাহিক ছুটি)"
                  {...register('holidays')}
                />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">{tBilingual('Quick Presets:', 'কুইক প্রিসেট:')}</span>
                  {HOLIDAY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue('holidays', preset, { shouldDirty: true })}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 min-h-[32px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: TAX & REGISTRATIONS */}
        {activeTab === 'tax' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {tBilingual('Government & Tax Registrations', 'সরকারি ও ট্যাক্স নিবন্ধন')}
              </CardTitle>
              <CardDescription>
                {tBilingual(
                  'NBR VAT registration (BIN), Taxpayer Identification (TIN), and City Corporation Trade License.',
                  'জাতীয় রাজস্ব বোর্ড (এনবিআর) ভ্যাট নিবন্ধন (বিআইএন), ই-টিন এবং সিটি কর্পোরেশন ট্রেড লাইসেন্স।'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="trade_license_no">
                    {tBilingual('Trade License Number', 'ট্রেড লাইসেন্স নং')}
                  </Label>
                  <Input id="trade_license_no" placeholder="TRAD/DNCC/..." {...register('trade_license_no')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bin_no">
                    {tBilingual('BIN (Business Identification Number)', 'ভ্যাট নিবন্ধন নং (BIN)')}
                  </Label>
                  <Input id="bin_no" placeholder="e.g. 004819284-0101" {...register('bin_no')} />
                  <span className="text-[11px] text-slate-500">
                    {tBilingual('NBR 9 or 13-digit registration', 'এনবিআর ৯ বা ১৩ ডিজিট নিবন্ধন')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tin_no">
                    {tBilingual('TIN (Tax Identification Number)', 'ই-টিন নং (TIN)')}
                  </Label>
                  <Input id="tin_no" placeholder="e.g. 8492049182" {...register('tin_no')} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {tBilingual('Automated VAT Calculation', 'স্বয়ংক্রিয় ভ্যাট গণনা')}
                    </div>
                    <p className="text-xs text-slate-500">
                      {tBilingual(
                        'Automatically calculate VAT on printing jobs and customer billings.',
                        'প্রিন্ট জব ও কাস্টমার বিলে স্বয়ংক্রিয়ভাবে ভ্যাট যুক্ত করুন।'
                      )}
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
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-full sm:w-48 space-y-1">
                      <Label htmlFor="vat_rate">
                        {tBilingual('Default VAT Rate (%)', 'ডিফল্ট ভ্যাট হার (%)')}
                      </Label>
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
                    <p className="text-xs text-slate-500 sm:mt-5">
                      {tBilingual(
                        'Standard VAT in Bangladesh: 7.5% for printing services, 15% standard rate.',
                        'বাংলাদেশে প্রিন্টিং সার্ভিসের জন্য স্ট্যান্ডার্ড ভ্যাট ৭.৫%, সাধারণ হার ১৫%।'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: DOCUMENT PREFIXES */}
        {activeTab === 'prefixes' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-blue-600" />
                {tBilingual('Document Numbering & Sequences', 'ডকুমেন্ট নাম্বারিং ও সিকোয়েন্স')}
              </CardTitle>
              <CardDescription>
                {tBilingual(
                  'Customize the serial prefixes generated on quotations, tax invoices, and delivery challans.',
                  'কোটেশন, ইনভয়েস এবং ডেলিভারি চালানের সিরিয়াল প্রিফিক্স নির্ধারণ করুন।'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quotation_prefix" required>
                    {tBilingual('Quotation Prefix', 'কোটেশন প্রিফিক্স')}
                  </Label>
                  <Input id="quotation_prefix" placeholder="QT" {...register('quotation_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: QT-2026-0012</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoice_prefix" required>
                    {tBilingual('Invoice Prefix', 'ইনভয়েস প্রিফিক্স')}
                  </Label>
                  <Input id="invoice_prefix" placeholder="INV" {...register('invoice_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: INV-2026-0482</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="challan_prefix" required>
                    {tBilingual('Challan Prefix', 'চালান প্রিফিক্স')}
                  </Label>
                  <Input id="challan_prefix" placeholder="CH" {...register('challan_prefix')} />
                  <span className="text-[11px] text-slate-500">Example: CH-2026-0091</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: REGIONAL & LOCALIZATION */}
        {activeTab === 'regional' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-purple-600" />
                {tBilingual('Regional & Language Preferences', 'আঞ্চলিক ও ভাষা পছন্দসমূহ')}
              </CardTitle>
              <CardDescription>
                {tBilingual(
                  'Default currency and presentation language for vouchers and system interface.',
                  'ভাউচার এবং ইন্টারফেসের ডিফল্ট মুদ্রা ও প্রদর্শনী ভাষা।'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="default_currency">
                    {tBilingual('Default Currency', 'ডিফল্ট কারেন্সি')}
                  </Label>
                  <Input id="default_currency" value="BDT (৳)" readOnly className="bg-slate-50 dark:bg-slate-900" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="default_language">
                    {tBilingual('Default Interface Language', 'ইন্টারফেসের ডিফল্ট ভাষা')}
                  </Label>
                  <select
                    id="default_language"
                    className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
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
          <Button
            type="submit"
            isLoading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold shadow-sm"
          >
            <Save className="mr-1.5 h-4 w-4" />
            {tBilingual('Save Settings', 'সেটিংস সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </div>
  )
}

