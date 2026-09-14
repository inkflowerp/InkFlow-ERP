'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  User,
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Send,
  Printer,
  Save,
  Loader2,
  ShieldCheck,
  Tag,
  Truck,
  Wrench,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { useSubscription } from '@/hooks/use-subscription'
import {
  searchQuotationCustomersAction,
  resolveQuotationRatesAction,
  getQuotationProductsAction,
  createQuotationAction,
  sendQuotationAction,
} from '@/actions/quotation.actions'
import { checkCustomerDuplicateAction } from '@/actions/customer.actions'
import {
  QuotationRecord,
  CreateQuotationItemInput,
  CreateQuotationPayload,
  QuotationDeliveryMethod,
  RateSource,
} from '@/types/quotation.types'
import { CustomerRecord, ResolvedProductRate, DuplicateCheckResponse } from '@/types/crm.types'
import { ProductRecord } from '@/types/product.types'
import { DEFAULT_QUOTATION_TERMS, DEFAULT_QUOTATION_TERMS_BN } from '@/types/quotation.types'
import { normalizeBdPhone, formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface NewQuotationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuotationCreated?: (quote: QuotationRecord) => void
  companyId?: string
}

interface ItemFormState extends CreateQuotationItemInput {
  tempId: string
  isSignageProduct?: boolean
}

const DEFAULT_ITEM = (tempId: string): ItemFormState => ({
  tempId,
  product_id: null,
  description: '',
  description_bn: '',
  material_spec: '',
  width: 0,
  height: 0,
  dimension_unit: 'ft',
  quantity: 1,
  unit: 'pcs',
  unit_rate: 0,
  rate_source: 'default',
  finishing: 'None',
  color_spec: '',
  artwork_required: false,
  installation_required: false,
  item_total: 0,
  isSignageProduct: false,
})

export function NewQuotationModal({
  open,
  onOpenChange,
  onQuotationCreated,
  companyId = 'c-01',
}: NewQuotationModalProps) {
  const { locale } = useI18n()
  const { company, currentUser } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()

  // -------------------------------------------------------------
  // CUSTOMER STATE
  // -------------------------------------------------------------
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerRecord[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)

  // Customer Form Fields
  const [customerName, setCustomerName] = useState('')
  const [customerNameBn, setCustomerNameBn] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerWhatsapp, setCustomerWhatsapp] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerType, setCustomerType] = useState<string>('retail')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Duplicate Warning
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResponse | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // -------------------------------------------------------------
  // QUOTATION METADATA
  // -------------------------------------------------------------
  const [quotationDate, setQuotationDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  })
  const [referenceNo, setReferenceNo] = useState('')
  const [salespersonName, setSalespersonName] = useState('')

  // -------------------------------------------------------------
  // ITEMS BUILDER & PRICING
  // -------------------------------------------------------------
  const [items, setItems] = useState<ItemFormState[]>([DEFAULT_ITEM('item-1')])
  const [productsCatalog, setProductsCatalog] = useState<ProductRecord[]>([])
  const [resolvedRatesMap, setResolvedRatesMap] = useState<Map<string, ResolvedProductRate>>(new Map())

  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountPercentValue, setDiscountPercentValue] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(7.5)

  // -------------------------------------------------------------
  // DELIVERY & NOTES
  // -------------------------------------------------------------
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<QuotationDeliveryMethod>('customer_pickup')
  const [installationRequired, setInstallationRequired] = useState(false)

  const [customerNotes, setCustomerNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState(() =>
    locale === 'bn' ? DEFAULT_QUOTATION_TERMS_BN : DEFAULT_QUOTATION_TERMS
  )
  const [internalNotes, setInternalNotes] = useState('')

  // -------------------------------------------------------------
  // UI & SUBMISSION STATE
  // -------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saveSuccessQuote, setSaveSuccessQuote] = useState<QuotationRecord | null>(null)
  const [sendDropdownOpen, setSendDropdownOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null)

  const customerSearchRef = useRef<HTMLDivElement>(null)
  const sendDropdownRef = useRef<HTMLDivElement>(null)
  const effectiveCompanyId = company?.id || companyId

  // Set default salesperson name from authenticated user
  useEffect(() => {
    if (currentUser?.profile?.full_name) {
      setSalespersonName(currentUser.profile.full_name)
    } else if (company?.name) {
      setSalespersonName('Sales Manager')
    }
  }, [currentUser, company])

  // Load products catalog on modal open
  useEffect(() => {
    if (open) {
      getQuotationProductsAction(effectiveCompanyId).then((res) => {
        if (res.success && res.data) {
          setProductsCatalog(res.data)
        }
      })
    }
  }, [open, effectiveCompanyId])

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target as Node)) {
        setSendDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSaveSuccessQuote(null)
      setSubmitError(null)
      setSendSuccessMsg(null)
      setIsSubmitting(false)
      setIsSending(false)
    }
  }, [open])

  // -------------------------------------------------------------
  // DEBOUNCED CUSTOMER SEARCH
  // -------------------------------------------------------------
  useEffect(() => {
    if (selectedCustomer) return
    if (!customerSearchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      const res = await searchQuotationCustomersAction(customerSearchQuery, effectiveCompanyId)
      setIsSearchingCustomers(false)
      if (res.success && res.data) {
        setSearchResults(res.data)
        setShowCustomerDropdown(true)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [customerSearchQuery, selectedCustomer, effectiveCompanyId])

  // Handle Customer Selection
  const handleSelectCustomer = async (cust: CustomerRecord) => {
    setSelectedCustomer(cust)
    setCustomerName(cust.name || '')
    setCustomerNameBn(cust.name_bn || '')
    setCustomerCompany(cust.company_name || '')
    setCustomerPhone(cust.mobile || '')
    setCustomerWhatsapp(cust.whatsapp || cust.mobile || '')
    setCustomerEmail(cust.email || '')
    setCustomerAddress(cust.address || '')
    setCustomerType(cust.customer_type || cust.customer_category || 'retail')
    setShowCustomerDropdown(false)
    setDuplicateWarning(null)

    // Resolve 3-tier rates for this customer
    const res = await resolveQuotationRatesAction(cust.id, effectiveCompanyId)
    if (res.success && res.data) {
      const map = new Map<string, ResolvedProductRate>()
      for (const r of res.data) {
        map.set(r.productId, r)
      }
      setResolvedRatesMap(map)

      // Update existing item rates if products are selected
      setItems((prev) =>
        prev.map((it) => {
          if (it.product_id && map.has(it.product_id)) {
            const resolved = map.get(it.product_id)!
            const newRate = resolved.effectiveRate
            const area = calculateItemArea(it.width || 0, it.height || 0, it.quantity || 1, it.dimension_unit)
            const lineTotal = calculateLineTotal(area, it.quantity || 1, newRate)
            return {
              ...it,
              unit_rate: newRate,
              rate_source: resolved.source,
              area_sft: area,
              item_total: lineTotal,
            }
          }
          return it
        })
      )
    }
  }

  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerSearchQuery('')
    setCustomerName('')
    setCustomerNameBn('')
    setCustomerCompany('')
    setCustomerPhone('')
    setCustomerWhatsapp('')
    setCustomerEmail('')
    setCustomerAddress('')
    setCustomerType('retail')
    setResolvedRatesMap(new Map())
  }

  // Handle New Customer Duplicate Check
  useEffect(() => {
    if (selectedCustomer) {
      setDuplicateWarning(null)
      return
    }

    if (!customerPhone.trim() && !customerName.trim() && !customerCompany.trim()) {
      setDuplicateWarning(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true)
      const res = await checkCustomerDuplicateAction(
        {
          mobile: customerPhone,
          whatsapp: customerWhatsapp,
          name: customerName,
          company_name: customerCompany,
        },
        effectiveCompanyId
      )
      setIsCheckingDuplicate(false)
      if (res.success && res.data && res.data.hasDuplicate) {
        setDuplicateWarning(res.data)
      } else {
        setDuplicateWarning(null)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [selectedCustomer, customerPhone, customerWhatsapp, customerName, customerCompany, effectiveCompanyId])

  // -------------------------------------------------------------
  // PRICING CALCULATIONS
  // -------------------------------------------------------------
  const calculateItemArea = (w: number, h: number, qty: number, dimUnit: 'ft' | 'inch' | 'm' = 'ft') => {
    if (w <= 0 || h <= 0) return 0
    if (dimUnit === 'inch') {
      return Math.round(((w * h) / 144) * qty * 100) / 100
    }
    if (dimUnit === 'm') {
      return Math.round(w * h * 10.7639 * qty * 100) / 100
    }
    return Math.round(w * h * qty * 100) / 100
  }

  const calculateLineTotal = (areaSft: number, qty: number, rate: number) => {
    if (areaSft > 0) {
      return Math.round(areaSft * rate)
    }
    return Math.round(qty * rate)
  }

  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsCatalog.find((p) => p.id === productId)
    if (!prod) return

    const resolved = resolvedRatesMap.get(prod.id)
    const rate = resolved ? resolved.effectiveRate : Number(prod.selling_price) || 0
    const source: RateSource = resolved ? resolved.source : 'default'
    const isSignage =
      prod.category === 'signage_3d' ||
      prod.category === 'rigid_board' ||
      prod.category === 'backlit_flex' ||
      prod.product_type === 'fabrication_service'

    setItems((prev) => {
      const copy = [...prev]
      const current = copy[index]
      const area = calculateItemArea(current.width || 0, current.height || 0, current.quantity || 1, current.dimension_unit)
      const lineTotal = calculateLineTotal(area, current.quantity || 1, rate)

      copy[index] = {
        ...current,
        product_id: prod.id,
        description: current.description || prod.name,
        description_bn: current.description_bn || prod.name_bn || '',
        material_spec: prod.material_spec || current.material_spec || '',
        unit: prod.unit || current.unit || 'pcs',
        unit_rate: rate,
        rate_source: source,
        area_sft: area,
        item_total: lineTotal,
        isSignageProduct: isSignage,
        installation_required: isSignage ? current.installation_required : false,
      }
      return copy
    })
  }

  const handleItemChange = (index: number, field: keyof ItemFormState, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      const item = { ...copy[index], [field]: value }

      if (field === 'unit_rate') {
        item.rate_source = 'override'
      }

      const w = Number(field === 'width' ? value : item.width) || 0
      const h = Number(field === 'height' ? value : item.height) || 0
      const qty = Number(field === 'quantity' ? value : item.quantity) || 1
      const rate = Number(field === 'unit_rate' ? value : item.unit_rate) || 0
      const dimUnit = field === 'dimension_unit' ? value : item.dimension_unit

      const area = calculateItemArea(w, h, qty, dimUnit)
      const lineTotal = calculateLineTotal(area, qty, rate)

      item.area_sft = area
      item.item_total = lineTotal
      copy[index] = item
      return copy
    })
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, DEFAULT_ITEM(`item-${Date.now()}`)])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Summary Totals
  const calculatedSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.item_total) || 0), 0)
  }, [items])

  const effectiveDiscountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((calculatedSubtotal * Math.min(100, Math.max(0, discountPercentValue))) / 100)
    }
    return Math.min(calculatedSubtotal, Math.max(0, discountAmount))
  }, [calculatedSubtotal, discountType, discountPercentValue, discountAmount])

  const subtotalAfterDiscount = useMemo(() => {
    return Math.max(0, calculatedSubtotal - effectiveDiscountAmount)
  }, [calculatedSubtotal, effectiveDiscountAmount])

  const calculatedVat = useMemo(() => {
    return Math.round((subtotalAfterDiscount * Math.max(0, vatRate)) / 100)
  }, [subtotalAfterDiscount, vatRate])

  const calculatedGrandTotal = useMemo(() => {
    return subtotalAfterDiscount + calculatedVat
  }, [subtotalAfterDiscount, calculatedVat])

  // Form Validation
  const validateForm = (): string | null => {
    const finalName = selectedCustomer ? selectedCustomer.name : customerName
    if (!finalName || !finalName.trim()) {
      return 'Customer Name is required.'
    }

    const finalPhone = selectedCustomer ? selectedCustomer.mobile : customerPhone
    if (!finalPhone || !finalPhone.trim()) {
      return 'Customer Phone Number is required.'
    }

    const digits = finalPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      return 'Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX).'
    }

    if (!items || items.length === 0) {
      return 'Quotation must have at least one valid line item.'
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.description || !it.description.trim()) {
        return `Item #${i + 1} description is required.`
      }
      if (!it.quantity || it.quantity < 1) {
        return `Item #${i + 1} quantity must be at least 1.`
      }
      if (typeof it.unit_rate !== 'number' || it.unit_rate < 0) {
        return `Item #${i + 1} rate must be 0 or higher.`
      }
    }

    return null
  }

  // Build Creation Payload
  const buildPayload = (): CreateQuotationPayload => {
    const finalItems: CreateQuotationItemInput[] = items.map((it) => ({
      product_id: it.product_id || undefined,
      description: it.description.trim(),
      description_bn: it.description_bn?.trim() || undefined,
      material_spec: it.material_spec?.trim() || undefined,
      width: Number(it.width) || 0,
      height: Number(it.height) || 0,
      dimension_unit: it.dimension_unit || 'ft',
      area_sft: Number(it.area_sft) || 0,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit: it.unit || 'pcs',
      unit_rate: Number(it.unit_rate) || 0,
      rate_source: it.rate_source || 'default',
      finishing: it.finishing || undefined,
      color_spec: it.color_spec || undefined,
      artwork_required: it.artwork_required || false,
      installation_required: it.installation_required || false,
      item_total: Number(it.item_total) || 0,
    }))

    if (selectedCustomer) {
      return {
        customer_id: selectedCustomer.id,
        customer_name: customerName.trim() || selectedCustomer.name,
        customer_name_bn: customerNameBn.trim() || selectedCustomer.name_bn || undefined,
        customer_company: customerCompany.trim() || selectedCustomer.company_name || undefined,
        customer_phone: customerPhone.trim() || selectedCustomer.mobile,
        customer_whatsapp: customerWhatsapp.trim() || selectedCustomer.whatsapp || undefined,
        customer_email: customerEmail.trim() || selectedCustomer.email || undefined,
        customer_address: customerAddress.trim() || selectedCustomer.address || undefined,
        customer_type: customerType || selectedCustomer.customer_type || 'retail',
        quotation_date: quotationDate,
        valid_until: validUntil,
        reference_no: referenceNo.trim() || undefined,
        salesperson_name: salespersonName.trim() || currentUser?.profile?.full_name || 'Sales Representative',
        items: finalItems,
        discount_amount: effectiveDiscountAmount,
        vat_rate: vatRate,
        delivery_date: deliveryDate || undefined,
        delivery_location: deliveryLocation.trim() || undefined,
        delivery_method: deliveryMethod,
        installation_required: installationRequired,
        notes: customerNotes.trim() || undefined,
        terms_and_conditions: termsAndConditions.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
        language_mode: locale === 'bn' ? 'bn' : 'en',
      }
    }

    return {
      new_customer: {
        name: customerName.trim(),
        company_name: customerCompany.trim() || undefined,
        mobile: customerPhone.trim(),
        whatsapp: customerWhatsapp.trim() || undefined,
        email: customerEmail.trim() || undefined,
        address: customerAddress.trim() || 'Dhaka, Bangladesh',
        customer_type: (customerType as any) || 'retail',
        save_customer: saveCustomer,
      },
      customer_name: customerName.trim(),
      customer_name_bn: customerNameBn.trim() || undefined,
      customer_company: customerCompany.trim() || undefined,
      customer_phone: customerPhone.trim(),
      customer_whatsapp: customerWhatsapp.trim() || undefined,
      customer_email: customerEmail.trim() || undefined,
      customer_address: customerAddress.trim() || undefined,
      customer_type: customerType || 'retail',
      quotation_date: quotationDate,
      valid_until: validUntil,
      reference_no: referenceNo.trim() || undefined,
      salesperson_name: salespersonName.trim() || currentUser?.profile?.full_name || 'Sales Representative',
      items: finalItems,
      discount_amount: effectiveDiscountAmount,
      vat_rate: vatRate,
      delivery_date: deliveryDate || undefined,
      delivery_location: deliveryLocation.trim() || undefined,
      delivery_method: deliveryMethod,
      installation_required: installationRequired,
      notes: customerNotes.trim() || undefined,
      terms_and_conditions: termsAndConditions.trim() || undefined,
      internal_notes: internalNotes.trim() || undefined,
      language_mode: locale === 'bn' ? 'bn' : 'en',
    }
  }

  // Handle Save
  const handleSave = async (): Promise<QuotationRecord | null> => {
    const valErr = validateForm()
    if (valErr) {
      setSubmitError(valErr)
      return null
    }

    const quotaCheck = checkCanCreate('monthly_orders')
    if (!quotaCheck.allowed) {
      openLimitExceededModal('monthly_orders')
      return null
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = buildPayload()
      const res = await createQuotationAction(payload, effectiveCompanyId)

      if (!res.success || !res.data) {
        setSubmitError(res.error || 'Failed to create quotation. Please try again.')
        setIsSubmitting(false)
        return null
      }

      const savedQuote = res.data
      setSaveSuccessQuote(savedQuote)
      refreshUsage()
      if (onQuotationCreated) {
        onQuotationCreated(savedQuote)
      }
      setIsSubmitting(false)
      return savedQuote
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save quotation.')
      setIsSubmitting(false)
      return null
    }
  }

  // Handle Print Action (Saves first)
  const handlePrint = async () => {
    let quoteToPrint = saveSuccessQuote
    if (!quoteToPrint) {
      quoteToPrint = await handleSave()
    }
    if (!quoteToPrint) return

    const slug = company?.slug || 'app'
    window.open(`/${slug}/quotations/${quoteToPrint.id}?print=true`, '_blank')
  }

  // Handle Send Action (Saves first)
  const handleSend = async (channel: 'whatsapp' | 'email', format: 'pdf' | 'text' = 'pdf') => {
    setSendDropdownOpen(false)
    let quoteToSend = saveSuccessQuote
    if (!quoteToSend) {
      quoteToSend = await handleSave()
    }
    if (!quoteToSend) return

    setIsSending(true)
    setSendSuccessMsg(null)

    try {
      const res = await sendQuotationAction(
        {
          quotationId: quoteToSend.id,
          channel,
          format,
        },
        effectiveCompanyId
      )

      setIsSending(false)
      if (res.success) {
        setSendSuccessMsg(
          channel === 'whatsapp'
            ? `Quotation #${quoteToSend.quotation_number} dispatched to WhatsApp (${quoteToSend.customer_phone}).`
            : `Quotation #${quoteToSend.quotation_number} emailed with PDF attachment to ${quoteToSend.customer_email || quoteToSend.customer_name}.`
        )

        if (channel === 'whatsapp') {
          if (res.data?.whatsappUrl) {
            window.open(res.data.whatsappUrl, '_blank')
          } else {
            const rawPhone = quoteToSend.customer_whatsapp || quoteToSend.customer_phone
            const clean = rawPhone.replace(/\D/g, '')
            const text = encodeURIComponent(
              `Hello ${quoteToSend.customer_name},\nHere is your official quotation #${quoteToSend.quotation_number} from ${company?.name || 'InkFlow'}.\nTotal: ৳${quoteToSend.grand_total} (Valid until ${quoteToSend.valid_until}).\nPlease review and let us know your confirmation.`
            )
            window.open(`https://wa.me/${clean}?text=${text}`, '_blank')
          }
        }
      } else {
        setSubmitError(`Quotation saved, but ${channel} sending failed: ${res.error}`)
      }
    } catch (err: any) {
      setIsSending(false)
      setSubmitError(`Quotation saved, but sending encountered an error: ${err?.message}`)
    }
  }

  const getRateSourceBadge = (source?: RateSource) => {
    switch (source) {
      case 'custom':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
            Custom Rate
          </Badge>
        )
      case 'last_invoice':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-bold">
            Last Invoice Rate
          </Badge>
        )
      case 'override':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
            Manual Override
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
            Catalog Rate
          </Badge>
        )
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'bn' ? 'নতুন কোটেশন তৈরি করুন' : 'New Quotation'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Easier than Excel • Faster than paper • More organized than WhatsApp
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-5 pt-1 pb-2">
        {/* Save Success Alert Banner */}
        {saveSuccessQuote && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Quotation #{saveSuccessQuote.quotation_number} Saved!</strong> Grand Total: ৳{formatBDT(saveSuccessQuote.grand_total)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="h-7 text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-700"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              View & Print PDF
            </Button>
          </div>
        )}

        {/* Communication Status Banner */}
        {sendSuccessMsg && (
          <div className="p-3 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 rounded-xl border border-blue-200 dark:border-blue-800 text-xs flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{sendSuccessMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {submitError && (
          <div className="p-3.5 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 rounded-xl border border-red-300 dark:border-red-800 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Action Alert</span>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: CUSTOMER
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Customer Information
              </h3>
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <UserCheck className="h-3.5 w-3.5" />
                  Existing Customer Linked
                </span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Unified Customer Search & Autocomplete */}
          <div className="relative" ref={customerSearchRef}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Customer Name & Instant Lookup */}
              <div className="relative">
                <Label htmlFor="custNameInput" className="text-xs font-semibold mb-1 block">
                  Customer Name <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="custNameInput"
                    placeholder="Search or enter customer name..."
                    value={selectedCustomer ? customerName : customerSearchQuery || customerName}
                    onChange={(e) => {
                      const val = e.target.value
                      if (selectedCustomer) {
                        setCustomerName(val)
                      } else {
                        setCustomerSearchQuery(val)
                        setCustomerName(val)
                        setShowCustomerDropdown(true)
                      }
                    }}
                    onFocus={() => {
                      if (!selectedCustomer && searchResults.length > 0) {
                        setShowCustomerDropdown(true)
                      }
                    }}
                    className="text-xs h-9 pr-8 font-medium"
                  />
                  {isSearchingCustomers && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showCustomerDropdown && !selectedCustomer && searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="p-3 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {cust.name} {cust.name_bn && <span className="font-normal text-slate-500">({cust.name_bn})</span>}
                          </div>
                          {cust.company_name && (
                            <div className="text-[11px] text-slate-500 font-medium">🏢 {cust.company_name}</div>
                          )}
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                            📞 {cust.mobile}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {cust.customer_type || cust.customer_category || 'Retail'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Company Name */}
              <div>
                <Label htmlFor="custCompanyInput" className="text-xs font-semibold mb-1 block">
                  Company Name
                </Label>
                <Input
                  id="custCompanyInput"
                  placeholder="e.g. Acme Advertising Ltd."
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="custPhoneInput" className="text-xs font-semibold mb-1 block">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="custPhoneInput"
                  placeholder="017XXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    if (!selectedCustomer) {
                      setCustomerSearchQuery(e.target.value)
                    }
                  }}
                  className="text-xs h-9 font-mono"
                />
              </div>

              {/* WhatsApp Number */}
              <div>
                <Label htmlFor="custWAInput" className="text-xs font-semibold mb-1 block">
                  WhatsApp Number
                </Label>
                <Input
                  id="custWAInput"
                  placeholder="018XXXXXXXX"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              {/* Customer Type */}
              <div>
                <Label htmlFor="custTypeSelect" className="text-xs font-semibold mb-1 block">
                  Customer Type <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="custTypeSelect"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="retail">Retail (খুচরা)</option>
                  <option value="reseller">Reseller (রিসেলার)</option>
                  <option value="corporate">Corporate (কর্পোরেট)</option>
                  <option value="government">Government (সরকারি)</option>
                </select>
              </div>

              {/* Email Address */}
              <div>
                <Label htmlFor="custEmailInput" className="text-xs font-semibold mb-1 block">
                  Email Address
                </Label>
                <Input
                  id="custEmailInput"
                  type="email"
                  placeholder="client@domain.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Address & Save Customer Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-1">
              <div className="sm:col-span-2">
                <Label htmlFor="custAddressInput" className="text-xs font-semibold mb-1 block">
                  Address
                </Label>
                <Input
                  id="custAddressInput"
                  placeholder="e.g. 14 Motijheel C/A, Dhaka"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {!selectedCustomer && (
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="saveCustCheck"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="saveCustCheck" className="text-xs font-semibold cursor-pointer">
                    Save customer to database
                  </Label>
                </div>
              )}
            </div>

            {/* Duplicate Detection Alert */}
            {duplicateWarning && duplicateWarning.matches.length > 0 && !selectedCustomer && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Existing Customer Found</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Profile matches <strong>{duplicateWarning.matches[0].customer.name}</strong> (
                  {duplicateWarning.matches[0].customer.mobile}
                  {duplicateWarning.matches[0].customer.company_name ? ` • ${duplicateWarning.matches[0].customer.company_name}` : ''}).
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSelectCustomer(duplicateWarning.matches[0].customer)}
                  className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                >
                  Use Existing Customer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: QUOTATION INFORMATION
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quotation Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <Label htmlFor="quoteDate" className="text-xs font-semibold mb-1 block">
                Quotation Date
              </Label>
              <Input
                id="quoteDate"
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label htmlFor="validUntil" className="text-xs font-semibold mb-1 block">
                Valid Until
              </Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label htmlFor="refNo" className="text-xs font-semibold mb-1 block">
                Reference / PO #
              </Label>
              <Input
                id="refNo"
                placeholder="e.g. PO-9842"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label htmlFor="salesperson" className="text-xs font-semibold mb-1 block">
                Prepared By / Salesperson
              </Label>
              <Input
                id="salesperson"
                placeholder="Sales Representative"
                value={salespersonName}
                onChange={(e) => setSalespersonName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: ITEM SECTION (MULTI-ITEM BUILDER)
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quotation Items ({items.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3.5">
            {items.map((item, index) => (
              <div
                key={item.tempId}
                className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                      Item #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.description || 'Line Item Specification'}
                    </span>
                    {getRateSourceBadge(item.rate_source)}
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                {/* Product Catalog & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">Product Catalog</Label>
                    <select
                      value={item.product_id || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Select Product --</option>
                      {productsCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit}) - ৳{p.selling_price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold mb-1 block">
                      Item Description <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Star Flex Billboard 40ft × 20ft with Eyelets"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Dimensions, Qty, Unit, Rate */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Width</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={item.width || ''}
                      onChange={(e) => handleItemChange(index, 'width', parseFloat(e.target.value) || 0)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Height</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={item.height || ''}
                      onChange={(e) => handleItemChange(index, 'height', parseFloat(e.target.value) || 0)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Dim. Unit</Label>
                    <select
                      value={item.dimension_unit}
                      onChange={(e) => handleItemChange(index, 'dimension_unit', e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="ft">ft (ফুট)</option>
                      <option value="inch">inch (ইঞ্চি)</option>
                      <option value="m">m (মিটার)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Rate (৳)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={item.unit_rate || ''}
                      onChange={(e) => handleItemChange(index, 'unit_rate', parseFloat(e.target.value) || 0)}
                      className="text-xs h-9 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold mb-1 block">Finishing</Label>
                    <select
                      value={item.finishing || 'None'}
                      onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                      className="w-full h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="None">None</option>
                      <option value="Eyelets / Grommets">Eyelets / রিং</option>
                      <option value="Gloss Lamination">Gloss Lamination</option>
                      <option value="Matte Lamination">Matte Lamination</option>
                      <option value="Board Mount">PVC Board Mount</option>
                      <option value="Pocket & Pipe">Pocket & Pipe</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Signage / Print Fields */}
                {item.isSignageProduct && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <Label className="text-[11px] font-semibold mb-1 block">Material Spec</Label>
                      <Input
                        placeholder="e.g. 3mm Cast Acrylic, 280 GSM"
                        value={item.material_spec || ''}
                        onChange={(e) => handleItemChange(index, 'material_spec', e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id={`install-${index}`}
                        checked={item.installation_required}
                        onChange={(e) => handleItemChange(index, 'installation_required', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <Label htmlFor={`install-${index}`} className="text-xs cursor-pointer">
                        Installation Required at Site
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id={`art-${index}`}
                        checked={item.artwork_required}
                        onChange={(e) => handleItemChange(index, 'artwork_required', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <Label htmlFor={`art-${index}`} className="text-xs cursor-pointer">
                        Design / Artwork Required
                      </Label>
                    </div>
                  </div>
                )}

                {/* Line Calculation Summary */}
                <div className="flex items-center justify-between text-xs pt-1.5 px-1 text-slate-500 font-medium">
                  <span>
                    {(item.area_sft || 0) > 0 ? (
                      <>
                        Area: <strong>{item.area_sft} sft</strong> ({item.width}ft × {item.height}ft × {item.quantity})
                      </>
                    ) : (
                      <>
                        Quantity: <strong>{item.quantity} {item.unit}</strong>
                      </>
                    )}
                  </span>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 mr-2">Line Total:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      ৳ {Number(item.item_total).toLocaleString('en-BD')}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Item Button below items */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="w-full h-9 text-xs font-bold gap-1.5 text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: PRICING SUMMARY
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pricing Summary
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Discount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">Overall Discount</Label>
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={cn(
                      'px-1.5 py-0.5 rounded cursor-pointer',
                      discountType === 'fixed'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    )}
                  >
                    ৳ BDT
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={cn(
                      'px-1.5 py-0.5 rounded cursor-pointer',
                      discountType === 'percent'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    )}
                  >
                    %
                  </button>
                </div>
              </div>
              {discountType === 'fixed' ? (
                <Input
                  type="number"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="text-xs h-9 font-mono"
                />
              ) : (
                <Input
                  type="number"
                  placeholder="0 %"
                  value={discountPercentValue || ''}
                  onChange={(e) => setDiscountPercentValue(parseFloat(e.target.value) || 0)}
                  className="text-xs h-9 font-mono"
                />
              )}
            </div>

            {/* VAT Rate */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">VAT Rate (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Grand Total Display Box */}
            <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl flex flex-col justify-between shadow-md">
              <div className="flex justify-between text-xs text-blue-100 font-medium">
                <span>Subtotal: ৳{calculatedSubtotal.toLocaleString('en-BD')}</span>
                <span>VAT: +৳{calculatedVat.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-white/15">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Grand Total:</span>
                <span className="text-xl font-black font-mono">৳ {calculatedGrandTotal.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 5: DELIVERY & LOGISTICS
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              5
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Delivery & Logistics
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <Label htmlFor="delDate" className="text-xs font-semibold mb-1 block">
                Expected Delivery Date
              </Label>
              <Input
                id="delDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label htmlFor="delMethod" className="text-xs font-semibold mb-1 block">
                Delivery Method
              </Label>
              <select
                id="delMethod"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as QuotationDeliveryMethod)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="customer_pickup">Customer Pickup (গ্রাহক পিকআপ)</option>
                <option value="company_delivery">Company Delivery (আমাদের ডেলিভারি)</option>
                <option value="courier">Courier / Parcel (কুরিয়ার সার্ভিস)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="delLoc" className="text-xs font-semibold mb-1 block">
                Delivery Location
              </Label>
              <Input
                id="delLoc"
                placeholder="e.g. Uttara Sector 4, Dhaka"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 6: NOTES & TERMS
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              6
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Notes & Terms
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="custNotes" className="text-xs font-semibold mb-1 block">
                Customer Notes (Printed)
              </Label>
              <textarea
                id="custNotes"
                rows={3}
                placeholder="Notes visible on customer quotation document..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="termsCond" className="text-xs font-semibold mb-1 block">
                Terms & Conditions
              </Label>
              <textarea
                id="termsCond"
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label htmlFor="intNotes" className="text-xs text-amber-800 dark:text-amber-300 font-bold block">
                  Internal Notes
                </Label>
                <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-1.5 py-0.2 rounded font-bold">
                  Private / Staff Only
                </span>
              </div>
              <textarea
                id="intNotes"
                rows={3}
                placeholder="Private cost estimates, vendor notes, internal margins..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 7: ACTIONS BAR (SAVE-FIRST GUARANTEE)
           ========================================================================= */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs min-h-[40px]"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Print Button (Saves first) */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={isSubmitting || isSending}
              className="flex-1 sm:flex-initial text-xs min-h-[40px] border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="h-4 w-4 mr-1.5 text-slate-600 dark:text-slate-400" />
              Print
            </Button>

            {/* Send Dropdown Menu (Saves first) */}
            <div className="relative flex-1 sm:flex-initial" ref={sendDropdownRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSendDropdownOpen(!sendDropdownOpen)}
                disabled={isSubmitting || isSending}
                className="w-full text-xs min-h-[40px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1.5" />
                )}
                Send
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>

              {sendDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="p-1.5 font-bold text-slate-400 uppercase text-[10px]">
                    WhatsApp Direct
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleSend('whatsapp', 'pdf')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-lg cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Send WhatsApp</div>
                        <div className="text-[10px] text-slate-400">Message with document link</div>
                      </div>
                    </button>
                  </div>

                  <div className="p-1.5 font-bold text-slate-400 uppercase text-[10px]">
                    Email Proposal
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => handleSend('email', 'pdf')}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-lg cursor-pointer"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Send Email with PDF</div>
                        <div className="text-[10px] text-slate-400">Formal PDF attachment</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Quotation Primary Button */}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || isSending}
              className="flex-1 sm:flex-initial text-xs min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Quotation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
