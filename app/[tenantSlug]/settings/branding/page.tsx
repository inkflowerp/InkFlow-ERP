'use client'

import React, { useState } from 'react'
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
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

const COLOR_PRESETS = [
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Vibrant Purple', hex: '#7c3aed' },
  { name: 'Dark Indigo', hex: '#4338ca' },
  { name: 'Amber Orange', hex: '#d97706' },
]

export default function BrandingSettingsPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)

  const [branding, setBranding] = useDataStore(STORAGE_KEYS.BRANDING_SETTINGS, {
    company_name: company?.name || '',
    primary_color: '#2563eb',
    logo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150',
    invoice_logo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150',
    quotation_logo_url: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=150',
    footer_text: 'Thank you for choosing our print services. Delivery within 24-48 hours from proof sign-off.',
    footer_text_bn: 'আমাদের প্রিন্টিং সেবায় আস্থা রাখার জন্য ধন্যবাদ। প্রুফ অনুমোদনের ২৪-৪৮ ঘণ্টার মধ্যে ডেলিভারি সম্পন্ন হয়।',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setBranding(branding)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Branding & Theme Settings"
        titleBn="ব্র্যান্ডিং ও থিম সেটিংস"
        descriptionEn="Customize company logos, primary theme palette, and document footer terms for professional output."
        descriptionBn="লোগো, প্রাতিষ্ঠানিক থিম কালার এবং ইনভয়েস/চালানের শর্তাবলী পরিচালনা করুন।"
        icon={Palette}
        iconColor="text-purple-600"
      />

      <SettingsNav />

      {isSaved && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Branding settings updated and recorded in audit log.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Color & Visual Theme */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Primary Brand Accent Color</CardTitle>
            <CardDescription className="text-xs">
              This color will highlight your invoices, challans, and customer web previews.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBranding({ ...branding, primary_color: c.hex })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    branding.primary_color === c.hex
                      ? 'border-slate-900 ring-2 ring-slate-900/20 dark:border-white shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto pt-2 sm:pt-0">
                <Label htmlFor="customColor" className="text-xs shrink-0">Custom HEX:</Label>
                <Input
                  id="customColor"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="w-28 h-8 text-xs font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logos Management */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Main Company Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3">
                {branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No logo uploaded</span>
                )}
              </div>
              <Input
                placeholder="Logo image URL"
                value={branding.logo_url || ''}
                onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                className="text-xs h-9"
              />
            </CardContent>
          </Card>

          {/* Invoice Header Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Invoice Header Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3">
                {branding.invoice_logo_url ? (
                  <img
                    src={branding.invoice_logo_url}
                    alt="Invoice Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">Default company logo</span>
                )}
              </div>
              <Input
                placeholder="Invoice Logo URL"
                value={branding.invoice_logo_url || ''}
                onChange={(e) => setBranding({ ...branding, invoice_logo_url: e.target.value })}
                className="text-xs h-9"
              />
            </CardContent>
          </Card>

          {/* Quotation Logo */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                Quotation Header Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-3">
                {branding.quotation_logo_url ? (
                  <img
                    src={branding.quotation_logo_url}
                    alt="Quotation Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">Default company logo</span>
                )}
              </div>
              <Input
                placeholder="Quotation Logo URL"
                value={branding.quotation_logo_url || ''}
                onChange={(e) => setBranding({ ...branding, quotation_logo_url: e.target.value })}
                className="text-xs h-9"
              />
            </CardContent>
          </Card>
        </div>

        {/* Document Footer Terms & Conditions */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Document Footer Notes & Terms (বিল শর্তাবলী)</CardTitle>
            <CardDescription className="text-xs">
              Printed automatically at the bottom of all Commercial Invoices, Quotations, and Delivery Challans.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="footer_text">
                English Footer Note / Terms
              </Label>
              <Input
                id="footer_text"
                value={branding.footer_text}
                onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footer_text_bn">
                বাংলা বিল শর্তাবলী
              </Label>
              <Input
                id="footer_text_bn"
                value={branding.footer_text_bn}
                onChange={(e) => setBranding({ ...branding, footer_text_bn: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Branding Configuration
          </Button>
        </div>
      </form>
    </div>
  )
}
