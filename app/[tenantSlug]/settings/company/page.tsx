'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import Link from 'next/link'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'

export default function CompanyProfileSettingsPage() {
  const { company } = useTenant()
  const { accountType, accountTypeMeta, isTrial, daysRemainingInTrial, currentPlan } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const [isSaved, setIsSaved] = useState(false)

  const slug = company?.slug || ''
  const [profile, setProfile] = useDataStore(STORAGE_KEYS.COMPANY_PROFILE, {
    name: company?.name || '',
    name_bn: company?.name_bn || '',
    legal_name: company?.legal_name || '',
    phone: company?.phone || '',
    whatsapp: company?.whatsapp || '',
    email: company?.email || '',
    area: company?.area || '',
    address: company?.address || '',
    address_bn: company?.address_bn || '',
  })

  // Form State initialized from persistent store
  const [formData, setFormData] = useState(profile)

  React.useEffect(() => {
    if (profile) {
      setFormData(profile)
    }
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setProfile(formData)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }


  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Company Profile & Information"
        titleBn="প্রতিষ্ঠান পরিচিতি ও তথ্য"
        descriptionEn="Manage corporate identity, physical printing hub address, and official communication channels."
        descriptionBn="করপোরেট পরিচিতি, প্রিন্টিং হাবের ঠিকানা এবং অফিশিয়াল যোগাযোগের মাধ্যম পরিচালনা করুন।"
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

          <Link href={`/${slug}/settings/subscription`}>
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
          <span>Company profile information updated and recorded in audit log.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Corporate Names & Registration
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
              />
            </div>
          </CardContent>
        </Card>

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
                  Official Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">
                  WhatsApp Business No.
                </Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Official Billing Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 sm:h-9 text-xs font-semibold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Profile Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
