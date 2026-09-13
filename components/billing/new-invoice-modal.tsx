'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  MessageSquare,
  Mail,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  UserCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'
import { InvoiceRecord } from '@/types/billing.types'
import { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  searchInvoiceCustomersAction,
  resolveCustomerPricingAction,
  createInvoiceAction,
  sendInvoiceAction,
  getInvoiceProductsAction,
  CreateInvoiceItemInput,
} from '@/actions/billing.actions'

export interface NewInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCustomerId?: string
  onInvoiceCreated?: (invoice: InvoiceRecord) => void
}

interface ItemRowState {
  id: string
  productId?: string
  itemName: string
  width: string
  height: string
  quantity: number
  unit: string
  rate: number
  finishing: string
  rateSource?: 'custom' | 'last_invoice' | 'default' | 'manual'
  isManualRate?: boolean
}

const FINISHING_OPTIONS = [
  'None',
  'Cutting',
  'Eyelet',
  'Lamination (Gloss)',
  'Lamination (Matt)',
  'Folding',
  'Mounting (Board)',
  'Stitching',
  'Perforation',
  'Die Cutting',
]

const UNIT_OPTIONS = [
  { value: 'sft', label: 'SFT' },
  { value: 'sqin', label: 'SQIN' },
  { value: 'pcs', label: 'PCS' },
  { value: 'page', label: 'PAGE' },
  { value: 'book', label: 'BOOK' },
  { value: 'set', label: 'SET' },
]

export function NewInvoiceModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  onInvoiceCreated,
}: NewInvoiceModalProps) {
  const { company } = useTenant()
  const { locale } = useI18n()
  const tenantSlug = company?.slug || 'my-company'

  // Products catalog & pricing cache
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customerRates, setCustomerRates] = useState<ResolvedProductRate[]>([])

  // Customer Form Fields
  const [customerId, setCustomerId] = useState<string | undefined>(undefined)
  const [customerName, setCustomerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [address, setAddress] = useState('')
  const [customerType, setCustomerType] = useState<'retail' | 'reseller' | 'corporate' | 'government'>('retail')
  const [emailAddress, setEmailAddress] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Search suggestions dropdown
  const [searchResults, setSearchResults] = useState<CustomerRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isExistingCustomerSelected, setIsExistingCustomerSelected] = useState(false)

  // Items State
  const [items, setItems] = useState<ItemRowState[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      itemName: 'Pana Flex Banner Print',
      width: '4',
      height: '6',
      quantity: 1,
      unit: 'sft',
      rate: 22,
      finishing: 'None',
      rateSource: 'default',
    },
  ])

  // Financials State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [vatPercentage, setVatPercentage] = useState<number>(0)
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)

  // Feedback & Action states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'save' | 'print' | 'send' | null>(null)
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [communicationStatus, setCommunicationStatus] = useState<{
    status: 'idle' | 'success' | 'failed'
    message: string
    channel?: string
    format?: string
  }>({ status: 'idle', message: '' })

  // Send Dropdown state
  const [showSendMenu, setShowSendMenu] = useState(false)
  const sendMenuRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Fetch active catalog products
  useEffect(() => {
    if (!open) return
    getInvoiceProductsAction(company?.id).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data)
      }
    })
  }, [open, company?.id])

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) {
        setShowSendMenu(false)
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Auto-fill when preselected customer ID is provided
  useEffect(() => {
    if (open && preselectedCustomerId) {
      searchInvoiceCustomersAction(preselectedCustomerId, company?.id).then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          handleSelectCustomer(res.data[0])
        }
      })
    }
  }, [open, preselectedCustomerId, company?.id])

  // Customer keyword search
  useEffect(() => {
    if (!customerName.trim() || isExistingCustomerSelected) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await searchInvoiceCustomersAction(customerName, company?.id)
        if (res.success && res.data && res.data.length > 0) {
          setSearchResults(res.data)
          setShowSuggestions(true)
        } else {
          setSearchResults([])
          setShowSuggestions(false)
        }
      } catch (err) {
        console.error('Customer search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [customerName, isExistingCustomerSelected, company?.id])

  // Select existing customer & auto-fill without creating duplicates
  const handleSelectCustomer = async (cust: CustomerRecord) => {
    setCustomerId(cust.id)
    setCustomerName(cust.name)
    setCompanyName(cust.company_name || '')
    setPhoneNumber(cust.mobile)
    setWhatsappNumber(cust.whatsapp || '')
    setAddress(cust.address || '')
    const typeMapping = ['retail', 'reseller', 'corporate', 'government'].includes(cust.customer_type || '')
      ? (cust.customer_type as any)
      : 'retail'
    setCustomerType(typeMapping)
    setEmailAddress(cust.email || '')
    setIsExistingCustomerSelected(true)
    setShowSuggestions(false)
    setErrorMessage(null)

    // Resolve 3-tier customer pricing
    try {
      const rateRes = await resolveCustomerPricingAction(cust.id, company?.id)
      if (rateRes.success && rateRes.data) {
        setCustomerRates(rateRes.data)
        setItems((prev) =>
          prev.map((item) => {
            if (item.productId && !item.isManualRate) {
              const resolved = rateRes.data?.find((r) => r.productId === item.productId)
              if (resolved) {
                return {
                  ...item,
                  rate: resolved.effectiveRate,
                  rateSource: resolved.source,
                }
              }
            }
            return item
          })
        )
      }
    } catch (err) {
      console.error('Failed to resolve customer pricing:', err)
    }
  }

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val)
    if (isExistingCustomerSelected) {
      setIsExistingCustomerSelected(false)
      setCustomerId(undefined)
      setCustomerRates([])
    }
  }

  // Line Item Handlers
  const handleProductSelect = (index: number, productId: string) => {
    const prd = products.find((p) => p.id === productId)
    if (!prd) return

    setItems((prev) => {
      const next = [...prev]
      const current = next[index]

      const defaultPrice = Number(prd.selling_price) || Number((prd as any).base_price) || 20
      let effectiveRate = defaultPrice
      let rateSrc: 'custom' | 'last_invoice' | 'default' = 'default'

      if (customerId && customerRates.length > 0) {
        const resolved = customerRates.find((r) => r.productId === prd.id)
        if (resolved) {
          effectiveRate = resolved.effectiveRate
          rateSrc = resolved.source
        }
      }

      const prdUnit = prd.unit || (prd as any).unit_of_measure || current.unit

      next[index] = {
        ...current,
        productId: prd.id,
        itemName: prd.name,
        unit: prdUnit,
        rate: effectiveRate,
        rateSource: rateSrc,
        isManualRate: false,
      }
      return next
    })
  }

  const handleItemChange = (index: number, field: keyof ItemRowState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }
      if (field === 'rate') {
        current.isManualRate = true
        current.rateSource = 'manual'
      }
      next[index] = current
      return next
    })
  }

  const handleAddItem = () => {
    const defaultProduct = products[0]
    const defaultPrice = defaultProduct
      ? Number(defaultProduct.selling_price) || Number((defaultProduct as any).base_price) || 25
      : 25
    const defaultUnit = defaultProduct ? defaultProduct.unit || (defaultProduct as any).unit_of_measure || 'sft' : 'sft'

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: defaultProduct?.id || '',
        itemName: defaultProduct?.name || 'Printing Service Item',
        width: '4',
        height: '6',
        quantity: 1,
        unit: defaultUnit,
        rate: defaultPrice,
        finishing: 'None',
        rateSource: 'default',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Calculate line items
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Math.max(0.01, Number(item.quantity) || 1)
      const rate = Math.max(0, Number(item.rate) || 0)
      const w = Number(item.width) || 0
      const h = Number(item.height) || 0

      let lineTotal = 0
      let area = 0
      if (w > 0 && h > 0 && (item.unit === 'sft' || item.unit === 'sqft' || item.unit === 'sqin')) {
        area = item.unit === 'sqin' ? (w * h) / 144 : w * h
        lineTotal = Math.round(area * qty * rate)
      } else {
        lineTotal = Math.round(qty * rate)
      }

      return {
        ...item,
        area,
        lineTotal,
      }
    })
  }, [items])

  // Overall Totals
  const subtotal = useMemo(() => {
    return calculatedItems.reduce((sum, it) => sum + it.lineTotal, 0)
  }, [calculatedItems])

  const subtotalAfterDiscount = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0))
  }, [subtotal, discountAmount])

  const vatAmount = useMemo(() => {
    return Math.round((subtotalAfterDiscount * (Number(vatPercentage) || 0)) / 100)
  }, [subtotalAfterDiscount, vatPercentage])

  const grandTotal = useMemo(() => {
    return subtotalAfterDiscount + vatAmount
  }, [subtotalAfterDiscount, vatAmount])

  const effectiveAdvance = useMemo(() => {
    return Math.min(grandTotal, Math.max(0, Number(advanceAmount) || 0))
  }, [grandTotal, advanceAmount])

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - effectiveAdvance)
  }, [grandTotal, effectiveAdvance])

  // Save-First Core Validation & Persistence
  const persistInvoice = async (): Promise<InvoiceRecord | null> => {
    setErrorMessage(null)

    if (!customerName.trim()) {
      setErrorMessage('Customer Name is required.')
      return null
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Phone Number is required.')
      return null
    }
    if (!address.trim()) {
      setErrorMessage('Address is required.')
      return null
    }
    if (items.length === 0) {
      setErrorMessage('At least one item is required.')
      return null
    }

    const payloadItems: CreateInvoiceItemInput[] = calculatedItems.map((it) => ({
      product_id: it.productId || undefined,
      item_name: it.itemName,
      width: Number(it.width) || undefined,
      height: Number(it.height) || undefined,
      quantity: Number(it.quantity) || 1,
      unit: it.unit,
      unit_price: Number(it.rate) || 0,
      finishing: it.finishing,
      total_price: it.lineTotal,
    }))

    const payload = {
      customer_id: customerId,
      new_customer: !customerId
        ? {
            name: customerName.trim(),
            company_name: companyName.trim() || undefined,
            mobile: phoneNumber.trim(),
            whatsapp: whatsappNumber.trim() || undefined,
            address: address.trim(),
            customer_type: customerType,
            email: emailAddress.trim() || undefined,
            save_customer: saveCustomer,
          }
        : undefined,
      customer_name: customerName.trim(),
      customer_company: companyName.trim() || undefined,
      customer_phone: phoneNumber.trim(),
      customer_whatsapp: whatsappNumber.trim() || undefined,
      customer_address: address.trim(),
      customer_email: emailAddress.trim() || undefined,
      customer_type: customerType,
      discount_amount: Number(discountAmount) || 0,
      vat_percentage: Number(vatPercentage) || 0,
      advance_amount: effectiveAdvance,
      items: payloadItems,
    }

    const res = await createInvoiceAction(payload, company?.id)

    if (!res.success || !res.data) {
      if (res.duplicateMatch && res.duplicateCustomer) {
        handleSelectCustomer(res.duplicateCustomer)
        setErrorMessage(`Existing customer found with this phone (${res.duplicateCustomer.name}). Auto-filled existing profile.`)
      } else {
        setErrorMessage(res.error || 'Failed to save invoice.')
      }
      return null
    }

    setSavedInvoice(res.data)
    if (onInvoiceCreated) {
      onInvoiceCreated(res.data)
    }
    return res.data
  }

  // 1. SAVE ACTION
  const handleSaveOnly = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmittingAction('save')
    try {
      const inv = await persistInvoice()
      if (inv) {
        setCommunicationStatus({
          status: 'success',
          message: `Invoice ${inv.invoice_number} saved successfully!`,
        })
      }
    } finally {
      setIsSubmitting(false)
      setSubmittingAction(null)
    }
  }

  // 2. PRINT ACTION (Save First -> Open Print View)
  const handlePrint = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmittingAction('print')
    try {
      let inv = savedInvoice
      if (!inv) {
        inv = await persistInvoice()
      }
      if (inv) {
        window.open(`/${tenantSlug}/billing/${inv.id}`, '_blank')
        setCommunicationStatus({
          status: 'success',
          message: `Invoice ${inv.invoice_number} saved & ready for print!`,
        })
      }
    } finally {
      setIsSubmitting(false)
      setSubmittingAction(null)
    }
  }

  // 3. SEND ACTION (Save First -> Dispatch Communication)
  const handleSend = async (channel: 'whatsapp' | 'email' | 'sms', format: 'pdf' | 'text') => {
    setShowSendMenu(false)
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmittingAction('send')
    try {
      let inv = savedInvoice
      if (!inv) {
        inv = await persistInvoice()
      }

      if (!inv) return

      const sendRes = await sendInvoiceAction(
        {
          invoiceId: inv.id,
          channel,
          format,
        },
        company?.id
      )

      if (sendRes.success) {
        setCommunicationStatus({
          status: 'success',
          message: `Invoice ${inv.invoice_number} sent via ${channel.toUpperCase()} (${format.toUpperCase()})!`,
          channel,
          format,
        })
      } else {
        setCommunicationStatus({
          status: 'failed',
          message: `Invoice ${inv.invoice_number} saved, but ${channel.toUpperCase()} send failed: ${sendRes.error}`,
          channel,
          format,
        })
      }
    } finally {
      setIsSubmitting(false)
      setSubmittingAction(null)
    }
  }

  const resetModal = () => {
    setSavedInvoice(null)
    setErrorMessage(null)
    setCommunicationStatus({ status: 'idle', message: '' })
    setCustomerId(undefined)
    setCustomerName('')
    setCompanyName('')
    setPhoneNumber('')
    setWhatsappNumber('')
    setAddress('')
    setCustomerType('retail')
    setEmailAddress('')
    setSaveCustomer(true)
    setIsExistingCustomerSelected(false)
    setCustomerRates([])
    const defaultProduct = products[0]
    const defaultPrice = defaultProduct
      ? Number(defaultProduct.selling_price) || Number((defaultProduct as any).base_price) || 22
      : 22
    const defaultUnit = defaultProduct ? defaultProduct.unit || (defaultProduct as any).unit_of_measure || 'sft' : 'sft'

    setItems([
      {
        id: `item-${Date.now()}-1`,
        productId: defaultProduct?.id || '',
        itemName: defaultProduct?.name || 'Pana Flex Banner Print',
        width: '4',
        height: '6',
        quantity: 1,
        unit: defaultUnit,
        rate: defaultPrice,
        finishing: 'None',
        rateSource: 'default',
      },
    ])
    setDiscountAmount(0)
    setVatPercentage(0)
    setAdvanceAmount(0)
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetModal()
        onOpenChange(v)
      }}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'bn' ? 'নতুন চালান তৈরি করুন' : 'New Invoice'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Easier than Excel • Faster than paper • More organized than WhatsApp
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-5 pt-1 pb-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Success Banner */}
        {savedInvoice && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Invoice {savedInvoice.invoice_number} Saved!</strong> Grand Total: ৳{formatBDT(savedInvoice.grand_total)} • Due: ৳{formatBDT(savedInvoice.due_amount)}
              </span>
            </div>
            <a
              href={`/${tenantSlug}/billing/${savedInvoice.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Printer className="h-3 w-3" />
              Print
            </a>
          </div>
        )}

        {/* Communication Status Banner */}
        {communicationStatus.status !== 'idle' && (
          <div
            className={cn(
              'rounded-xl border p-3 flex items-center justify-between gap-3 text-xs',
              communicationStatus.status === 'success'
                ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
                : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            )}
          >
            <div className="flex items-center gap-2">
              {communicationStatus.status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span>{communicationStatus.message}</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* SECTION 1: CUSTOMER INFORMATION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              Customer Details
            </h3>
            {isExistingCustomerSelected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <UserCheck className="h-3.5 w-3.5" />
                Existing Customer Linked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Customer Name with Search Dropdown */}
            <div className="relative" ref={searchContainerRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSuggestions(true)
                  }}
                  placeholder="Type customer name or phone..."
                  className="h-9 text-xs rounded-lg font-medium pr-7"
                />
                {isSearching && (
                  <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.company_name && (
                            <span className="text-[10px] text-slate-500 font-normal">({c.company_name})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{c.mobile}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {c.customer_type || 'Retail'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company Name */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Company Name</Label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enterprise / Business Name"
                className="h-9 text-xs rounded-lg"
              />
            </div>

            {/* Phone Number */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="h-9 text-xs rounded-lg font-mono"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">WhatsApp Number</Label>
              <Input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="h-9 text-xs rounded-lg font-mono"
              />
            </div>

            {/* Customer Type */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium"
              >
                <option value="retail">Retail</option>
                <option value="reseller">Reseller</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
              </select>
            </div>

            {/* Email Address */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">Email Address</Label>
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="client@email.com"
                className="h-9 text-xs rounded-lg"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-semibold mb-1 block">
                Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop/Office Address, Area, Dhaka"
                className="h-9 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Save Customer Checkbox */}
          {!isExistingCustomerSelected && (
            <div className="pt-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="save-customer-chk"
                checked={saveCustomer}
                onChange={(e) => setSaveCustomer(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="save-customer-chk" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Save Customer to directory (Checked by default)
              </label>
            </div>
          )}
        </div>

        {/* SECTION 2: ITEMS SECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Items
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-7 text-xs font-bold gap-1 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another
            </Button>
          </div>

          <div className="space-y-3">
            {calculatedItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3 space-y-2.5"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                  {/* Item (Product / Service) */}
                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Item
                    </Label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-semibold"
                    >
                      <option value="">Custom Item</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      placeholder="Item description..."
                      className="h-7 text-xs rounded-md mt-1"
                    />
                  </div>

                  {/* Size (Width, Height, Unit) */}
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Size (Width × Height)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="any"
                        value={item.width}
                        onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                        placeholder="W"
                        className="h-8 text-xs rounded-md w-14 text-center font-mono"
                        title="Width"
                      />
                      <span className="text-slate-400 text-xs">×</span>
                      <Input
                        type="number"
                        step="any"
                        value={item.height}
                        onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                        placeholder="H"
                        className="h-8 text-xs rounded-md w-14 text-center font-mono"
                        title="Height"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1 text-[11px] font-medium flex-1"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="h-8 text-xs rounded-md text-center font-mono font-bold"
                    />
                  </div>

                  {/* Finishing */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Finishing</Label>
                    <select
                      value={item.finishing}
                      onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                    >
                      {FINISHING_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rate */}
                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Rate</Label>
                      {item.rateSource && (
                        <span className="text-[9px] font-extrabold uppercase text-blue-600">
                          {item.rateSource === 'custom' ? 'Custom' : item.rateSource === 'last_invoice' ? 'Last Inv' : ''}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="any"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                      className="h-8 text-xs rounded-md font-mono font-bold text-right"
                    />
                  </div>
                </div>

                {/* Line Total & Remove */}
                <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800 pt-1.5 text-xs">
                  <div className="text-[11px] font-mono text-slate-500">
                    Line Total: <strong className="text-slate-900 dark:text-white">৳{formatBDT(item.lineTotal)}</strong>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: TOTALS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-4 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center text-xs">
            {/* Total */}
            <div>
              <span className="text-slate-500 font-semibold block text-[11px]">Total (Subtotal)</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                ৳{formatBDT(subtotal)}
              </span>
            </div>

            {/* Discount */}
            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                Discount (৳)
              </Label>
              <Input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="h-8 text-xs font-mono font-bold text-right rounded-md"
              />
            </div>

            {/* Vat */}
            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                VAT (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={vatPercentage}
                onChange={(e) => setVatPercentage(Math.max(0, Number(e.target.value)))}
                className="h-8 text-xs font-mono font-bold text-right rounded-md"
              />
            </div>

            {/* Advance */}
            <div>
              <Label className="text-[11px] font-semibold mb-1 block text-slate-600 dark:text-slate-400">
                Advance (৳)
              </Label>
              <Input
                type="number"
                min="0"
                max={grandTotal}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value)))}
                className="h-8 text-xs font-mono font-bold text-right text-emerald-600 rounded-md"
              />
            </div>

            {/* Due */}
            <div>
              <span className="text-rose-600 font-bold block text-[11px]">Due Balance</span>
              <span className="text-base font-black font-mono text-rose-600">
                ৳{formatBDT(dueAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: SAVE-FIRST ACTION BUTTONS */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-3 pb-1 flex items-center justify-end gap-2.5">
          {/* [Save] Button */}
          <Button
            type="button"
            onClick={handleSaveOnly}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-xs"
          >
            {isSubmitting && submittingAction === 'save' ? (
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Save</span>
              </div>
            )}
          </Button>

          {/* [Send (Dropdown)] Button */}
          <div className="relative" ref={sendMenuRef}>
            <Button
              type="button"
              onClick={() => setShowSendMenu(!showSendMenu)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting && submittingAction === 'send' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Send</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </Button>

            {showSendMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1.5 z-50 divide-y divide-slate-100 dark:divide-slate-800">
                {/* WhatsApp */}
                <div className="p-1 space-y-0.5">
                  <div className="text-[10px] font-black uppercase text-emerald-600 px-2 py-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend('whatsapp', 'pdf')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-between"
                  >
                    <span>PDF Document</span>
                    <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700">
                      PDF
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('whatsapp', 'text')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-between"
                  >
                    <span>Text Message</span>
                    <Badge variant="outline" className="text-[9px]">
                      Text
                    </Badge>
                  </button>
                </div>

                {/* Email */}
                <div className="p-1 space-y-0.5">
                  <div className="text-[10px] font-black uppercase text-blue-600 px-2 py-1 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend('email', 'pdf')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between"
                  >
                    <span>PDF Attachment</span>
                    <Badge variant="outline" className="text-[9px] border-blue-300 text-blue-700">
                      PDF
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('email', 'text')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between"
                  >
                    <span>Text Summary</span>
                    <Badge variant="outline" className="text-[9px]">
                      Text
                    </Badge>
                  </button>
                </div>

                {/* SMS */}
                <div className="p-1 space-y-0.5">
                  <div className="text-[10px] font-black uppercase text-purple-600 px-2 py-1 flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> SMS
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend('sms', 'text')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between"
                  >
                    <span>Text SMS</span>
                    <Badge variant="outline" className="text-[9px]">
                      Text
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('sms', 'pdf')}
                    className="w-full text-left px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between"
                  >
                    <span>PDF Web Link</span>
                    <Badge variant="outline" className="text-[9px] border-purple-300 text-purple-700">
                      PDF
                    </Badge>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* [Print] Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1.5"
          >
            {isSubmitting && submittingAction === 'print' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>Print</span>
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
