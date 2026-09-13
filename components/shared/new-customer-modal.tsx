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
import { useSubscription } from '@/hooks/use-subscription'
import { GeoService } from '@/services/geo.service'
import {
  createCustomerAction,
  checkCustomerDuplicateAction,
  saveCustomerRateAction,
} from '@/actions/customer.actions'
import {
  CustomerRecord,
  CustomerKind,
  CustomerCategory,
  CustomerRateLevel,
  CustomerPaymentTerms,
  DuplicateMatchResult,
} from '@/types/crm.types'
import { ProductRecord } from '@/types/product.types'
import { ProductService } from '@/services/product.service'
import { cn } from '@/lib/utils'

export interface NewCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: (customer: CustomerRecord) => void
  initialName?: string
  initialPhone?: string
  companyId?: string
}

export function NewCustomerModal({
  open,
  onOpenChange,
  onCustomerCreated,
  initialName = '',
  initialPhone = '',
  companyId = 'c-01',
}: NewCustomerModalProps) {
  const { tBilingual, locale } = useI18n()
  const { company } = useTenant()
  const { hasPermission } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'info' | 'rates'>('info')

  // 1. Basic Information
  const [name, setName] = useState<string>(initialName)
  const [nameBn, setNameBn] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [contactPerson, setContactPerson] = useState<string>('')
  const [customerType, setCustomerType] = useState<CustomerCategory>('retail')

  // 2. Contact Information
  const [mobile, setMobile] = useState<string>(initialPhone)
  const [whatsapp, setWhatsapp] = useState<string>('')
  const [sameAsMobile, setSameAsMobile] = useState<boolean>(true)
  const [email, setEmail] = useState<string>('')

  // 3. Address
  const [divisionId, setDivisionId] = useState<number | null>(1) // Dhaka
  const [districtId, setDistrictId] = useState<number | null>(1) // Dhaka
  const [upazilaId, setUpazilaId] = useState<number | null>(null)
  const [area, setArea] = useState<string>('')
  const [fullAddress, setFullAddress] = useState<string>('')

  // 4. Additional Terms & Limits
  const [isAdditionalOpen, setIsAdditionalOpen] = useState<boolean>(false)
  const [paymentTerms, setPaymentTerms] = useState<CustomerPaymentTerms>('cash_on_delivery')
  const [creditLimit, setCreditLimit] = useState<number>(0)
  const [tin, setTin] = useState<string>('')
  const [bin, setBin] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // 5. Products & Custom Rates
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customRateOverrides, setCustomRateOverrides] = useState<Record<string, string>>({})
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false)

  // 6. Duplicate Detection & Submitting
  const [isSearchingDuplicate, setIsSearchingDuplicate] = useState<boolean>(false)
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatchResult[]>([])
  const [dismissDuplicate, setDismissDuplicate] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Geo cascading
  const divisions = useMemo(() => GeoService.getDivisions(), [])
  const districts = useMemo(() => {
    return divisionId ? GeoService.getDistrictsByDivision(divisionId) : []
  }, [divisionId])
  const upazilas = useMemo(() => {
    return districtId ? GeoService.getUpazilasByDistrict(districtId) : []
  }, [districtId])

  // Load products catalog for rate setup
  useEffect(() => {
    if (open) {
      const activeCompanyId = company?.id || companyId
      setIsLoadingProducts(true)
      ProductService.getProducts(activeCompanyId)
        .then((list) => {
          setProducts(list.filter((p) => p.is_active !== false))
        })
        .catch(() => {})
        .finally(() => setIsLoadingProducts(false))
    }
  }, [open, company?.id, companyId])

  // Reset and focus when modal opens
  useEffect(() => {
    if (open) {
      setName(initialName || '')
      setMobile(initialPhone || '')
      setWhatsapp(initialPhone || '')
      setSameAsMobile(true)
      setDismissDuplicate(false)
      setDuplicateMatches([])
      setErrorMessage(null)
      setIsSubmitting(false)
      setActiveTab('info')
      setCustomRateOverrides({})

      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [open, initialName, initialPhone])

  // Keep WhatsApp synced if "Same as Mobile" is checked
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

    if (trimmedMobile.length < 5 && trimmedName.length < 3 && trimmedCompany.length < 3) {
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
  }, [mobile, whatsapp, name, companyName, open, dismissDuplicate, company?.id, companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Plan check
    const quota = checkCanCreate('max_customers')
    if (!quota.allowed) {
      openLimitExceededModal('max_customers')
      return
    }

    if (!name.trim()) {
      setErrorMessage('Customer Name is required.')
      setActiveTab('info')
      return
    }

    if (!mobile.trim()) {
      setErrorMessage('Mobile Phone Number is required.')
      setActiveTab('info')
      return
    }

    if (!fullAddress.trim() && !area.trim()) {
      setErrorMessage('Address is required.')
      setActiveTab('info')
      return
    }

    setIsSubmitting(true)
    const activeCompanyId = company?.id || companyId

    try {
      const res = await createCustomerAction({
        company_id: activeCompanyId,
        name: name.trim(),
        name_bn: nameBn.trim() || null,
        company_name: companyName.trim() || null,
        contact_person: contactPerson.trim() || null,
        customer_category: customerType,
        customer_kind: companyName.trim() ? 'business' : 'individual',
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        division_id: divisionId,
        district_id: districtId,
        upazila_id: upazilaId,
        area: area.trim() || null,
        address: fullAddress.trim() || area.trim(),
        payment_terms: paymentTerms,
        credit_limit: creditLimit,
        tin_no: tin.trim() || null,
        bin_no: bin.trim() || null,
        notes: notes.trim() || null,
        is_active: true,
      })

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to create customer.')
        setIsSubmitting(false)
        return
      }

      const createdCustomer = res.data

      // Save custom rates if configured in modal
      const rateEntries = Object.entries(customRateOverrides)
      for (const [prodId, rateStr] of rateEntries) {
        const rateNum = parseFloat(rateStr)
        if (!isNaN(rateNum) && rateNum >= 0) {
          try {
            await saveCustomerRateAction(createdCustomer.id, prodId, rateNum, 'Configured during customer registration', activeCompanyId)
          } catch {
            // Non-blocking rate save failure
          }
        }
      }

      refreshUsage()
      onCustomerCreated?.(createdCustomer)
      onOpenChange(false)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error creating customer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-bold">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tBilingual('New Customer', 'নতুন কাস্টমার')}
              </h2>
              <p className="text-xs text-slate-500">
                Register customer, contact details, and custom product pricing
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-5 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              'py-2 px-3.5 font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Basic Information *</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={cn(
              'py-2 px-3.5 font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'rates'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Customer Rates ({Object.keys(customRateOverrides).length} custom)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Duplicate Matches Alert */}
          {duplicateMatches.length > 0 && !dismissDuplicate && (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Possible Duplicate Customer Detected</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissDuplicate(true)}
                  className="text-[11px] font-semibold text-amber-700 underline"
                >
                  Dismiss
                </button>
              </div>

              <div className="space-y-1">
                {duplicateMatches.map((m) => (
                  <div
                    key={m.customer.id}
                    className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white bangla-text">
                        {m.customer.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-mono text-xs">
                        ({m.customer.mobile})
                      </span>
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium bangla-text">
                        {m.matchReason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: Basic Information */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Row 1: Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Customer Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    ref={nameInputRef}
                    required
                    placeholder="e.g. Rahim Chowdhury"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Customer Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as CustomerCategory)}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-medium"
                  >
                    <option value="retail">Retail (ওয়াক-ইন / রিটেইল)</option>
                    <option value="reseller">Reseller (রিসেলার / সাব-কন্ট্রাক্টর)</option>
                    <option value="corporate">Corporate (কর্পোরেট একাউন্ট)</option>
                    <option value="agency">Agency (বিজ্ঞাপন সংস্থা / ডিজাইন)</option>
                    <option value="government">Government (সরকারি / দরপত্র)</option>
                    <option value="regular">Regular (নিয়মিত খদ্দের)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Bangla Name & Company Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Company Name (Optional)
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="e.g. Apex Media Limited"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Bangla Name (বাংলা নাম)
                  </Label>
                  <Input
                    placeholder="যেমন: রহিম চৌধুরী"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Row 3: Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      required
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      WhatsApp Number
                    </Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => setSameAsMobile(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span>Same as Phone</span>
                    </label>
                  </div>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                    <Input
                      type="tel"
                      disabled={sameAsMobile}
                      placeholder="01XXXXXXXXX"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="pl-9 text-xs h-9 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Email & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Contact Person
                  </Label>
                  <Input
                    placeholder="e.g. Mr. Kabir (Purchase Officer)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="client@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: BD Address Picker */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <Label className="text-xs font-semibold">
                  Address & Area <span className="text-rose-500">*</span>
                </Label>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Division */}
                  <select
                    value={divisionId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null
                      setDivisionId(id)
                      setDistrictId(null)
                      setUpazilaId(null)
                    }}
                    className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs"
                  >
                    <option value="">Select Division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  {/* District */}
                  <select
                    value={districtId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null
                      setDistrictId(id)
                      setUpazilaId(null)
                    }}
                    disabled={!divisionId}
                    className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {districts.map((dst) => (
                      <option key={dst.id} value={dst.id}>
                        {dst.name}
                      </option>
                    ))}
                  </select>

                  {/* Upazila */}
                  <select
                    value={upazilaId || ''}
                    onChange={(e) => setUpazilaId(e.target.value ? Number(e.target.value) : null)}
                    disabled={!districtId}
                    className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs disabled:opacity-50"
                  >
                    <option value="">Select Thana / Upazila</option>
                    {upazilas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Input
                    placeholder="Specific Area / Landmark (e.g. Motijheel, Gulshan-1)"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="Street / Holding Address (English or বাংলা)"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Collapsible Additional Details */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span>Credit Limits, Payment Terms & Tax IDs (Optional)</span>
                  </div>
                  {isAdditionalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isAdditionalOpen && (
                  <div className="p-3.5 space-y-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">Credit Limit (BDT)</Label>
                        <Input
                          type="number"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(Number(e.target.value))}
                          className="text-xs h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">Payment Terms</Label>
                        <select
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value as CustomerPaymentTerms)}
                          className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs"
                        >
                          <option value="cash_on_delivery">Cash On Delivery (ক্যাশ অন ডেলিভারি)</option>
                          <option value="advance_50">50% Advance with Order</option>
                          <option value="net_7">Net 7 Days Credit</option>
                          <option value="net_15">Net 15 Days Credit</option>
                          <option value="net_30">Net 30 Days Credit</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">13-Digit BIN (NBR VAT)</Label>
                        <Input
                          placeholder="e.g. 001234567-0101"
                          value={bin}
                          onChange={(e) => setBin(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600">e-TIN Number</Label>
                        <Input
                          placeholder="e.g. 123456789012"
                          value={tin}
                          onChange={(e) => setTin(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Internal Account Notes</Label>
                      <textarea
                        rows={2}
                        placeholder="e.g. VIP client referred by Chairman; requires proof approval via WhatsApp..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Customer Rates */}
          {activeTab === 'rates' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  Configure special unit prices for this customer. If left blank, the system automatically falls back to the customer&apos;s <strong>Last Valid Invoice Rate</strong> or catalog <strong>Default Rate</strong>.
                </div>
              </div>

              {isLoadingProducts ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading products catalog...
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No active products found in catalog.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {products.map((prod) => {
                    const customVal = customRateOverrides[prod.id] || ''

                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate bangla-text">
                            {prod.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {prod.sku} • Default: ৳{prod.selling_price}/{prod.unit}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Customer Rate:</span>
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={String(prod.selling_price)}
                              value={customVal}
                              onChange={(e) => {
                                const val = e.target.value
                                setCustomRateOverrides((prev) => {
                                  const updated = { ...prev }
                                  if (val === '') {
                                    delete updated[prod.id]
                                  } else {
                                    updated[prod.id] = val
                                  }
                                  return updated
                                })
                              }}
                              className="h-8 pl-6 text-right text-xs font-bold bg-white dark:bg-slate-950"
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-mono w-6">
                            /{prod.unit}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold h-9 px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving Customer...
                </>
              ) : (
                'Save Customer Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
