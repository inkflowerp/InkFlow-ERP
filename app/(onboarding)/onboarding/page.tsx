'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Briefcase,
  Phone,
  MapPin,
  Coins,
  Globe,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Printer,
  Sparkles,
} from 'lucide-react'
import { onboardingSchema, OnboardingFormData } from '@/features/tenant/tenant.schemas'
import { TenantService } from '@/services/tenant.service'
import { AuthService } from '@/services/auth.service'
import { ONBOARDING_BUSINESS_TYPES } from '@/config/business-types.config'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { BangladeshAddressPicker } from '@/components/shared/bangladesh-address-picker'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 7

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { locale, tBilingual } = useI18n()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      name_bn: '',
      slug: '',
      business_type: 'digital_printing',
      phone: '',
      whatsapp: '',
      email: '',
      division_id: 1,
      district_id: 1,
      area: '',
      address: '',
      address_bn: '',
      currency: 'BDT',
      default_language: 'bn',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      owner_password: '',
    },
  })

  const watchedBusinessType = watch('business_type')
  const watchedLanguage = watch('default_language')
  const watchedCurrency = watch('currency')

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
    setValue('slug', slug, { shouldValidate: true })
  }

  const stepFields: Record<number, (keyof OnboardingFormData)[]> = {
    1: ['name', 'slug'],
    2: ['business_type'],
    3: ['phone', 'email'],
    4: ['division_id', 'district_id', 'address'],
    5: ['currency'],
    6: ['default_language'],
    7: ['owner_name', 'owner_email', 'owner_phone', 'owner_password'],
  }

  const nextStep = async () => {
    const fieldsToValidate = stepFields[currentStep]
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setError(null)
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
    }
  }

  const prevStep = () => {
    setError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Create company and auto-assign owner role with 14-day evaluation trial
      const res = await TenantService.createCompany(
        {
          name: data.name,
          name_bn: data.name_bn,
          slug: data.slug,
          business_type: data.business_type,
          phone: data.phone,
          whatsapp: data.whatsapp || data.phone,
          email: data.email,
          division_id: data.division_id,
          district_id: data.district_id,
          upazila_id: data.upazila_id,
          address: data.address,
          address_bn: data.address_bn,
          currency: data.currency,
          owner_name: data.owner_name,
          owner_email: data.owner_email,
          owner_phone: data.owner_phone,
          owner_password: data.owner_password,
          plan: 'starter',
        },
        'owner-user-' + Date.now()
      )

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to setup organization')
        setIsLoading(false)
        return
      }

      // 2. Establish authenticated session for new trial owner
      await AuthService.signIn(data.owner_email, data.owner_password, res.data.slug)

      // 3. Hard redirect directly to the new company dashboard
      window.location.href = `/${res.data.slug}/dashboard`
    } catch {
      setError('An unexpected error occurred during setup')
      setIsLoading(false)
    }
  }

  const stepTitles = [
    { step: 1, title: 'Company Name', titleBn: 'প্রতিষ্ঠানের নাম', icon: Building2 },
    { step: 2, title: 'Business Type', titleBn: 'ব্যবসার ধরন', icon: Briefcase },
    { step: 3, title: 'Contact Info', titleBn: 'যোগাযোগের তথ্য', icon: Phone },
    { step: 4, title: 'Address & Area', titleBn: 'ঠিকানা ও এলাকা', icon: MapPin },
    { step: 5, title: 'Currency', titleBn: 'মুদ্রা (Currency)', icon: Coins },
    { step: 6, title: 'Language', titleBn: 'ভাষা (Language)', icon: Globe },
    { step: 7, title: 'Owner Account', titleBn: 'মালিকের অ্যাকাউন্ট', icon: UserCheck },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-md text-white">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <span className="font-black tracking-tight text-slate-900 dark:text-white text-base">PrintERP</span>
            <span className="ml-1 text-xs font-semibold text-blue-600 dark:text-blue-400">Setup Wizard</span>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Wizard Card */}
      <main className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-2xl">
          {/* Step Progress Tracker */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>
                Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]?.title}
              </span>
              <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}% Completed</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>

            {/* Stepper Dots */}
            <div className="flex justify-between mt-3 px-1">
              {stepTitles.map((st) => (
                <div
                  key={st.step}
                  className={cn(
                    'flex flex-col items-center gap-1 cursor-pointer transition-colors',
                    currentStep === st.step
                      ? 'text-blue-600 font-bold'
                      : currentStep > st.step
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  )}
                  onClick={() => st.step < currentStep && setCurrentStep(st.step)}
                >
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border',
                      currentStep === st.step
                        ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950'
                        : currentStep > st.step
                        ? 'border-emerald-600 bg-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    )}
                  >
                    {currentStep > st.step ? <CheckCircle2 className="h-3.5 w-3.5" /> : st.step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-slate-900 dark:text-white flex items-center gap-2">
                {stepTitles[currentStep - 1]?.title}
                <span className="text-sm font-normal text-slate-400">
                  ({stepTitles[currentStep - 1]?.titleBn})
                </span>
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Enter your official enterprise printing or signage business name.'}
                {currentStep === 2 && 'Select your primary operational domain for specialized workflows.'}
                {currentStep === 3 && 'Provide your official business phone, WhatsApp, and email.'}
                {currentStep === 4 && 'Cascading administrative location in Bangladesh.'}
                {currentStep === 5 && 'Default billing currency used for quotations and job invoices.'}
                {currentStep === 6 && 'Choose how the interface and printed documents will be displayed.'}
                {currentStep === 7 && 'Create the primary Owner administrator account for your company.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* STEP 1: COMPANY NAME */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" required>
                        Company Name (English)
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g. Padma Digital & Signage Ltd."
                        {...register('name', { onChange: handleNameChange })}
                        error={errors.name?.message}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="name_bn">প্রতিষ্ঠানের নাম (বাংলায়)</Label>
                      <Input
                        id="name_bn"
                        placeholder="যেমন: পদ্মা ডিজিটাল অ্যান্ড সাইনেজ লি."
                        {...register('name_bn')}
                        error={errors.name_bn?.message}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="slug" required>
                        Unique Workspace Slug / URL
                      </Label>
                      <div className="flex rounded-md shadow-xs">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-100 text-slate-500 text-xs dark:border-slate-700 dark:bg-slate-800">
                          printerp.com.bd/
                        </span>
                        <Input
                          id="slug"
                          className="rounded-l-none"
                          placeholder="company-slug"
                          {...register('slug')}
                          error={errors.slug?.message}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: BUSINESS TYPE (8 Exact Options) */}
                {currentStep === 2 && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                      {ONBOARDING_BUSINESS_TYPES.map((bt) => {
                        const isSelected = watchedBusinessType === bt.code
                        return (
                          <div
                            key={bt.code}
                            onClick={() => setValue('business_type', bt.code, { shouldValidate: true })}
                            className={cn(
                              'cursor-pointer rounded-xl border p-3 transition-all flex items-start gap-3 text-left',
                              isSelected
                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/30'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                            )}
                          >
                            <div
                              className={cn(
                                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold',
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              <Printer className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between bangla-text">
                                {tBilingual(bt.nameEn, bt.nameBn)}
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 bangla-text">
                                {tBilingual(bt.descriptionEn, bt.descriptionBn)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: COMPANY CONTACT INFORMATION */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" required>
                        Company Phone Number (ফোন নম্বর)
                      </Label>
                      <Input
                        id="phone"
                        placeholder="01711XXXXXX"
                        {...register('phone')}
                        error={errors.phone?.message}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="whatsapp">
                        WhatsApp Business Number (হোয়াটসঅ্যাপ)
                      </Label>
                      <Input
                        id="whatsapp"
                        placeholder="01711XXXXXX (For client order updates)"
                        {...register('whatsapp')}
                      />
                      <span className="text-[11px] text-slate-500">
                        Used for sending automated job order proofs and delivery challan PDFs.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" required>
                        Official Email Address (ইমেইল)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="info@yourcompany.com.bd"
                        {...register('email')}
                        error={errors.email?.message}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: ADDRESS (Division, District, Upazila, Area, Full address) */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <BangladeshAddressPicker
                      divisionId={watch('division_id')}
                      districtId={watch('district_id')}
                      upazilaId={watch('upazila_id')}
                      address={watch('address')}
                      addressBn={watch('address_bn')}
                      onChange={(data) => {
                        if (data.divisionId) setValue('division_id', data.divisionId, { shouldValidate: true })
                        if (data.districtId) setValue('district_id', data.districtId, { shouldValidate: true })
                        if (data.upazilaId !== undefined) setValue('upazila_id', data.upazilaId)
                        if (data.address !== undefined) setValue('address', data.address, { shouldValidate: true })
                        if (data.addressBn !== undefined) setValue('address_bn', data.addressBn)
                      }}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="area">
                        Market / Commercial Printing Area (এলাকা/মার্কেট)
                      </Label>
                      <Input
                        id="area"
                        placeholder="e.g. Fakirapool, Motijheel, Banglabazar, Nilkhet, Anderkilla"
                        {...register('area')}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: CURRENCY */}
                {currentStep === 5 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                          ৳
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            BDT - Bangladeshi Taka (বাংলাদেশী টাকা)
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Pre-configured with Lakh/Crore numbering (e.g. ৳ ১,৫০,০০০.০০) and Bengali numerals.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency">Selected Currency</Label>
                      <Input id="currency" value={watchedCurrency} readOnly className="bg-slate-50 cursor-not-allowed" />
                    </div>
                  </div>
                )}

                {/* STEP 6: LANGUAGE (English, বাংলা) */}
                {currentStep === 6 && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    {[
                      {
                        code: 'bn',
                        title: 'বাংলা (Bengali)',
                        desc: 'সম্পূর্ণ বাংলা ইন্টারফেস ও ভাউচার ফরম্যাট',
                        badge: 'জনপ্রিয় (Popular)',
                      },
                      {
                        code: 'en',
                        title: 'English',
                        desc: 'Standard international English ERP interface',
                        badge: 'Standard',
                      },
                    ].map((lang) => {
                      const isSelected = watchedLanguage === lang.code
                      return (
                        <div
                          key={lang.code}
                          onClick={() => setValue('default_language', lang.code as 'en' | 'bn')}
                          className={cn(
                            'cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between',
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/30'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                          )}
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              {lang.title}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/50 dark:text-blue-300">
                                {lang.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{lang.desc}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* STEP 7: CREATE OWNER ACCOUNT */}
                {currentStep === 7 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        This account will be automatically assigned the <strong>Owner (মালিক)</strong> role with full system and billing permissions.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner_name" required>
                        Owner Full Name (মালিকের নাম)
                      </Label>
                      <Input
                        id="owner_name"
                        placeholder="e.g. Md. Shamsul Alam"
                        {...register('owner_name')}
                        error={errors.owner_name?.message}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="owner_email" required>
                          Owner Email (লগইন ইমেইল)
                        </Label>
                        <Input
                          id="owner_email"
                          type="email"
                          placeholder="owner@yourcompany.com.bd"
                          {...register('owner_email')}
                          error={errors.owner_email?.message}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="owner_phone" required>
                          Owner Mobile (মোবাইল নম্বর)
                        </Label>
                        <Input
                          id="owner_phone"
                          placeholder="01711XXXXXX"
                          {...register('owner_phone')}
                          error={errors.owner_phone?.message}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner_password" required>
                        Password (পাসওয়ার্ড)
                      </Label>
                      <div className="relative">
                        <Input
                          id="owner_password"
                          type="password"
                          placeholder="••••••••"
                          {...register('owner_password')}
                          error={errors.owner_password?.message}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">Minimum 6 characters.</span>
                    </div>
                  </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Previous
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < TOTAL_STEPS ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" isLoading={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                      Complete Setup & Launch
                      <Sparkles className="ml-1.5 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
