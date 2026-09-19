'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  Save,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Crown,
  ArrowRight,
  Sparkles,
  Clock,
  Calendar,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'

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

export default function CompanyProfileSettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { accountTypeMeta, isTrial, daysRemainingInTrial } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const slug = company?.slug || ''
  const [profile, setProfile] = useDataStore(STORAGE_KEYS.COMPANY_PROFILE, {
    name: company?.name || '',
    name_bn: company?.name_bn || '',
    legal_name: company?.legal_name || (settings as any)?.legal_name || '',
    logo_url: company?.logo_url || settings?.logo_url || '',
    phone: company?.phone || settings?.phone || '',
    whatsapp: company?.whatsapp || settings?.whatsapp || '',
    email: company?.email || settings?.email || '',
    area: company?.area || '',
    address: company?.address || '',
    address_bn: company?.address_bn || '',
    trade_license_no: company?.trade_license_no || '',
    bin_no: company?.bin_no || '',
    office_hours: company?.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
    holidays: company?.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
  })

  // Form State initialized from tenant data
  const [formData, setFormData] = useState({
    name: company?.name || profile?.name || '',
    name_bn: company?.name_bn || profile?.name_bn || '',
    legal_name: company?.legal_name || (settings as any)?.legal_name || profile?.legal_name || '',
    logo_url: company?.logo_url || settings?.logo_url || profile?.logo_url || '',
    phone: company?.phone || settings?.phone || profile?.phone || '',
    whatsapp: company?.whatsapp || settings?.whatsapp || profile?.whatsapp || '',
    email: company?.email || settings?.email || profile?.email || '',
    area: company?.area || profile?.area || '',
    address: company?.address || profile?.address || '',
    address_bn: company?.address_bn || profile?.address_bn || '',
    trade_license_no: company?.trade_license_no || profile?.trade_license_no || '',
    bin_no: company?.bin_no || profile?.bin_no || '',
    office_hours: company?.office_hours || (settings as any)?.office_hours || profile?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
    holidays: company?.holidays || (settings as any)?.holidays || profile?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
  })

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        name_bn: company.name_bn || '',
        legal_name: company.legal_name || (settings as any)?.legal_name || '',
        logo_url: company.logo_url || settings?.logo_url || '',
        phone: company.phone || settings?.phone || '',
        whatsapp: company.whatsapp || settings?.whatsapp || '',
        email: company.email || settings?.email || '',
        area: company.area || '',
        address: company.address || '',
        address_bn: company.address_bn || '',
        trade_license_no: company.trade_license_no || '',
        bin_no: company.bin_no || '',
        office_hours: company.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
        holidays: company.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
      })
    }
  }, [company, settings])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setIsSaved(false)

    try {
      if (company?.id) {
        await updateCompanyAction(company.id, {
          name: formData.name,
          name_bn: formData.name_bn || null,
          legal_name: formData.legal_name || null,
          logo_url: formData.logo_url || null,
          phone: formData.phone,
          whatsapp: formData.whatsapp || null,
          email: formData.email,
          address: formData.address,
          address_bn: formData.address_bn || null,
          area: formData.area || null,
          trade_license_no: formData.trade_license_no || null,
          bin_no: formData.bin_no || null,
          office_hours: formData.office_hours || null,
          holidays: formData.holidays || null,
        })

        await updateCompanySettingsAction(company.id, {
          phone: formData.phone,
          whatsapp: formData.whatsapp || null,
          email: formData.email,
          logo_url: formData.logo_url || null,
          office_hours: formData.office_hours || null,
          holidays: formData.holidays || null,
        })

        await refreshTenant()
      }

      setProfile(formData)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Company Profile & Information"
        titleBn="প্রতিষ্ঠান পরিচিতি ও তথ্য"
        descriptionEn="Manage corporate identity, physical printing hub address, operational hours, tax registrations, and official communication channels."
        descriptionBn="করপোরেট পরিচিতি, প্রিন্টিং হাবের ঠিকানা, অফিস সময়সূচি, ট্যাক্স নিবন্ধন এবং অফিশিয়াল যোগাযোগের মাধ্যম পরিচালনা করুন।"
        icon={Building2}
        iconColor="text-blue-600"
      />

      <SettingsNav />

      {/* Account Type & Subscription Tier Card */}
      <Card className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Account Type:</span>
                <span
                  className={cn(
                    'text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border',
                    accountTypeMeta.badgeClass
                  )}
                >
                  {isTrial ? `Trial (${daysRemainingInTrial} Days Left)` : accountTypeMeta.badgeTextEn}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {accountTypeMeta.nameEn} • {accountTypeMeta.maxUsers} Users • {accountTypeMeta.maxBranches} Branch(es)
              </p>
            </div>
          </div>

          <Link href="/settings/subscription">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0">
              <span>{isTrial ? 'Upgrade Account' : 'Manage Subscription'}</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </Card>

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{tBilingual('Company profile information updated and saved successfully!', 'কোম্পানি প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে!')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Corporate Names & Logo */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Corporate Names & Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" required>
                  Display Name (English)
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Rapid Print & Media"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name_bn">
                  Display Name (বাংলা)
                </Label>
                <Input
                  id="name_bn"
                  name="name_bn"
                  value={formData.name_bn}
                  onChange={handleChange}
                  placeholder="উদা: র‍্যাপিড প্রিন্ট অ্যান্ড মিডিয়া"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legal_name">
                Registered Legal Entity Name (for NBR & Contracts)
              </Label>
              <Input
                id="legal_name"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="e.g. Rapid Print Solutions Limited"
              />
              <p className="text-[11px] text-slate-500">
                Official entity name utilized for NBR tax Mushak vouchers and legal vendor contracts.
              </p>
            </div>

            {/* Logo */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label htmlFor="logo_url">Company Logo URL (কোম্পানির লোগো)</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="h-16 w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={formData.logo_url}
                      alt="Company Logo Preview"
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="h-5 w-5 mx-auto text-slate-400" />
                      <span className="text-[9px] text-slate-400 block mt-0.5">No Logo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full space-y-1">
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    Printed at the top of client quotations, work challans, and money receipts.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contact & Digital Channels */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              Contact & Digital Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" required>
                  Office Phone Number (অফিস ফোন)
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+880 1711-000000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">
                  Business WhatsApp Number (হোয়াটসঅ্যাপ)
                </Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="+880 1811-000000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Official Billing Email (অফিসিয়াল ইমেইল)
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="billing@company.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Address & Print Hub */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              Print Hub & Commercial Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="area">
                Printing Hub / Commercial Area (মার্কেট বা বাণিজ্যিক এলাকা)
              </Label>
              <Input
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="e.g. Fakirapool, Arambagh, Nilkhet"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">
                  Full Street Address (English)
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address in English"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address_bn">
                  সম্পূর্ণ ঠিকানা (বাংলা)
                </Label>
                <Input
                  id="address_bn"
                  name="address_bn"
                  value={formData.address_bn}
                  onChange={handleChange}
                  placeholder="বিস্তারিত ঠিকানা বাংলায়"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tax & Legal Registrations */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Tax & Business Registrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trade_license_no">
                  Trade License Number (ট্রেড লাইসেন্স নং)
                </Label>
                <Input
                  id="trade_license_no"
                  name="trade_license_no"
                  value={formData.trade_license_no}
                  onChange={handleChange}
                  placeholder="TRAD/DNCC/..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bin_no">
                  BIN Number (Business Identification Number / ভ্যাট নিবন্ধন নং)
                </Label>
                <Input
                  id="bin_no"
                  name="bin_no"
                  value={formData.bin_no}
                  onChange={handleChange}
                  placeholder="e.g. 004819284-0101"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Office Hours & Holiday Schedule */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Office Hours & Holiday Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="office_hours">
                Office Hours / Business Hours (অফিস সময়সূচী)
              </Label>
              <Input
                id="office_hours"
                name="office_hours"
                value={formData.office_hours}
                onChange={handleChange}
                placeholder="e.g. 9:00 AM - 8:00 PM (Sat - Thu)"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500">Presets:</span>
                {OFFICE_HOURS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, office_hours: preset })}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Label htmlFor="holidays">
                Weekly Holiday & Closed Days (সাপ্তাহিক ছুটি ও বন্ধের দিন)
              </Label>
              <Input
                id="holidays"
                name="holidays"
                value={formData.holidays}
                onChange={handleChange}
                placeholder="e.g. Friday (সাপ্তাহিক ছুটি)"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500">Presets:</span>
                {HOLIDAY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, holidays: preset })}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            isLoading={isLoading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold"
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save Profile Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
