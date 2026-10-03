'use client'

import React, { useState, useEffect } from 'react'
import {
 Palette,
 Save,
 CheckCircle2,
 Upload,
 Image as ImageIcon,
 FileSpreadsheet,
 Receipt,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'

import { useParams } from 'next/navigation'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

const COLOR_PRESETS = [
  { nameEn: 'Royal Blue', nameBn: 'রয়্যাল ব্লু', hex: '#2563eb' },
  { nameEn: 'Crimson Red', nameBn: 'ক্রিমসন রেড', hex: '#dc2626' },
  { nameEn: 'Emerald Green', nameBn: 'এমেরাল্ড গ্রিন', hex: '#059669' },
  { nameEn: 'Vibrant Purple', nameBn: 'ভাইব্রেন্ট পার্পল', hex: '#7c3aed' },
  { nameEn: 'Dark Indigo', nameBn: 'ডার্ক ইন্ডিগো', hex: '#4338ca' },
  { nameEn: 'Amber Orange', nameBn: 'অ্যাম্বার অরেঞ্জ', hex: '#d97706' },
]

export default function BrandingSettingsPage() {
 const params = useParams()
 const routeSlug = (params?.tenantSlug as string) || ''
 const { company, settings, refreshTenant } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = routeSlug || company?.slug || ''
 const [mounted, setMounted] = useState(false)
 const [isSaved, setIsSaved] = useState(false)
 const [isLoading, setIsLoading] = useState(false)

 useEffect(() => {
 setMounted(true)
  }, [])

 const [branding, setBranding] = useDataStore(STORAGE_KEYS.BRANDING_SETTINGS, {
 company_name: company?.name || '',
 primary_color: '#2563eb',
 logo_url: company?.logo_url || settings?.logo_url || '',
 invoice_logo_url: company?.logo_url || settings?.logo_url || '',
 quotation_logo_url: company?.logo_url || settings?.logo_url || '',
 footer_text: 'Thank you for choosing our print services.',
 footer_text_bn: 'আমাদের প্রিন্টিং সেবায় আস্থা রাখার জন্য ধন্যবাদ।',
  }, slug)

  // Sync logo if available on company
 React.useEffect(() => {
 if (company?.logo_url || settings?.logo_url) {
 const activeLogo = company?.logo_url || settings?.logo_url || ''
 setBranding((prev) => ({
        ...prev,
 logo_url: prev.logo_url || activeLogo,
 invoice_logo_url: prev.invoice_logo_url || activeLogo,
 quotation_logo_url: prev.quotation_logo_url || activeLogo,
      }))
    }
  }, [company, settings])

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setIsLoading(true)
 setIsSaved(false)
 try {
 if (company?.id) {
 await updateCompanyAction(company.id, {
 logo_url: branding.logo_url || null,
 settings: {
            ...((company.settings as any) || {}),
 branding,
          },
        })
 await updateCompanySettingsAction(company.id, {
 logo_url: branding.logo_url || null,
        })
 await refreshTenant()
      }
 setBranding(branding)
 setIsSaved(true)
 setTimeout(() => setIsSaved(false), 3500)
    } finally {
 setIsLoading(false)
    }
  }

 if (!mounted) {
 return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-20 bg-muted rounded-xl w-full"/>
        <div className="h-12 bg-muted rounded-xl w-3/4"/>
        <div className="h-48 bg-muted rounded-xl w-full"/>
      </div>
    )
  }

 return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
 titleEn="Branding & Theme Settings"titleBn="ব্র্যান্ডিং ও থিম সেটিংস"descriptionEn="Customize company logos, primary theme palette, and document footer terms for professional output."descriptionBn="লোগো, প্রাতিষ্ঠানিক থিম কালার এবং ইনভয়েস/চালানের শর্তাবলী পরিচালনা করুন।"icon={Palette}
 iconColor="text-purple-600"/>

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
          <span>{tBilingual('Branding settings updated and recorded in audit log.', 'ব্র্যান্ডিং সেটিংস আপডেট ও অডিট লগে সংরক্ষণ করা হয়েছে।')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Color & Visual Theme */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">{tBilingual('Primary Brand Accent Color', 'প্রধান ব্র্যান্ড কালার')}</CardTitle>
            <CardDescription className="text-xs">
              {tBilingual('This color will highlight your invoices, challans, and customer web previews.', 'এই রঙটি আপনার ইনভয়েস, চালান এবং গ্রাহক ওয়েব প্রিভিউতে প্রদর্শিত হবে।')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
 key={c.hex}
 type="button"onClick={() => setBranding({ ...branding, primary_color: c.hex })}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
 branding.primary_color === c.hex
                      ? 'border-border ring-2 ring-slate-900/20 dark:border-white shadow-xs'
                      : 'border-border hover:border-input '
                  }`}
                >
                  <span className="h-4 w-4 rounded-full shrink-0"style={{ backgroundColor: c.hex }} />
                  <span>{locale === 'bn' ? c.nameBn : c.nameEn}</span>
                </button>
              ))}

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto pt-2 sm:pt-0">
                <Label htmlFor="customColor"className="text-xs shrink-0">Custom HEX:</Label>
                <Input
 id="customColor"value={branding.primary_color}
 onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
 className="w-28 h-8 text-xs tabular-nums"/>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logos Management */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600"/>
                {tBilingual('Main Company Logo', 'মূল কোম্পানির লোগো')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-input bg-muted flex items-center justify-center p-3">
                {branding.logo_url ? (
                  <img
 src={branding.logo_url}
 alt="Logo"className="max-h-full max-w-full object-contain"/>
                ) : (
                  <span className="text-xs text-muted-foreground">{tBilingual('No logo uploaded', 'কোনো লোগো আপলোড করা হয়নি')}</span>
                )}
              </div>
              <Input
 placeholder={tBilingual('Logo image URL', 'লোগো ইমেজের লিংক')}value={branding.logo_url || ''}
 onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
 className="text-xs h-9"/>
            </CardContent>
          </Card>

          {/* Invoice Header Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600"/>
                {tBilingual('Invoice Header Logo', 'ইনভয়েস হেডার লোগো')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-input bg-muted flex items-center justify-center p-3">
                {branding.invoice_logo_url ? (
                  <img
 src={branding.invoice_logo_url}
 alt="Invoice Logo"className="max-h-full max-w-full object-contain"/>
                ) : (
                  <span className="text-xs text-muted-foreground">{tBilingual('Default company logo', 'ডিফল্ট কোম্পানির লোগো')}</span>
                )}
              </div>
              <Input
 placeholder={tBilingual('Invoice Logo URL', 'ইনভয়েস লোগোর লিংক')}value={branding.invoice_logo_url || ''}
 onChange={(e) => setBranding({ ...branding, invoice_logo_url: e.target.value })}
 className="text-xs h-9"/>
            </CardContent>
          </Card>

          {/* Quotation Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600"/>
                {tBilingual('Quotation Header Logo', 'কোটেশন হেডার লোগো')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-input bg-muted flex items-center justify-center p-3">
                {branding.quotation_logo_url ? (
                  <img
 src={branding.quotation_logo_url}
 alt="Quotation Logo"className="max-h-full max-w-full object-contain"/>
                ) : (
                  <span className="text-xs text-muted-foreground">{tBilingual('Default company logo', 'ডিফল্ট কোম্পানির লোগো')}</span>
                )}
              </div>
              <Input
 placeholder={tBilingual('Quotation Logo URL', 'কোটেশন লোগোর লিংক')}value={branding.quotation_logo_url || ''}
 onChange={(e) => setBranding({ ...branding, quotation_logo_url: e.target.value })}
 className="text-xs h-9"/>
            </CardContent>
          </Card>
        </div>

        {/* Document Footer Terms & Conditions */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">{tBilingual('Document Footer Notes & Terms', 'বিল ও চালানের শর্তাবলী')}</CardTitle>
            <CardDescription className="text-xs">
              {tBilingual('Printed automatically at the bottom of all Commercial Invoices, Quotations, and Delivery Challans.', 'সকল বাণিজ্যিক ইনভয়েস, কোটেশন ও ডেলিভারি চালানের নিচে স্বয়ংক্রিয়ভাবে মুদ্রিত হবে।')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="footer_text">
                {tBilingual('English Footer Note / Terms', 'ইংরেজি বিল শর্তাবলী')}
              </Label>
              <Input
 id="footer_text"value={branding.footer_text}
 onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
 className="h-9 text-xs"/>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footer_text_bn">
                {tBilingual('Bengali Footer Note / Terms', 'বাংলা বিল শর্তাবলী')}
              </Label>
              <Input
 id="footer_text_bn"value={branding.footer_text_bn}
 onChange={(e) => setBranding({ ...branding, footer_text_bn: e.target.value })}
 className="h-9 text-xs"/>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit"isLoading={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4"/>
            {tBilingual('Save Branding Configuration', 'ব্র্যান্ডিং কনফিগারেশন সংরক্ষণ করুন')}
          </Button>
        </div>
      </form>
    </div>
  )
}
