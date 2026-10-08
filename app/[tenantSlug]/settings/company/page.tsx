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
import { usePathname, useParams } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { PageHeader } from '@/components/shared/page-header'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
  'Friday',
  'Friday & Saturday (দ্বি-সাপ্তাহিক ছুটি)',
  'Friday & Govt Holidays',
  'Sunday',
]

function cleanField(val?: string | null): string {
 if (!val) return ''
 return val.trim()
}

function cleanCorporateNameBn(nameBn?: string | null, name?: string): string {
 const val = cleanField(nameBn)
 if (!val) return ''
 if (name && val.toLowerCase() === name.trim().toLowerCase()) return ''
 return val
}

function cleanLegalName(legalName?: string | null, name?: string): string {
 const val = cleanField(legalName)
 if (!val) return ''
 if (name) {
 const valLower = val.toLowerCase()
 const nameLower = name.trim().toLowerCase()
 if (valLower === nameLower || valLower === `${nameLower} ltd.` || valLower === `${nameLower} ltd`) {
 return ''
    }
  }
 return val
}

function cleanAddress(address?: string | null): string {
 const val = cleanField(address)
 if (!val || val.toLowerCase() === 'dhaka, bangladesh') return ''
 return val
}

export default function CompanyProfileSettingsPage() {
 const params = useParams()
 const routeSlug = (params?.tenantSlug as string) || ''
 const { company, settings, refreshTenant } = useTenant()
 const { accountTypeMeta, isTrial, daysRemainingInTrial } = useSubscription()
 const { locale, tBilingual } = useI18n()
 const pathname = usePathname()
 const [mounted, setMounted] = useState(false)
 const [isSaved, setIsSaved] = useState(false)
 const [isLoading, setIsLoading] = useState(false)

 const slug = routeSlug || company?.slug || ''

 useEffect(() => {
 setMounted(true)
  }, [])

 const effectiveName = company?.name || ''
 const initialNameBn = cleanCorporateNameBn(company?.name_bn, effectiveName)
 const initialLegalName = cleanLegalName(company?.legal_name || (settings as any)?.legal_name, effectiveName)
 const initialAddress = cleanAddress(company?.address)
 const initialAddressBn = cleanField(company?.address_bn)
 const initialArea = cleanField(company?.area)

 const [profile, setProfile] = useDataStore(STORAGE_KEYS.COMPANY_PROFILE, {
 name: effectiveName,
 name_bn: initialNameBn,
 legal_name: initialLegalName,
 logo_url: company?.logo_url || settings?.logo_url || '',
 phone: company?.phone || settings?.phone || '',
 whatsapp: company?.whatsapp || settings?.whatsapp || '',
 email: company?.email || settings?.email || '',
 website: company?.website || (settings as any)?.website || (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd'),
 area: initialArea,
 address: initialAddress,
 address_bn: initialAddressBn,
 trade_license_no: company?.trade_license_no || '',
 bin_no: company?.bin_no || '',
 office_hours: company?.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
 holidays: company?.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
  }, slug)

  // Form State initialized from tenant data
 const [formData, setFormData] = useState({
 name: effectiveName || profile?.name || '',
 name_bn: initialNameBn || cleanCorporateNameBn(profile?.name_bn, effectiveName),
 legal_name: initialLegalName || cleanLegalName(profile?.legal_name, effectiveName),
 logo_url: company?.logo_url || settings?.logo_url || profile?.logo_url || '',
 phone: company?.phone || settings?.phone || profile?.phone || '',
 whatsapp: company?.whatsapp || settings?.whatsapp || profile?.whatsapp || '',
 email: company?.email || settings?.email || profile?.email || '',
 website: company?.website || (settings as any)?.website || profile?.website || (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd'),
 area: initialArea || cleanField(profile?.area),
 address: initialAddress || cleanAddress(profile?.address),
 address_bn: initialAddressBn || cleanField(profile?.address_bn),
 trade_license_no: company?.trade_license_no || profile?.trade_license_no || '',
 bin_no: company?.bin_no || profile?.bin_no || '',
 office_hours: company?.office_hours || (settings as any)?.office_hours || profile?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
 holidays: company?.holidays || (settings as any)?.holidays || profile?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
  })

 useEffect(() => {
 if (company) {
 const coName = company.name || ''
 const coNameBn = cleanCorporateNameBn(company.name_bn, coName)
 const coLegalName = cleanLegalName(company.legal_name || (settings as any)?.legal_name, coName)
 const coAddress = cleanAddress(company.address)
 const coAddressBn = cleanField(company.address_bn)
 const coArea = cleanField(company.area)

 setFormData({
 name: coName,
 name_bn: coNameBn,
 legal_name: coLegalName,
 logo_url: company.logo_url || settings?.logo_url || '',
 phone: company.phone || settings?.phone || '',
 whatsapp: company.whatsapp || settings?.whatsapp || '',
 email: company.email || settings?.email || '',
        website: company.website || (settings as any)?.website || (company.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd'),
 area: coArea,
 address: coAddress,
 address_bn: coAddressBn,
 trade_license_no: company.trade_license_no || '',
 bin_no: company.bin_no || '',
 office_hours: company.office_hours || (settings as any)?.office_hours || '9:00 AM - 8:00 PM (Sat - Thu)',
 holidays: company.holidays || (settings as any)?.holidays || 'Friday (সাপ্তাহিক ছুটি)',
      })

      // Sanitize stored profile if it held stale auto-generated values
 if (
 profile &&
        (cleanLegalName(profile.legal_name, coName) !== coLegalName ||
 cleanAddress(profile.address) !== coAddress ||
 cleanCorporateNameBn(profile.name_bn, coName) !== coNameBn)
      ) {
 setProfile((prev: any) => ({
          ...prev,
 name: coName,
 name_bn: coNameBn,
 legal_name: coLegalName,
 address: coAddress,
 address_bn: coAddressBn,
 area: coArea,
        }))
      }
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
        website: formData.website || null,
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

 if (!mounted) {
 return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-48 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <div className="space-y-6">
      <PageHeader
 titleEn="Company Profile & Information"titleBn="প্রতিষ্ঠান পরিচিতি ও তথ্য"descriptionEn="Manage corporate identity, physical printing hub address, operational hours, tax registrations, and official communication channels."descriptionBn="করপোরেট পরিচিতি, প্রিন্টিং হাবের ঠিকানা, অফিস সময়সূচি, ট্যাক্স নিবন্ধন এবং অফিশিয়াল যোগাযোগের মাধ্যম পরিচালনা করুন।"icon={Building2}
 iconColor="text-primary"/>

      {/* Account Type & Subscription Tier Card */}
      <Card className="p-4 bg-card text-card-foreground border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning-surface text-warning bg-warning-surface text-warning border border-warning-border border-warning-border flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{tBilingual('Account Type:', 'অ্যাকাউন্টের ধরন:')}</span>
                <span
 className={cn(
                    'text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border',
 accountTypeMeta.badgeClass
                  )}
                >
                  {isTrial ? (locale === 'bn' ? `ট্রায়াল (${toBengaliDigits(daysRemainingInTrial)} দিন বাকি)` : `Trial (${daysRemainingInTrial} Days Left)`) : (locale === 'bn' ? accountTypeMeta.badgeTextBn : accountTypeMeta.badgeTextEn)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === 'bn' ? `${accountTypeMeta.nameBn} • ${toBengaliDigits(accountTypeMeta.maxUsers)} জন ব্যবহারকারী • ${toBengaliDigits(accountTypeMeta.maxBranches)}টি শাখা` : `${accountTypeMeta.nameEn} • ${accountTypeMeta.maxUsers} Users • ${accountTypeMeta.maxBranches} Branch(es)`}
              </p>
            </div>
          </div>

          <Link href={getTenantNavHref('/settings/subscription', pathname, slug)}>
            <Button size="sm"variant="default"className="text-xs shrink-0 gap-1.5">
              <span>{isTrial ? tBilingual('Upgrade Account', 'প্ল্যান আপগ্রেড করুন') : tBilingual('Manage Subscription', 'সাবস্ক্রিপশন ব্যবস্থাপনা')}</span>
              <ArrowRight className="h-3.5 w-3.5"/>
            </Button>
          </Link>
        </div>
      </Card>

      {isSaved && (
        <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{tBilingual('Company profile information updated and saved successfully!', 'কোম্পানি প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে!')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Corporate Names & Logo */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary"/>
              {tBilingual('Corporate Names & Branding', 'প্রাতিষ্ঠানিক নাম ও ব্র্যান্ডিং')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name"required>
 Display Name (English)
                </Label>
                <Input
 id="name"name="name"value={formData.name}
 onChange={handleChange}
 required
 placeholder={tBilingual("e.g. Rapid Print & Media", "যেমন: র‍্যাপিড প্রিন্ট অ্যান্ড মিডিয়া")}/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name_bn">
                  {tBilingual('Display Name (Bengali)', 'প্রদর্শন নাম (বাংলা)')}
                </Label>
                <Input
 id="name_bn"name="name_bn"value={formData.name_bn}
 onChange={handleChange}
 placeholder={tBilingual('e.g. Rapid Print & Media', 'যেমন: র‍্যাপিড প্রিন্ট অ্যান্ড মিডিয়া')}/>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="legal_name">
                {tBilingual('Registered Legal Entity Name (for NBR & Contracts)', 'নিবন্ধিত আইনি প্রতিষ্ঠানের নাম (এনবিআর ও চুক্তির জন্য)')}
              </Label>
              <Input
 id="legal_name"name="legal_name"value={formData.legal_name}
 onChange={handleChange}
 placeholder={tBilingual("e.g. Rapid Print Solutions Limited", "যেমন: র‍্যাপিড প্রিন্ট সল্যুশনস লিমিটেড")}/>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Official entity name utilized for NBR tax Mushak vouchers and legal vendor contracts.', 'এনবিআর মূসক চালান এবং আইনি ভেন্ডর চুক্তির জন্য ব্যবহৃত অফিশিয়াল প্রতিষ্ঠানের নাম।')}
              </p>
            </div>

            {/* Logo */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label htmlFor="logo_url">{tBilingual('Company Logo URL', 'কোম্পানির লোগো ইউআরএল')}</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="h-16 w-24 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
 src={formData.logo_url}
 alt="Company Logo Preview"className="h-full w-full object-contain p-1"onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground"/>
                      <span className="text-xs text-muted-foreground block mt-0.5">{tBilingual('No Logo', 'লোগো নেই')}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full space-y-1">
                  <Input
 id="logo_url"name="logo_url"value={formData.logo_url}
 onChange={handleChange}
 placeholder="https://example.com/logo.png"/>
                  <span className="text-xs text-muted-foreground block">
                    {tBilingual('Printed at the top of client quotations, work challans, and money receipts.', 'গ্রাহক কোটেশন, কাজের চালান ও মানি রিসিটের শীর্ষে মুদ্রিত হবে।')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Contact & Digital Channels */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-success"/>
              {tBilingual('Contact & Digital Channels', 'যোগাযোগ ও ডিজিটাল চ্যানেল')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone"required>
 {tBilingual('Office Phone Number', 'অফিস ফোন নম্বর')}
                </Label>
                <Input
 id="phone"name="phone"value={formData.phone}
 onChange={handleChange}
 required
 placeholder="+880 1711-000000"/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">
 {tBilingual('Business WhatsApp Number', 'বিজনেস হোয়াটসঅ্যাপ নম্বর')}
                </Label>
                <Input
 id="whatsapp"name="whatsapp"value={formData.whatsapp}
 onChange={handleChange}
 placeholder="+880 1811-000000"/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email"required>
 {tBilingual('Official Billing Email', 'অফিসিয়াল বিলিং ইমেইল')}
                </Label>
                <Input
 id="email"name="email"type="email"value={formData.email}
 onChange={handleChange}
 required
 placeholder={tBilingual("billing@company.com", "billing@company.com")}/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">
                  {tBilingual('Official Website', 'অফিসিয়াল ওয়েবসাইট')}
                </Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="www.company.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Address & Print Hub */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-destructive"/>
              {tBilingual('Print Hub & Commercial Address', 'প্রিন্ট হাব ও বাণিজ্যিক ঠিকানা')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="area">
 {tBilingual('Printing Hub / Commercial Area', 'মার্কেট বা বাণিজ্যিক এলাকা')}
              </Label>
              <Input
 id="area"name="area"value={formData.area}
 onChange={handleChange}
 placeholder={tBilingual("e.g. Fakirapool, Arambagh, Nilkhet", "যেমন: ফকিরাপুল, আরামবাগ, নীলক্ষেত")}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="address">
 {tBilingual('Full Street Address (English)', 'পূর্ণ ঠিকানা (ইংরেজি)')}
                </Label>
                <Input
 id="address"name="address"value={formData.address}
 onChange={handleChange}
 placeholder={tBilingual("Street address in English", "ইংরেজিতে রাস্তার ঠিকানা")}/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address_bn">
                  {tBilingual('Full Street Address (Bengali Script)', 'পূর্ণ ঠিকানা (বাংলায়)')}
                </Label>
                <Input
 id="address_bn"name="address_bn"value={formData.address_bn}
 onChange={handleChange}
 placeholder={tBilingual('Detailed street address in Bengali', 'বিস্তারিত ঠিকানা বাংলায়')}/>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tax & Legal Registrations */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary"/>
              {tBilingual('Tax & Business Registrations', 'ট্যাক্স ও ব্যবসায়িক নিবন্ধন')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trade_license_no">
 {tBilingual('Trade License Number', 'ট্রেড লাইসেন্স নম্বর')}
                </Label>
                <Input
 id="trade_license_no"name="trade_license_no"value={formData.trade_license_no}
 onChange={handleChange}
 placeholder={tBilingual("TRAD/DNCC/...", "ট্রেড/ডিএনসিসি/...")}/>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bin_no">
 {tBilingual('BIN Number (Business Identification Number)', 'ভ্যাট নিবন্ধন নম্বর (বিআইএন)')}
                </Label>
                <Input
 id="bin_no"name="bin_no"value={formData.bin_no}
 onChange={handleChange}
 placeholder="e.g. 004819284-0101"/>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Office Hours & Holiday Schedule */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary"/>
              {tBilingual('Office Hours & Holiday Schedule', 'অফিস সময়সূচি ও ছুটির তালিকা')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="office_hours">
 {tBilingual('Office Hours / Business Hours', 'অফিস সময়সূচি')}
              </Label>
              <Input
 id="office_hours"name="office_hours"value={formData.office_hours}
 onChange={handleChange}
 placeholder={tBilingual("e.g. 9:00 AM - 8:00 PM (Sat - Thu)", "যেমন: সকাল ৯:০০ - রাত ৮:০০ (শনিবার - বৃহস্পতিবার)")}/>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{tBilingual('Presets:', 'প্রিসেট:')}</span>
                {OFFICE_HOURS_PRESETS.map((preset) => (
                  <button
 key={preset}
 type="button"onClick={() => setFormData({ ...formData, office_hours: preset })}
 className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-card-elevated transition-colors border border-border">
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-border">
              <Label htmlFor="holidays">
 {tBilingual('Weekly Holiday & Closed Days', 'সাপ্তাহিক ছুটি ও বন্ধের দিন')}
              </Label>
              <Input
 id="holidays"name="holidays"value={formData.holidays}
 onChange={handleChange}
 placeholder={tBilingual("e.g. Friday (Weekly Holiday)", "যেমন: শুক্রবার (সাপ্তাহিক ছুটি)")}/>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{tBilingual('Presets:', 'প্রিসেট:')}</span>
                {HOLIDAY_PRESETS.map((preset) => (
                  <button
 key={preset}
 type="button"onClick={() => setFormData({ ...formData, holidays: preset })}
 className="text-xs px-2.5 py-1 rounded-md bg-muted text-foreground hover:bg-primary/10 hover:text-primary dark:hover:bg-card-elevated transition-colors border border-border">
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
 type="submit"isLoading={isLoading}
 className="bg-primary hover:bg-primary w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4"/>
            {tBilingual('Save Profile Settings', 'প্রোফাইল সেটিংস সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </div>
  )
}
