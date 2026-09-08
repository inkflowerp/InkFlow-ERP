'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  User,
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  CheckCircle2,
  Sparkles,
  Loader2,
  Tag,
  CreditCard,
  FileText,
  Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { GeoService } from '@/services/geo.service'
import { createCustomerAction, checkCustomerDuplicateAction } from '@/actions/customer.actions'
import {
  CustomerRecord,
  CustomerKind,
  CustomerCategory,
  CustomerRateLevel,
  CustomerPaymentTerms,
  DuplicateMatchResult,
} from '@/types/crm.types'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'

export interface NewCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: (customer: CustomerRecord) => void
  initialName?: string
  initialPhone?: string
  companyId?: string
}

const PRESET_TAGS = ['VIP', 'Corporate', 'Agency', 'Regular', 'High Value', 'Govt Tender']

export function NewCustomerModal({
  open,
  onOpenChange,
  onCustomerCreated,
  initialName = '',
  initialPhone = '',
  companyId = 'c-01',
}: NewCustomerModalProps) {
  const { t, tBilingual, locale } = useI18n()
  const { company } = useTenant()
  const { activeRole, hasPermission } = usePermissions()
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 1. Customer Type (Business default vs Individual)
  const [customerKind, setCustomerKind] = useState<CustomerKind>('business')

  // 2. Basic Information
  const [name, setName] = useState<string>(initialName)
  const [nameBn, setNameBn] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [contactPerson, setContactPerson] = useState<string>('')

  // 3. Contact Information
  const [mobile, setMobile] = useState<string>(initialPhone)
  const [whatsapp, setWhatsapp] = useState<string>('')
  const [sameAsMobile, setSameAsMobile] = useState<boolean>(true)
  const [email, setEmail] = useState<string>('')
  const [altPhone, setAltPhone] = useState<string>('')

  // 4. BD Cascading Address
  const [divisionId, setDivisionId] = useState<number | null>(1) // Default: Dhaka
  const [districtId, setDistrictId] = useState<number | null>(1) // Default: Dhaka
  const [upazilaId, setUpazilaId] = useState<number | null>(null)
  const [customUpazila, setCustomUpazila] = useState<string>('')
  const [area, setArea] = useState<string>('')
  const [fullAddress, setFullAddress] = useState<string>('')

  // 5. Expandable Additional Details
  const [isAdditionalOpen, setIsAdditionalOpen] = useState<boolean>(false)
  const [category, setCategory] = useState<CustomerCategory>('regular')
  const [rateLevel, setRateLevel] = useState<CustomerRateLevel>('default')
  const [paymentTerms, setPaymentTerms] = useState<CustomerPaymentTerms>('cash_on_delivery')
  const [creditLimit, setCreditLimit] = useState<number>(50000)
  const [tin, setTin] = useState<string>('')
  const [bin, setBin] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)

  // 6. UI & Real-Time Duplicate States
  const [isSearchingDuplicate, setIsSearchingDuplicate] = useState<boolean>(false)
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchResult[]>([])
  const [dismissDuplicate, setDismissDuplicate] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Geo lists based on cascading selections
  const divisions = useMemo(() => GeoService.getDivisions(), [])
  const districts = useMemo(() => {
    return divisionId ? GeoService.getDistrictsByDivision(divisionId) : []
  }, [divisionId])
  const upazilas = useMemo(() => {
    return districtId ? GeoService.getUpazilasByDistrict(districtId) : []
  }, [districtId])

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      setName(initialName || '')
      setMobile(initialPhone || '')
      if (initialPhone) setWhatsapp(initialPhone)
      setDismissDuplicate(false)
      setDuplicateMatches([])
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsSubmitting(false)

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false)
      }

      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)

      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)

      return () => {
        document.body.style.overflow = prevOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open, initialName, initialPhone, onOpenChange])

  // Automatically keep WhatsApp synced if "Same as Mobile" is checked
  useEffect(() => {
    if (sameAsMobile) {
      setWhatsapp(mobile)
    }
  }, [mobile, sameAsMobile])

  // Real-time debounced duplicate check
  useEffect(() => {
    if (!open || dismissDuplicate) return

    const trimmedMobile = mobile.trim()
    const trimmedName = name.trim()
    const trimmedCompany = companyName.trim()

    if (
      trimmedMobile.length < 5 &&
      trimmedName.length < 3 &&
      trimmedCompany.length < 3
    ) {
      setDuplicateMatches([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingDuplicate(true)
      try {
        const res = await checkCustomerDuplicateAction(
          {
            mobile: trimmedMobile,
            whatsapp: whatsapp.trim(),
            name: trimmedName,
            company_name: trimmedCompany,
          },
          company?.id || companyId
        )

        if (res.success && res.data) {
          setDuplicateMatches(res.data.matches)
        }
      } catch {
        // Ignore background duplicate check errors
      } finally {
        setIsSearchingDuplicate(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [name, companyName, mobile, whatsapp, open, dismissDuplicate, company?.id, companyId])

  // Handle Tag Addition
  const handleAddTag = (tag: string) => {
    const clean = tag.trim()
    if (!clean) return
    if (!tags.includes(clean)) {
      setTags([...tags, clean])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  // Handle Selection of Existing Customer
  const handleUseExistingCustomer = (existing: CustomerRecord) => {
    if (onCustomerCreated) {
      onCustomerCreated(existing)
    }
    onOpenChange(false)
  }

  // Save Customer Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Basic Validation
    if (!name.trim()) {
      setErrorMessage('Please enter the customer name.')
      return
    }

    if (!mobile.trim()) {
      setErrorMessage('Please enter a mobile phone number.')
      return
    }

    const cleanedPhone = mobile.replace(/\D/g, '')
    if (cleanedPhone.length < 10) {
      setErrorMessage('Please enter a valid 11-digit Bangladesh phone number (01XXXXXXXXX).')
      return
    }

    setIsSubmitting(true)

    try {
      const selectedDivision = divisions.find((d) => d.id === divisionId)
      const selectedDistrict = districts.find((d) => d.id === districtId)
      const selectedUpazila = upazilas.find((u) => u.id === upazilaId)
      const upazilaText = selectedUpazila
        ? selectedUpazila.name
        : customUpazila.trim() || null

      const payload = {
        company_id: company?.id || companyId,
        role: activeRole,
        customer_kind: customerKind,
        customer_category: category,
        rate_level: rateLevel,
        name: name.trim(),
        name_bn: nameBn.trim() || null,
        company_name: companyName.trim() || null,
        contact_person: contactPerson.trim() || null,
        mobile: mobile.trim(),
        whatsapp: sameAsMobile ? mobile.trim() : whatsapp.trim() || null,
        email: email.trim() || null,
        alternative_phone: altPhone.trim() || null,

        division_id: divisionId,
        division: selectedDivision?.name || null,
        district_id: districtId,
        district: selectedDistrict?.name || null,
        upazila_id: upazilaId,
        upazila_thana: upazilaText,
        area: area.trim() || null,
        address: fullAddress.trim() || null,
        full_address: fullAddress.trim() || null,

        bin_no: bin.trim() || null,
        tin_no: tin.trim() || null,
        credit_limit: Number(creditLimit) || 0,
        payment_terms: paymentTerms,
        notes: notes.trim() || null,
        tags: tags.length > 0 ? tags : [category.toUpperCase()],
        is_active: isActive,
      }

      const res = await createCustomerAction(payload)

      if (!res || !res.success || !res.data) {
        setErrorMessage(res?.error || 'Failed to create customer in database.')
        setIsSubmitting(false)
        return
      }

      const createdCustomer = res.data
      if (createdCustomer) {
        PrintERPDataStore.addItem(STORAGE_KEYS.CUSTOMERS, createdCustomer)
      }

      setSuccessMessage('Customer created successfully!')

      // Seamless return to parent workflow
      setTimeout(() => {
        if (onCustomerCreated && createdCustomer) {
          onCustomerCreated(createdCustomer)
        }
        onOpenChange(false)
      }, 400)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error occurred while saving customer.')
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto sm:p-4 animate-in fade-in-0">
      {/* Darkened Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog Container */}
      <div className="relative z-50 flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {tBilingual('New Customer', 'নতুন কাস্টমার তৈরি')}
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
                  Quick Add
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Create profile in seconds & auto-select in workflow', 'কয়েক সেকেন্ডে কাস্টমার প্রোফাইল তৈরি ও লিঙ্ক করুন')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-5 space-y-5 flex-1">
            {/* 1. CUSTOMER TYPE SEGMENTED TOGGLE */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tBilingual('Customer Type', 'কাস্টমারের ধরন')}
              </Label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerKind('business')
                    if (category === 'regular') setCategory('corporate')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all',
                    customerKind === 'business'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  <span>{tBilingual('Business / Corporate', 'প্রতিষ্ঠান / কর্পোরেট')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomerKind('individual')
                    if (category === 'corporate') setCategory('regular')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all',
                    customerKind === 'individual'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <User className="h-4 w-4" />
                  <span>{tBilingual('Individual / Walk-in', 'ব্যক্তিগত / খুচরা')}</span>
                </button>
              </div>
            </div>

            {/* DUPLICATE WARNING BANNER (LIVE DETECTION) */}
            {duplicateMatches.length > 0 && !dismissDuplicate && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/40 p-3.5 space-y-2 animate-in fade-in-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Possible Existing Customer Found</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissDuplicate(true)}
                    className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Continue as New
                  </button>
                </div>

                {duplicateMatches.slice(0, 2).map((match) => (
                  <div
                    key={match.customer.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800 text-xs"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {match.customer.name}
                        {match.customer.company_name ? ` (${match.customer.company_name})` : ''}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {match.customer.mobile} • {match.matchReason}
                      </span>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleUseExistingCustomer(match.customer)}
                      className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-semibold h-8 px-3 rounded-lg"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Use Existing
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* 2. BASIC INFORMATION SECTION */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Customer Name * */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="custName" required className="text-xs font-semibold">
                    {tBilingual('Customer Name', 'গ্রাহকের নাম')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="custName"
                      ref={nameInputRef}
                      placeholder={tBilingual('Enter customer name (English or বাংলা)', 'কাস্টমারের নাম লিখুন')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-10 text-sm pl-9 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <User className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="compName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Company Name', 'প্রতিষ্ঠানের নাম')}
                    {customerKind === 'individual' && (
                      <span className="text-slate-400 font-normal ml-1">({t('common.optional')})</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="compName"
                      placeholder={tBilingual('Enter company / agency name', 'কোম্পানি বা এজেন্সির নাম')}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-10 text-sm pl-9 rounded-xl"
                    />
                    <Building2 className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                {/* Contact Person */}
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Contact Person', 'যোগাযোগকারী ব্যক্তি')}
                    <span className="text-slate-400 font-normal ml-1">({t('common.optional')})</span>
                  </Label>
                  <Input
                    id="contactPerson"
                    placeholder={tBilingual('e.g. Tariqul Islam (Procurement)', 'যেমন: মো: তারিকুল ইসলাম')}
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* 3. CONTACT INFORMATION */}
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile Number * */}
                <div className="space-y-1.5">
                  <Label htmlFor="custMobile" required className="text-xs font-semibold">
                    {tBilingual('Mobile Number', 'মোবাইল নম্বর')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="custMobile"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="h-10 text-sm pl-9 rounded-xl font-mono"
                    />
                    <Phone className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custWhatsapp" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('WhatsApp Number', 'হোয়াটসঅ্যাপ নম্বর')}
                    </Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => {
                          setSameAsMobile(e.target.checked)
                          if (e.target.checked) setWhatsapp(mobile)
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Same as Mobile</span>
                    </label>
                  </div>

                  <div className="relative">
                    <Input
                      id="custWhatsapp"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={whatsapp}
                      disabled={sameAsMobile}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="h-10 text-sm pl-9 rounded-xl font-mono disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                    <MessageSquare className="h-4 w-4 absolute left-3 top-3 text-emerald-500" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="custEmail" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Email Address', 'ইমেইল এড্রেস')}
                    <span className="text-slate-400 font-normal ml-1">({t('common.optional')})</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="custEmail"
                      type="email"
                      placeholder="accounts@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-sm pl-9 rounded-xl"
                    />
                    <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                {/* Alternative Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="custAltPhone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Alternative Phone', 'বিকল্প ফোন / ল্যান্ডলাইন')}
                    <span className="text-slate-400 font-normal ml-1">({t('common.optional')})</span>
                  </Label>
                  <Input
                    id="custAltPhone"
                    type="tel"
                    placeholder="02-XXXXXXX or 01XXXXXXXXX"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    className="h-10 text-sm rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 4. BANGLADESH CASCADING ADDRESS */}
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{tBilingual('Bangladesh Address Details', 'ঠিকানা ও লোকেশন')}</span>
              </div>

              {/* Division, District, Upazila/Thana */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Division */}
                <div className="space-y-1">
                  <Label htmlFor="divSelect" className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Division (বিভাগ)
                  </Label>
                  <select
                    id="divSelect"
                    value={divisionId || ''}
                    onChange={(e) => {
                      const divId = Number(e.target.value) || null
                      setDivisionId(divId)
                      const newDistricts = divId ? GeoService.getDistrictsByDivision(divId) : []
                      setDistrictId(newDistricts[0]?.id || null)
                      setUpazilaId(null)
                    }}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.name_bn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="space-y-1">
                  <Label htmlFor="distSelect" className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    District (জেলা)
                  </Label>
                  <select
                    id="distSelect"
                    value={districtId || ''}
                    onChange={(e) => {
                      const distId = Number(e.target.value) || null
                      setDistrictId(distId)
                      setUpazilaId(null)
                    }}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.name_bn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upazila / Thana */}
                <div className="space-y-1">
                  <Label htmlFor="upazilaSelect" className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Upazila / Thana (থানা)
                  </Label>
                  {upazilas.length > 0 ? (
                    <select
                      id="upazilaSelect"
                      value={upazilaId || ''}
                      onChange={(e) => {
                        setUpazilaId(Number(e.target.value) || null)
                      }}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Thana / Upazila --</option>
                      {upazilas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.name_bn})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="upazilaInput"
                      placeholder="e.g. Sadar / Market Thana"
                      value={customUpazila}
                      onChange={(e) => setCustomUpazila(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Area & Street Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor="custArea" className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Market Area / Landmark (এলাকা)
                  </Label>
                  <Input
                    id="custArea"
                    placeholder="e.g. Fakirapool, Motijheel"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="custAddress" className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Full Street Address (রাস্তা, হোল্ডিং ও বিস্তারিত)
                  </Label>
                  <Input
                    id="custAddress"
                    placeholder="House / Road / Building / Market / Landmark etc."
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 5. EXPANDABLE ADDITIONAL DETAILS SECTION */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 transition-colors text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    {tBilingual(
                      'Additional Details (Category, Rate Level, Credit, Tax)',
                      'অতিরিক্ত তথ্য (ক্যাটাগরি, মূল্য হার, ক্রেডিট লিমিট, ট্যাক্স)'
                    )}
                  </span>
                </div>
                {isAdditionalOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {isAdditionalOpen && (
                <div className="mt-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 animate-in fade-in-0">
                  {/* Category, Rate Level, Payment Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Customer Category */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custCategory" className="text-xs font-semibold">
                        Customer Category
                      </Label>
                      <select
                        id="custCategory"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value="retail">Retail (খুচরা)</option>
                        <option value="corporate">Corporate (কর্পোরেট)</option>
                        <option value="agency">Agency (বিজ্ঞাপনী সংস্থা)</option>
                        <option value="dealer">Dealer / Reseller (ডিলার)</option>
                        <option value="government">Government (সরকারি)</option>
                        <option value="regular">Regular Client (নিয়মিত)</option>
                      </select>
                    </div>

                    {/* Customer Rate Level (Pricing Engine Integration) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custRateLevel" className="text-xs font-semibold">
                        Customer Rate / Price Level
                      </Label>
                      <select
                        id="custRateLevel"
                        value={rateLevel}
                        onChange={(e) => setRateLevel(e.target.value as CustomerRateLevel)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value="default">Default Rate (স্ট্যান্ডার্ড রেট)</option>
                        <option value="retail">Retail Rate</option>
                        <option value="corporate">Corporate Rate (বিশেষ ছাড়)</option>
                        <option value="dealer">Dealer Rate (পাইকারি মূল্য)</option>
                        <option value="custom">Custom Contract Rate</option>
                      </select>
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custTerms" className="text-xs font-semibold">
                        Payment Terms
                      </Label>
                      <select
                        id="custTerms"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value as CustomerPaymentTerms)}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      >
                        <option value="cash_on_delivery">Cash on Delivery (নগদ)</option>
                        <option value="net_7">Net 7 Days</option>
                        <option value="net_15">Net 15 Days</option>
                        <option value="net_30">Net 30 Days</option>
                        <option value="advance_50">50% Advance Required</option>
                      </select>
                    </div>
                  </div>

                  {/* Credit Limit & Tax Information (TIN / BIN) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Credit Limit */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custCreditLimit" className="text-xs font-semibold">
                        Credit Limit (৳ BDT)
                      </Label>
                      <Input
                        id="custCreditLimit"
                        type="number"
                        min="0"
                        step="1000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(Number(e.target.value))}
                        className="h-9 text-xs rounded-lg font-mono font-semibold"
                      />
                    </div>

                    {/* BIN (VAT No) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custBin" className="text-xs font-semibold">
                        BIN / VAT No (মূসক নিবন্ধন)
                      </Label>
                      <Input
                        id="custBin"
                        placeholder="001234567-0101"
                        value={bin}
                        onChange={(e) => setBin(e.target.value)}
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>

                    {/* TIN */}
                    <div className="space-y-1.5">
                      <Label htmlFor="custTin" className="text-xs font-semibold">
                        TIN (ই-টিন নম্বর)
                      </Label>
                      <Input
                        id="custTin"
                        placeholder="123456789012"
                        value={tin}
                        onChange={(e) => setTin(e.target.value)}
                        className="h-9 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Customer Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_TAGS.map((tag) => {
                        const selected = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (selected) handleRemoveTag(tag)
                              else handleAddTag(tag)
                            }}
                            className={cn(
                              'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                              selected
                                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                            )}
                          >
                            {selected ? `✓ ${tag}` : `+ ${tag}`}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom tag (press Enter)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag(tagInput)
                          }
                        }}
                        className="h-8 text-xs rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTag(tagInput)}
                        className="h-8 text-xs shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Notes & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label htmlFor="custNotes" className="text-xs font-semibold">
                        Customer Notes & Preferences
                      </Label>
                      <textarea
                        id="custNotes"
                        rows={2}
                        placeholder="Preferred media, regular delivery instructions, special pricing..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-1">
                      <Label htmlFor="custStatus" className="text-xs font-semibold">
                        Status
                      </Label>
                      <select
                        id="custStatus"
                        value={isActive ? 'active' : 'inactive'}
                        onChange={(e) => setIsActive(e.target.value === 'active')}
                        className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                      >
                        <option value="active">Active (সক্রিয়)</option>
                        <option value="inactive">Inactive (নিষ্ক্রিয়)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SUCCESS DISPLAY */}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* STICKY MODAL FOOTER */}
          <div className="sticky bottom-0 z-20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-5 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11 sm:h-10 px-4 text-xs font-medium rounded-xl cursor-pointer"
            >
              {t('common.cancel')}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 sm:h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{tBilingual('Save Customer', 'কাস্টমার সংরক্ষণ')}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
