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
import { ModalDialog } from '@/components/shared/modal-dialog'
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
import { getProductsAction } from '@/actions/product.actions'
import {
  CustomerRecord,
  CustomerKind,
  CustomerCategory,
  CustomerPaymentTerms,
  DuplicateMatchResult,
} from '@/types/crm.types'
import { ProductRecord } from '@/types/product.types'
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
      getProductsAction(activeCompanyId, true)
        .then((res) => {
          if (res?.data) {
            setProducts(res.data.filter((p) => p.is_active !== false))
          }
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
        address: fullAddress.trim() || area.trim() || null,
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

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'bn' ? 'নতুন কাস্টমার নিবন্ধন' : 'New Customer Registration'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Fast walk-in customer creation, credit limits, delivery addresses, and customer-specific rates
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* Tab Switcher */}
        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              activeTab === 'info'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-950 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <User className="h-3.5 w-3.5" />
            <span>Basic Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              activeTab === 'rates'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-950 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Customer Rates ({Object.keys(customRateOverrides).length} custom)</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Duplicate Matches Alert */}
        {duplicateMatches.length > 0 && !dismissDuplicate && (
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Possible Existing Customer Detected</span>
              </div>
              <button
                type="button"
                onClick={() => setDismissDuplicate(true)}
                className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
              >
                Continue Anyway &rarr;
              </button>
            </div>

            <div className="space-y-1.5">
              {duplicateMatches.map((m) => (
                <div
                  key={m.customer.id}
                  className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.customer.name}
                      </span>
                      {m.customer.company_name && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          • {m.customer.company_name}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {m.customer.mobile} {m.customer.whatsapp ? `• WA: ${m.customer.whatsapp}` : ''}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                      {m.matchReason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onCustomerCreated?.(m.customer)
                        onOpenChange(false)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-7 px-2.5"
                    >
                      Use Existing Customer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: Basic Information */}
        {activeTab === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Section 1: Identity & Category */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Identity & Category
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Customer Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    ref={nameInputRef}
                    required
                    placeholder="e.g. Rahim Chowdhury"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-9 font-medium"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Bangla Name (বাংলা নাম)
                  </Label>
                  <Input
                    placeholder="যেমন: রহিম চৌধুরী"
                    value={nameBn}
                    onChange={(e) => setNameBn(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Customer Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as CustomerCategory)}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="retail">Retail (ওয়াক-ইন / রিটেইল)</option>
                    <option value="reseller">Reseller (রিসেলার / সাব-কন্ট্রাক্টর)</option>
                    <option value="corporate">Corporate (কর্পোরেট একাউন্ট)</option>
                    <option value="agency">Agency (বিজ্ঞাপন সংস্থা / ডিজাইন)</option>
                    <option value="government">Government (সরকারি / দরপত্র)</option>
                    <option value="regular">Regular (নিয়মিত খদ্দের)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">
                    Company Name (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. Apex Media Limited"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Contact Person
                  </Label>
                  <Input
                    placeholder="e.g. Mr. Kabir (Purchase Officer)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Phone */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Contact & Communication
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    required
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold">WhatsApp Number</Label>
                    <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => setSameAsMobile(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 h-3 w-3"
                      />
                      <span>Same as Phone</span>
                    </label>
                  </div>
                  <Input
                    type="tel"
                    disabled={sameAsMobile}
                    placeholder="01XXXXXXXXX"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="text-xs h-9 font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="client@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Location & Address */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Location & Address
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Division</Label>
                  <select
                    value={divisionId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null
                      setDivisionId(id)
                      setDistrictId(null)
                      setUpazilaId(null)
                    }}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="">Select Division</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">District</Label>
                  <select
                    value={districtId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null
                      setDistrictId(id)
                      setUpazilaId(null)
                    }}
                    disabled={!divisionId}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {districts.map((dst) => (
                      <option key={dst.id} value={dst.id}>
                        {dst.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Thana / Upazila</Label>
                  <select
                    value={upazilaId || ''}
                    onChange={(e) => setUpazilaId(e.target.value ? Number(e.target.value) : null)}
                    disabled={!districtId}
                    className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium disabled:opacity-50"
                  >
                    <option value="">Select Thana / Upazila</option>
                    {upazilas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Area / Landmark</Label>
                  <Input
                    placeholder="e.g. Motijheel, Gulshan-1"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">
                    Street Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Holding / Road / Suite details..."
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Collapsible Terms & Tax */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
                className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <span className="uppercase tracking-wider">Credit Terms, Tax IDs & Notes (Optional)</span>
                </div>
                {isAdditionalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isAdditionalOpen && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Credit Limit (৳)</Label>
                      <Input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(Number(e.target.value))}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Payment Terms</Label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value as CustomerPaymentTerms)}
                        className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                      >
                        <option value="cash_on_delivery">Cash On Delivery (ক্যাশ অন ডেলিভারি)</option>
                        <option value="advance_50">50% Advance with Order</option>
                        <option value="net_7">Net 7 Days Credit</option>
                        <option value="net_15">Net 15 Days Credit</option>
                        <option value="net_30">Net 30 Days Credit</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">13-Digit BIN (VAT)</Label>
                      <Input
                        placeholder="e.g. 001234567-0101"
                        value={bin}
                        onChange={(e) => setBin(e.target.value)}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">e-TIN Number</Label>
                      <Input
                        placeholder="e.g. 123456789012"
                        value={tin}
                        onChange={(e) => setTin(e.target.value)}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Internal Notes</Label>
                    <textarea
                      rows={2}
                      placeholder="e.g. VIP client; requires proof approval via WhatsApp..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs min-h-[40px]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving Customer...
                  </>
                ) : (
                  'Save Customer'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: Customer Rates */}
        {activeTab === 'rates' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                Configure special contracted rates for this customer. When creating quotations or invoices, InkFlow automatically pulls these custom rates.
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                Loading products catalog...
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active products found in catalog.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {products.map((prod) => {
                  const customVal = customRateOverrides[prod.id] || ''

                  return (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate bangla-text">
                          {prod.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {prod.sku} • Default: ৳{prod.selling_price}/{prod.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Custom Rate:</span>
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">৳</span>
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
                            className="h-8 pl-6 text-right text-xs font-bold font-mono bg-slate-50 dark:bg-slate-950"
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-mono w-8">
                          /{prod.unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('info')}
                className="text-xs min-h-[40px]"
              >
                Back to Information
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="text-xs min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Customer with Rates'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}
