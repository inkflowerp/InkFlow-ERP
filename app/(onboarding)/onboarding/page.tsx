'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  CreditCard,
  ShieldCheck,
  Check,
  Zap,
  Landmark,
  Smartphone,
  Users,
  HardDrive,
  ShoppingCart,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { onboardingSchema, OnboardingFormData } from '@/features/tenant/tenant.schemas'
import { createCompanyAction, checkSlugAvailabilityAction } from '@/actions/tenant.actions'
import { initiateSubscriptionCheckoutAction } from '@/actions/subscription.actions'
import { ONBOARDING_BUSINESS_TYPES } from '@/config/business-types.config'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { BangladeshAddressPicker } from '@/components/shared/bangladesh-address-picker'
import { LanguageSwitcher } from '@/components/shell/language-switcher'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import { usePublicSubscriptionPlans, toBengaliDigits } from '@/hooks/use-public-plans'
import { PAYMENT_GATEWAY_METADATA_LIST } from '@/lib/payments/types'
import { getTenantLink, getTenantBaseUrl } from '@/lib/tenant/tenant-url'
import { getRootDomain } from '@/lib/tenant/tenant-resolution'
import type { PlanCode, BillingInterval, PaymentGatewayType } from '@/types/subscription.types'

function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean
    status: 'available' | 'unavailable' | 'reserved' | 'invalid' | 'idle'
    message: string
  }>({ checking: false, status: 'idle', message: '' })

  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = (searchParams.get('plan') as any) || 'trial'
  const isPaidPlan = Boolean(planParam && planParam !== 'trial')
  const totalSteps = isPaidPlan ? 8 : 7

  const { locale, setLocale, tBilingual } = useI18n()
  const { trialDays, paidPlans, activePaymentGateways } = usePublicSubscriptionPlans()

  // Paid Plan & Gateway State for Step 8
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>(() => {
    if (planParam && ['starter', 'business', 'enterprise'].includes(planParam)) {
      return planParam as PlanCode
    }
    return 'business'
  })
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('bkash')

  const rootDomain = typeof window !== 'undefined'
    ? window.location.host.replace(/^onboarding\./i, '').replace(/^www\./i, '')
    : getRootDomain()

  const [hasPulledRegistrationDraft, setHasPulledRegistrationDraft] = useState(false)
  const [showOwnerPassword, setShowOwnerPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    shouldUnregister: false,
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
      default_language: (locale === 'en' ? 'en' : 'bn'),
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      owner_password: '',
    },
  })

  // Synchronize form default_language if user toggles header LanguageSwitcher
  React.useEffect(() => {
    if (locale === 'en' || locale === 'bn') {
      setValue('default_language', locale)
    }
  }, [locale, setValue])

  // Pull Customer Name, Owner Email, Owner Mobile, and Password from registration draft or active session
  const pullRegistrationData = React.useCallback(() => {
    let pulledFromDraft = false

    // 1. Try registration draft from sessionStorage or localStorage
    try {
      let draft: any = null
      const rawSession = typeof window !== 'undefined' ? sessionStorage.getItem('printerp_registration_draft') : null
      const rawLocal = typeof window !== 'undefined' ? localStorage.getItem('printerp_registration_draft') : null

      if (rawSession) {
        try { draft = JSON.parse(rawSession) } catch {}
      }
      if (!draft && rawLocal) {
        try { draft = JSON.parse(rawLocal) } catch {}
      }

      if (draft) {
        const isFresh = !draft.savedAt || (Date.now() - draft.savedAt) < 6 * 60 * 60 * 1000
        if (isFresh) {
          if (draft.fullName) {
            setValue('owner_name', draft.fullName, { shouldValidate: true })
            pulledFromDraft = true
          }
          if (draft.email) {
            setValue('owner_email', draft.email, { shouldValidate: true })
            if (!getValues('email')) setValue('email', draft.email)
            pulledFromDraft = true
          }
          if (draft.phone) {
            setValue('owner_phone', draft.phone, { shouldValidate: true })
            if (!getValues('phone')) setValue('phone', draft.phone)
            pulledFromDraft = true
          }
        }
      }
    } catch {}

    // 2. Fallback: Check tenant session cookie
    try {
      const match = typeof document !== 'undefined'
        ? document.cookie.split('; ').find((row) => row.startsWith('printerp_tenant_session='))
        : null

      if (match) {
        const raw = match.split('=')[1]
        const session = JSON.parse(decodeURIComponent(raw))
        if (session) {
          if (session.companySlug && session.companyId) {
            window.location.href = getTenantLink(session.companySlug, '/dashboard')
            return
          }
          if (session.fullName && !getValues('owner_name')) {
            setValue('owner_name', session.fullName, { shouldValidate: true })
            pulledFromDraft = true
          }
          if (session.userEmail && !getValues('owner_email')) {
            setValue('owner_email', session.userEmail, { shouldValidate: true })
            if (!getValues('email')) setValue('email', session.userEmail)
            pulledFromDraft = true
          }
          if (session.phone && !getValues('owner_phone')) {
            setValue('owner_phone', session.phone, { shouldValidate: true })
            if (!getValues('phone')) setValue('phone', session.phone)
            pulledFromDraft = true
          }
        }
      }
    } catch {}

    if (pulledFromDraft) {
      setHasPulledRegistrationDraft(true)
    }
  }, [setValue, getValues])

  // Pull on initial load
  React.useEffect(() => {
    pullRegistrationData()
  }, [pullRegistrationData])

  // Pull / refresh whenever user navigates to Step 7
  React.useEffect(() => {
    if (currentStep === 7) {
      pullRegistrationData()
    }
  }, [currentStep, pullRegistrationData])

  const watchedBusinessType = watch('business_type')
  const watchedLanguage = watch('default_language')
  const watchedCurrency = watch('currency')
  const watchedSlug = watch('slug')

  // Live debounced slug availability check
  React.useEffect(() => {
    if (!watchedSlug || watchedSlug.trim().length < 2) {
      setSlugStatus({ checking: false, status: 'idle', message: '' })
      return
    }

    let isMounted = true
    setSlugStatus((prev) => ({ ...prev, checking: true }))

    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailabilityAction(watchedSlug)
        if (isMounted) {
          setSlugStatus({
            checking: false,
            status: res.status,
            message: res.message,
          })
        }
      } catch {
        if (isMounted) {
          setSlugStatus({ checking: false, status: 'idle', message: '' })
        }
      }
    }, 300)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [watchedSlug])

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
    8: [],
  }

  const nextStep = async () => {
    const fieldsToValidate = stepFields[currentStep] || []
    const isValid = fieldsToValidate.length > 0 ? await trigger(fieldsToValidate) : true
    if (isValid) {
      if (currentStep === 1) {
        if (slugStatus.status === 'unavailable' || slugStatus.status === 'reserved' || slugStatus.status === 'invalid') {
          setError(slugStatus.message || 'Please choose a valid and available subdomain slug.')
          return
        }
      }
      setError(null)
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    } else {
      // Find the first error in fieldsToValidate and display a prominent warning banner
      const errorMap: Record<string, string | undefined> = {
        name: 'Company Name is required (minimum 2 characters).',
        slug: 'Workspace subdomain is required (minimum 3 characters).',
        business_type: 'Please select your business type.',
        phone: 'Valid 11-digit phone number is required.',
        email: 'Valid official email address is required.',
        division_id: 'Please select your division.',
        district_id: 'Please select your district.',
        address: 'Street address is required (minimum 3 characters).',
        owner_name: 'Owner full name is required.',
        owner_email: 'Owner email address is required.',
        owner_phone: 'Owner mobile number is required.',
        owner_password: 'Password must be at least 6 characters.',
      }
      const firstErrorField = fieldsToValidate.find((f) => errors[f])
      const errorMsg = firstErrorField && errors[firstErrorField]?.message
        ? String(errors[firstErrorField]?.message)
        : firstErrorField && errorMap[firstErrorField]
        ? errorMap[firstErrorField]
        : 'Please fill in all required fields marked with * before continuing.'
      setError(errorMsg)
    }
  }

  const prevStep = () => {
    setError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Prevent accidental auto-submit on Enter key on the final step
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (currentStep < totalSteps) {
        nextStep()
      }
      // On final step (step 7 for trial, step 8 for paid): strictly DO NOT auto-submit. User must explicitly click the submit button.
    }
  }

  // Calculate pricing for Step 8
  const currentPlanObj = paidPlans.find((p) => p.code === selectedPlan) || paidPlans[0]
  const payableAmount = currentPlanObj
    ? billingInterval === 'yearly'
      ? currentPlanObj.price_yearly
      : currentPlanObj.price_monthly
    : 1999

  const onSubmit = async (data: OnboardingFormData) => {
    // Safety guard: Never submit if user is not on the final step
    if (currentStep < totalSteps) {
      await nextStep()
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const effectivePlan = isPaidPlan ? selectedPlan : 'trial'

      // 1. Create company and auto-assign owner role
      const res = await createCompanyAction({
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
        area: data.area,
        address: data.address,
        address_bn: data.address_bn,
        currency: data.currency,
        default_language: data.default_language,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        owner_password: data.owner_password || undefined,
        plan: effectivePlan,
      })

      if (!res?.success || !res?.data) {
        setError(res?.error || 'Failed to setup organization')
        setIsLoading(false)
        return
      }

      const companySlug = (res.data.slug || data.slug).toLowerCase().trim()


      // Ensure the tenant's chosen default language is active and synchronized in browser
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('printerp_locale', data.default_language)
          localStorage.removeItem('printerp_locale_explicit')
          document.cookie = `printerp_locale=${data.default_language}; path=/; max-age=31536000; SameSite=Lax`
          setLocale(data.default_language as 'en' | 'bn')
        } catch {}
      }

      // Clean up registration draft upon successful workspace creation
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('printerp_registration_draft')
          localStorage.removeItem('printerp_registration_draft')
        } catch {}
      }

      // Notify client-side state listeners about company creation
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('printerp_auth_changed'))
          window.dispatchEvent(new CustomEvent('printerp_data_sync', { detail: { key: 'printerp_company_profile' } }))
        } catch {}
      }

      const isLocalOrPsl =
        typeof window !== 'undefined' &&
        (window.location.hostname.includes('localhost') ||
          window.location.hostname.includes('127.0.0.1') ||
          window.location.hostname.endsWith('.vercel.app') ||
          window.location.hostname.endsWith('.pages.dev') ||
          window.location.hostname.endsWith('.netlify.app'))

      const targetDashboardUrl = isLocalOrPsl
        ? `/${companySlug}/dashboard`
        : res.subdomainUrl || getTenantLink(companySlug, '/dashboard')

      // 2. If Paid Plan, initiate subscription checkout
      if (isPaidPlan) {
        try {
          const checkoutSuccessUrl = isLocalOrPsl
            ? `${window.location.origin}/${companySlug}/dashboard?payment=success&plan=${selectedPlan}`
            : getTenantLink(companySlug, `/dashboard?payment=success&plan=${selectedPlan}`)
          const checkoutCancelUrl = isLocalOrPsl
            ? `${window.location.origin}/${companySlug}/dashboard?payment=cancelled`
            : getTenantLink(companySlug, `/dashboard?payment=cancelled`)

          const checkoutRes = await initiateSubscriptionCheckoutAction({
            companyId: res.data.id,
            planCode: selectedPlan,
            interval: billingInterval,
            gatewayProvider: selectedGateway,
            customerName: data.owner_name || data.name,
            customerPhone: data.owner_phone || data.phone,
            customerEmail: data.owner_email || data.email,
            successUrl: checkoutSuccessUrl,
            cancelUrl: checkoutCancelUrl,
          })

          if (checkoutRes.success && checkoutRes.data?.checkoutUrl) {
            // Redirect to payment gateway URL (bKash, SSLCOMMERZ, Nagad, Stripe)
            window.location.href = checkoutRes.data.checkoutUrl
            return
          } else if (checkoutRes.success) {
            // Offline / Bank wire / direct activation
            window.location.href = isLocalOrPsl
              ? `/${companySlug}/dashboard?payment=initiated&trx=${checkoutRes.data?.internalTrxId || ''}`
              : getTenantLink(companySlug, `/dashboard?payment=initiated&trx=${checkoutRes.data?.internalTrxId || ''}`)
            return
          } else {
            console.warn('Checkout warning:', checkoutRes.error)
            window.location.href = isLocalOrPsl
              ? `/${companySlug}/dashboard?payment=pending`
              : getTenantLink(companySlug, `/dashboard?payment=pending`)
            return
          }
        } catch (checkoutErr) {
          console.warn('Checkout initiation error:', checkoutErr)
          window.location.href = targetDashboardUrl
          return
        }
      }

      // 3. For trial / free plan: Hard redirect directly to the new company dashboard
      window.location.href = targetDashboardUrl
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during setup')
      setIsLoading(false)
    }
  }

  const stepTitles = [
    { step: 1, title: 'Company Name', titleBn: 'প্রতিষ্ঠানের নাম', icon: Building2 },
    { step: 2, title: 'Business Type', titleBn: 'ব্যবসার ধরন', icon: Briefcase },
    { step: 3, title: 'Contact Info', titleBn: 'যোগাযোগের তথ্য', icon: Phone },
    { step: 4, title: 'Address & Area', titleBn: 'ঠিকানা ও এলাকা', icon: MapPin },
    { step: 5, title: 'Currency', titleBn: 'মুদ্রা', icon: Coins },
    { step: 6, title: 'Language', titleBn: 'ভাষা', icon: Globe },
    { step: 7, title: 'Owner Account', titleBn: 'মালিকের অ্যাকাউন্ট', icon: UserCheck },
    ...(isPaidPlan
      ? [{ step: 8, title: 'Payment & Activation', titleBn: 'পেমেন্ট ও অ্যাক্টিভেশন', icon: CreditCard }]
      : []),
  ]

  // Only show integrated, valid, and active platform payment gateways
  const gateways =
    activePaymentGateways && activePaymentGateways.length > 0
      ? activePaymentGateways
      : PAYMENT_GATEWAY_METADATA_LIST.filter((g) =>
          ['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(g.id)
        )
  const activeGatewayMeta = gateways.find((g) => g.id === selectedGateway) || gateways[0]

  React.useEffect(() => {
    if (gateways.length > 0 && !gateways.some((g) => g.id === selectedGateway)) {
      setSelectedGateway(gateways[0].id as PaymentGatewayType)
    }
  }, [gateways, selectedGateway])

  return (
    <div className="min-h-screen bg-muted flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mx-auto w-full pb-6 border-b border-border dark:border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md text-white">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <span className="font-black tracking-tight text-foreground dark:text-white text-base">PrintFlow</span>
            <span className="ml-1 text-xs font-semibold text-primary text-primary">Setup Wizard</span>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main Wizard Card */}
      <main className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-2xl">
          {/* Step Progress Tracker */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
              <span>
                Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]?.title}
              </span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Completed</span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
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
                      ? 'text-primary font-bold'
                      : currentStep > st.step
                      ? 'text-success'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => st.step < currentStep && setCurrentStep(st.step)}
                >
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border',
                      currentStep === st.step
                        ? 'border-border bg-primary/10 text-primary bg-primary/10'
                        : currentStep > st.step
                        ? 'border-success-border bg-success text-white'
                        : 'border-input bg-card dark:bg-card'
                    )}
                  >
                    {currentStep > st.step ? <CheckCircle2 className="h-3.5 w-3.5" /> : st.step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-border shadow-xl bg-card dark:bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-foreground dark:text-white flex items-center gap-2">
                {stepTitles[currentStep - 1]?.title}
                <span className="text-sm font-normal text-muted-foreground">
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
                {currentStep === 8 && 'Select your billing cycle and preferred payment method to activate your subscription.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-5 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm text-destructive border-danger-border/50 bg-danger-surface text-destructive">
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                }}
                onKeyDown={handleFormKeyDown}
                className="space-y-4"
              >
                {/* STEP 1: COMPANY NAME */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" required>
                        Company Name (English)
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g. Apex Digital & Signage Ltd."
                        {...register('name', { onChange: handleNameChange })}
                        error={errors.name?.message}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="name_bn">প্রতিষ্ঠানের নাম (বাংলায়)</Label>
                      <Input
                        id="name_bn"
                        placeholder="যেমন: অ্যাপেক্স ডিজিটাল অ্যান্ড সাইনেজ লি."
                        {...register('name_bn')}
                        error={errors.name_bn?.message}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="slug" required>
                          Workspace Subdomain / URL (কাস্টম সাবডোমেইন)
                        </Label>
                        {slugStatus.checking ? (
                          <span className="text-xs text-muted-foreground animate-pulse">Checking availability...</span>
                        ) : slugStatus.status === 'available' ? (
                          <span className="text-xs font-semibold text-success text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Subdomain Available
                          </span>
                        ) : slugStatus.status === 'unavailable' ? (
                          <span className="text-xs font-semibold text-destructive text-destructive flex items-center gap-1">
                            ✗ Subdomain Taken
                          </span>
                        ) : slugStatus.status === 'reserved' ? (
                          <span className="text-xs font-semibold text-warning text-warning flex items-center gap-1">
                            ⚠ Reserved Subdomain
                          </span>
                        ) : slugStatus.status === 'invalid' ? (
                          <span className="text-xs font-semibold text-destructive text-destructive flex items-center gap-1">
                            ✗ Invalid Subdomain
                          </span>
                        ) : null}
                      </div>
                      <div className="flex rounded-md shadow-xs items-stretch">
                        <span className="inline-flex items-center px-2.5 sm:px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs tabular-nums shrink-0 whitespace-nowrap select-none">
                          https://
                        </span>
                        <Input
                          id="slug"
                          className="rounded-none tabular-nums text-xs sm:text-sm flex-1 min-w-[80px]"
                          placeholder="vision-sign"
                          {...register('slug')}
                          error={errors.slug?.message}
                        />
                        <span className="inline-flex items-center px-2.5 sm:px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-xs tabular-nums shrink-0 whitespace-nowrap select-none">
                          .{rootDomain}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        Your team will access this workspace at: <strong className="text-primary text-primary tabular-nums">https://{watchedSlug || 'your-company'}.{rootDomain}</strong>
                      </p>
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
                                ? 'border-border bg-primary/10/60 ring-2 focus:ring-ring/20 border-primary/20 bg-primary/10'
                                : 'border-border hover:border-input dark:hover:border-border'
                            )}
                          >
                            <div
                              className={cn(
                                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold',
                                isSelected
                                  ? 'bg-primary text-white'
                                  : 'bg-muted text-muted-foreground dark:text-muted-foreground'
                              )}
                            >
                              <Printer className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs sm:text-sm text-foreground dark:text-white flex items-center justify-between bangla-text">
                                {tBilingual(bt.nameEn, bt.nameBn)}
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 bangla-text">
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
                        error={errors.whatsapp?.message}
                      />
                      <span className="text-xs text-muted-foreground">
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
                      errors={{
                        division_id: errors.division_id?.message,
                        district_id: errors.district_id?.message,
                        upazila_id: errors.upazila_id?.message,
                        address: errors.address?.message,
                        address_bn: errors.address_bn?.message,
                      }}
                      addressError={errors.address?.message}
                      divisionError={errors.division_id?.message}
                      districtError={errors.district_id?.message}
                      onChange={(data) => {
                        if (data.divisionId) setValue('division_id', data.divisionId, { shouldValidate: true })
                        if (data.districtId) setValue('district_id', data.districtId, { shouldValidate: true })
                        if (data.upazilaId !== undefined) setValue('upazila_id', data.upazilaId)
                        if (data.address !== undefined) setValue('address', data.address, { shouldValidate: true })
                        if (data.addressBn !== undefined) setValue('address_bn', data.addressBn)
                        if (error) setError(null)
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
                        error={errors.area?.message}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: CURRENCY */}
                {currentStep === 5 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    <div className="rounded-xl border border-primary/20 bg-primary/10/50 p-4 border-border/40 bg-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                          ৳
                        </div>
                        <div>
                          <div className="font-bold text-foreground dark:text-white">
                            BDT - Bangladeshi Taka (বাংলাদেশী টাকা)
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                            Pre-configured with Lakh/Crore numbering (e.g. ৳ ১,৫০,০০০.০০) and Bengali numerals.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency">Selected Currency</Label>
                      <Input id="currency" value={watchedCurrency} readOnly className="bg-muted cursor-not-allowed" />
                    </div>
                  </div>
                )}

                {/* STEP 6: LANGUAGE (English, বাংলা) */}
                {currentStep === 6 && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    {[
                      {
                        code: 'bn',
                        title: tBilingual('Bengali', 'বাংলা'),
                        desc: tBilingual('Full Bengali interface and voucher formats', 'সম্পূর্ণ বাংলা ইন্টারফেস ও ভাউচার ফরম্যাট'),
                        badge: tBilingual('Popular', 'জনপ্রিয়'),
                      },
                      {
                        code: 'en',
                        title: tBilingual('English', 'ইংরেজি'),
                        desc: tBilingual('Standard international English ERP interface', 'স্ট্যান্ডার্ড আন্তর্জাতিক ইংরেজি ইন্টারফেস'),
                        badge: tBilingual('Standard', 'স্ট্যান্ডার্ড'),
                      },
                    ].map((lang) => {
                      const isSelected = watchedLanguage === lang.code
                      return (
                        <div
                          key={lang.code}
                          onClick={() => {
                            const chosen = lang.code as 'en' | 'bn'
                            setValue('default_language', chosen)
                            setLocale(chosen)
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('printerp_locale', chosen)
                              localStorage.removeItem('printerp_locale_explicit')
                              document.cookie = `printerp_locale=${chosen}; path=/; max-age=31536000; SameSite=Lax`
                            }
                          }}
                          className={cn(
                            'cursor-pointer rounded-xl border p-4 transition-all flex items-center justify-between',
                            isSelected
                              ? 'border-border bg-primary/10/70 ring-2 focus:ring-ring/20 border-primary/20 bg-primary/10'
                              : 'border-border hover:border-input dark:border-border'
                          )}
                        >
                          <div>
                            <div className="font-bold text-sm text-foreground dark:text-white flex items-center gap-2">
                              {lang.title}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold bg-primary/50 text-primary">
                                {lang.badge}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{lang.desc}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* STEP 7: CREATE OWNER ACCOUNT */}
                {currentStep === 7 && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    {hasPulledRegistrationDraft ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          <span>
                            {tBilingual(
                              'Pre-filled with your registration credentials. You can keep or edit them.',
                              'আপনার রেজিস্ট্রেশন তথ্য থেকে স্বয়ংক্রিয়ভাবে যুক্ত করা হয়েছে। আপনি চাইলে পরিবর্তন করতে পারেন।'
                            )}
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                          {tBilingual('Auto-Filled', 'স্বয়ংক্রিয়')}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-success/30 bg-success-surface p-3 text-xs text-success flex items-center gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 text-success" />
                        <span>
                          {tBilingual(
                            'This account will be automatically assigned the Owner role with full permissions.',
                            'এই অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে পূর্ণ ক্ষমতাসহ মালিক (Owner) রোল যুক্ত হবে।'
                          )}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="owner_name" required>
                        {tBilingual('Owner Full Name', 'মালিকের নাম')}
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
                          {tBilingual('Owner Email (Login)', 'মালিকের ইমেইল (লগইন)')}
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
                          {tBilingual('Owner Mobile Number', 'মালিকের মোবাইল নম্বর')}
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
                        {tBilingual('Password', 'পাসওয়ার্ড')}
                      </Label>
                      <div className="relative flex items-center">
                        <Input
                          id="owner_password"
                          type={showOwnerPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...register('owner_password')}
                          error={errors.owner_password?.message}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                          className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-hidden cursor-pointer"
                          aria-label={showOwnerPassword ? 'Hide password' : 'Show password'}
                        >
                          {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {tBilingual('Minimum 6 characters.', 'কমপক্ষে ৬ অক্ষর বা সংখ্যা।')}
                      </span>
                    </div>

                    {/* Setup Review Card */}
                    <div className="mt-4 p-3.5 rounded-xl bg-muted border border-border text-xs space-y-2">
                      <div className="font-bold text-foreground flex items-center justify-between">
                        <span>Organization Summary</span>
                        <span className="text-xs tabular-nums px-2 py-0.5 rounded bg-primary/10 text-primary bg-primary/10 text-primary font-semibold">
                          {isPaidPlan ? `${selectedPlan.toUpperCase()} Plan (Step 8: Payment)` : `${trialDays}-Day Free Trial`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground block">Company:</span>
                          <span className="font-semibold text-foreground truncate block">
                            {watch('name') || 'Your Company'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Workspace Subdomain:</span>
                          <span className="tabular-nums text-primary text-primary truncate block font-bold">
                            https://{watch('slug') || 'workspace'}.{rootDomain}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Currency & Language:</span>
                          <span className="font-semibold text-foreground dark:text-foreground">
                            {watch('currency')} · {watch('default_language') === 'bn' ? 'বাংলা' : 'English'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Contact Phone:</span>
                          <span className="font-semibold text-foreground dark:text-foreground">
                            {watch('phone') || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 8: PAYMENT & PLAN ACTIVATION (Paid Plans Only) */}
                {currentStep === 8 && isPaidPlan && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    {/* Billing Interval Toggle */}
                    <div className="flex items-center justify-center pt-1 pb-1">
                      <div className="inline-flex items-center bg-muted p-1 rounded-xl border border-border dark:border-border">
                        <button
                          type="button"
                          onClick={() => setBillingInterval('monthly')}
                          className={cn(
                            'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                            billingInterval === 'monthly'
                              ? 'bg-card text-primary text-primary shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {tBilingual('Monthly Billing', 'মাসিক বিলিং')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingInterval('yearly')}
                          className={cn(
                            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                            billingInterval === 'yearly'
                              ? 'bg-card text-primary text-primary shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span>{tBilingual('Yearly Billing', 'বাৎসরিক বিলিং')}</span>
                          <span className="bg-success text-white text-xs font-black px-1.5 py-0.2 rounded-full uppercase">
                            {tBilingual('2 Mo Free', '২ মাস ফ্রি')}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Plan Options Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {paidPlans.map((plan) => {
                        const isSelected = selectedPlan === plan.code
                        const isRecommended = plan.code === 'business'
                        const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly

                        return (
                          <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.code as PlanCode)}
                            className={cn(
                              'relative rounded-xl border-2 p-3 cursor-pointer transition-all flex flex-col justify-between text-left',
                              isSelected
                                ? 'border-border bg-primary/10/50 bg-primary/10 shadow-md ring-2 focus:ring-ring/20'
                                : 'border-border bg-card hover:border-input'
                            )}
                          >
                            {isRecommended && (
                              <div className="absolute -top-2.5 right-3 text-white text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                {tBilingual('Popular', 'জনপ্রিয়')}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs sm:text-sm text-foreground dark:text-white bangla-text">
                                  {tBilingual(plan.name, plan.name_bn)}
                                </h4>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                    <Check className="h-2.5 w-2.5" />
                                  </div>
                                )}
                              </div>

                              <div className="mt-1.5">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-base sm:text-lg font-black text-foreground dark:text-white">
                                    ৳{locale === 'bn' ? toBengaliDigits(price) : price.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {billingInterval === 'yearly' ? tBilingual('/yr', '/বছর') : tBilingual('/mo', '/মাস')}
                                  </span>
                                </div>
                              </div>

                              {/* Key Limits */}
                              <div className="mt-2 pt-2 border-t border-border dark:border-border/80 space-y-1 text-xs text-muted-foreground dark:text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-primary shrink-0" />
                                  <span>{locale === 'bn' ? toBengaliDigits(plan.max_users) : plan.max_users} {tBilingual('Users', 'ইউজার')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3 w-3 text-primary shrink-0" />
                                  <span>{locale === 'bn' ? toBengaliDigits(plan.max_branches) : plan.max_branches} {tBilingual('Branches', 'শাখা')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <ShoppingCart className="h-3 w-3 text-success shrink-0" />
                                  <span>{locale === 'bn' ? toBengaliDigits(plan.monthly_orders) : plan.monthly_orders.toLocaleString()} {tBilingual('Orders', 'অর্ডার')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Payment Gateway Selector */}
                    <div className="rounded-xl bg-muted p-3.5 border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 bangla-text">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                          {tBilingual('Select Payment Method', 'পেমেন্ট গেটওয়ে নির্বাচন করুন')}
                        </span>
                        <span className="text-xs font-bold text-foreground dark:text-white">
                          {tBilingual('Amount: ', 'মোট প্রদেয়: ')}
                          <span className="text-primary text-primary font-black">
                            ৳{locale === 'bn' ? toBengaliDigits(payableAmount) : payableAmount.toLocaleString()} BDT
                          </span>
                        </span>
                      </div>

                      {gateways.length === 0 ? (
                        <div className="p-3 text-center text-xs text-warning text-warning bg-warning-surface bg-warning-surface rounded-xl border border-warning-border border-warning-border bangla-text">
                          {tBilingual(
                            'No online payment gateway is currently active. You can continue and payment will be arranged manually.',
                            'বর্তমানে কোন অনলাইন পেমেন্ট গেটওয়ে সক্রিয় নেই। আপনি এগিয়ে যেতে পারেন, ম্যানুয়ালি পেমেন্ট সমন্বয় করা হবে।'
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {gateways.map((g) => {
                            const isGWSelected = selectedGateway === g.id
                            return (
                              <div
                                key={g.id}
                                onClick={() => setSelectedGateway(g.id)}
                                className={cn(
                                  'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer',
                                  isGWSelected
                                    ? 'border-border bg-card shadow-sm ring-2 focus:ring-ring/20'
                                    : 'border-border bg-card hover:bg-muted dark:hover:bg-muted'
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  {g.id === 'bkash' && <Smartphone className="h-3.5 w-3.5 text-pink-600" />}
                                  {g.id === 'sslcommerz' && <CreditCard className="h-3.5 w-3.5 text-primary" />}
                                  {g.id === 'nagad' && <Smartphone className="h-3.5 w-3.5 text-warning" />}
                                  {g.id === 'bank_wire' && <Landmark className="h-3.5 w-3.5 text-success" />}
                                  {!['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(g.id) && (
                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                  )}
                                  <span className="text-xs font-bold text-foreground bangla-text">
                                    {tBilingual(g.name, g.nameBn)}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground truncate max-w-full">
                                  {g.id === 'bkash' && 'Instant MFS'}
                                  {g.id === 'sslcommerz' && 'Cards / Net Banking'}
                                  {g.id === 'nagad' && 'Nagad Direct'}
                                  {g.id === 'bank_wire' && 'Bank Transfer / EFT'}
                                  {!['bkash', 'sslcommerz', 'nagad', 'bank_wire'].includes(g.id) && (g.category || 'Online Gateway')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Selected Gateway Instruction Callout */}
                      {activeGatewayMeta?.instructions && activeGatewayMeta.instructions.length > 0 && (
                        <div className="p-2.5 bg-primary/10/70 bg-primary/10 rounded-lg border border-border border-border/60 text-xs text-primary text-primary space-y-1">
                          {activeGatewayMeta.instructions.map((ins, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{ins}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Order Summary & Security Callout */}
                    <div className="rounded-xl bg-muted border border-border p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground dark:text-muted-foreground">
                        <span>Selected Plan & Cycle:</span>
                        <span className="font-bold text-foreground dark:text-white capitalize">
                          {selectedPlan} Plan ({billingInterval})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground dark:text-muted-foreground">
                        <span>Workspace:</span>
                        <span className="tabular-nums text-primary text-primary font-semibold">
                          /{watch('slug') || 'workspace'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold text-foreground dark:text-white">
                        <span>Total Payable:</span>
                        <span className="text-sm font-black text-primary text-primary">
                          ৳{locale === 'bn' ? toBengaliDigits(payableAmount) : payableAmount.toLocaleString()} BDT
                        </span>
                      </div>
                      <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
                        <Lock className="h-3 w-3 text-success" />
                        <span>256-bit SSL Encrypted & Automated Invoice Activation</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border dark:border-border">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Previous
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={nextStep} disabled={isLoading}>
                      {currentStep === 7 && isPaidPlan ? (
                        <>
                          Proceed to Payment
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      isLoading={isLoading}
                      disabled={isLoading}
                      className={cn(
                        'font-bold px-6 shadow-md',
                        isPaidPlan
                          ? '    hover: hover: text-white'
                          : 'bg-success hover:bg-success text-white'
                      )}
                    >
                      {isPaidPlan ? (
                        <>
                          <Zap className="mr-1.5 h-4 w-4 text-warning" />
                          <span>
                            {tBilingual(
                              `Pay & Launch (৳${payableAmount.toLocaleString()})`,
                              `পেমেন্ট করে চালু করুন (৳${locale === 'bn' ? toBengaliDigits(payableAmount) : payableAmount.toLocaleString()})`
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{tBilingual('Complete Setup & Launch', 'সেটআপ সম্পন্ন করে চালু করুন')}</span>
                          <Sparkles className="ml-1.5 h-4 w-4" />
                        </>
                      )}
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted flex items-center justify-center p-8 text-muted-foreground text-sm">Loading setup wizard...</div>}>
      <OnboardingWizard />
    </Suspense>
  )
}
