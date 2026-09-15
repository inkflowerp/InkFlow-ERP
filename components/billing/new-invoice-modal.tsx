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
  CreditCard,
  Sparkles,
  AlertOctagon,
  FileText,
  Clock,
  Layers,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord, ResolvedProductRate } from '@/types/crm.types'
import { InvoiceRecord, InvoiceType } from '@/types/billing.types'
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
  preselectedQuotationId?: string
  preselectedSalesOrderId?: string
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
  preselectedQuotationId,
  preselectedSalesOrderId,
  onInvoiceCreated,
}: NewInvoiceModalProps) {
  const { company } = useTenant()
  const { locale } = useI18n()
  const tenantSlug = company?.slug || 'my-company'

  // Products catalog & pricing cache
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customerRates, setCustomerRates] = useState<ResolvedProductRate[]>([])

  // Mode: Simple vs Advanced
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)

  // Customer Form Fields
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [customerId, setCustomerId] = useState<string | undefined>(undefined)
  const [customerName, setCustomerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [address, setAddress] = useState('')
  const [customerType, setCustomerType] = useState<'retail' | 'reseller' | 'corporate' | 'government'>('retail')
  const [emailAddress, setEmailAddress] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Document metadata
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('sales_invoice')
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque' | 'other_mfs'>('cash')
  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [quotationId, setQuotationId] = useState<string | undefined>(preselectedQuotationId)
  const [salesOrderId, setSalesOrderId] = useState<string | undefined>(preselectedSalesOrderId)

  // Credit Limit Override
  const [creditOverrideReason, setCreditOverrideReason] = useState('')
  const [confirmCreditOverride, setConfirmCreditOverride] = useState(false)

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
    setSelectedCustomer(cust)
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
      setSelectedCustomer(null)
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

  // Customer Credit Calculations
  const customerOutstanding = Number(selectedCustomer?.total_due_balance) || 0
  const customerCreditLimit = Number(selectedCustomer?.credit_limit) || 0
  const availableCredit = customerCreditLimit > 0 ? customerCreditLimit - customerOutstanding : Infinity
  const projectedOutstanding = customerOutstanding + dueAmount
  const isCreditLimitExceeded = customerCreditLimit > 0 && projectedOutstanding > customerCreditLimit
  const creditExceededBy = isCreditLimitExceeded ? projectedOutstanding - customerCreditLimit : 0

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

    if (isCreditLimitExceeded && !confirmCreditOverride) {
      setErrorMessage(
        `Customer credit limit exceeded by ৳${creditExceededBy.toLocaleString()}. Please authorize the override below to proceed.`
      )
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
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount_amount: Number(discountAmount) || 0,
      vat_percentage: Number(vatPercentage) || 0,
      advance_amount: effectiveAdvance,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      terms_and_conditions: termsAndConditions.trim() || undefined,
      quotation_id: quotationId,
      sales_order_id: salesOrderId,
      credit_override_reason: isCreditLimitExceeded ? creditOverrideReason || 'Authorized credit limit override' : undefined,
      items: payloadItems,
    }

    setIsSubmitting(true)

    try {
      const result = await createInvoiceAction(payload, company?.id)
      if (!result.success || !result.data) {
        setErrorMessage(result.error || 'Failed to save invoice.')
        return null
      }

      setSavedInvoice(result.data)
      if (onInvoiceCreated) {
        onInvoiceCreated(result.data)
      }
      return result.data
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  // Action: Save & Exit
  const handleSaveOnly = async () => {
    setSubmittingAction('save')
    const invoice = await persistInvoice()
    setSubmittingAction(null)
    if (invoice) {
      onOpenChange(false)
    }
  }

  // Action: Save & Print PDF
  const handleSaveAndPrint = async () => {
    setSubmittingAction('print')
    const invoice = await persistInvoice()
    setSubmittingAction(null)
    if (invoice) {
      window.open(`/${tenantSlug}/billing/${invoice.id}`, '_blank')
      onOpenChange(false)
    }
  }

  // Action: Save & Send via WhatsApp or Email
  const handleSaveAndSend = async (channel: 'whatsapp' | 'email') => {
    setShowSendMenu(false)
    setSubmittingAction('send')
    const invoice = await persistInvoice()

    if (!invoice) {
      setSubmittingAction(null)
      return
    }

    setCommunicationStatus({
      status: 'idle',
      message: `Dispatching ${channel.toUpperCase()} message...`,
      channel,
    })

    try {
      const res = await sendInvoiceAction(
        {
          invoiceId: invoice.id,
          channel,
          format: 'pdf',
        },
        company?.id
      )

      if (res.success) {
        setCommunicationStatus({
          status: 'success',
          message: `Invoice #${invoice.invoice_number} dispatched via ${channel.toUpperCase()} successfully!`,
          channel,
        })
        if (channel === 'whatsapp' && res.data?.whatsappUrl) {
          window.open(res.data.whatsappUrl, '_blank')
        }
      } else {
        setCommunicationStatus({
          status: 'failed',
          message: res.error || `Failed to send via ${channel.toUpperCase()}`,
          channel,
        })
      }
    } catch (err: any) {
      setCommunicationStatus({
        status: 'failed',
        message: err.message || `Communication dispatch error`,
        channel,
      })
    } finally {
      setSubmittingAction(null)
    }
  }

  const getRateBadge = (source?: 'custom' | 'last_invoice' | 'default' | 'manual') => {
    if (source === 'custom') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] py-0">Custom Rate</Badge>
    }
    if (source === 'last_invoice') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] py-0">Last Inv Rate</Badge>
    }
    if (source === 'manual') {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] py-0">Manual</Badge>
    }
    return <Badge variant="outline" className="text-slate-500 text-[10px] py-0">Default</Badge>
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      size="5xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'নতুন চালান / ইনভয়েস তৈরি' : 'Create New Commercial Invoice'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Easier than Excel • Faster than paper • Save-First Guarantee
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5',
                isAdvancedMode
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isAdvancedMode ? 'Advanced Mode Active' : 'Simple Mode'}</span>
            </button>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-4 pt-1 pb-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Action Required:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* COMMUNICATION STATUS BANNER */}
        {communicationStatus.message && (
          <div
            className={cn(
              'p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in-0',
              communicationStatus.status === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200'
                : communicationStatus.status === 'failed'
                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200'
            )}
          >
            {communicationStatus.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : communicationStatus.status === 'failed' ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
            )}
            <span>{communicationStatus.message}</span>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: CUSTOMER SEARCH & DETAILS
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

            {isExistingCustomerSelected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                <UserCheck className="h-3.5 w-3.5" />
                Customer Linked & Pricing Resolved
              </span>
            )}
          </div>

          {/* Customer Search & Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="relative" ref={searchContainerRef}>
              <Label className="text-xs font-semibold mb-1 block">
                Customer Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Type name to search or enter new..."
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  className="text-xs h-9 pr-8"
                  required
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>

              {/* Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-2.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900 dark:text-slate-100">{cust.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{cust.mobile} {cust.company_name ? `• ${cust.company_name}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Company Name (Optional)</Label>
              <Input
                placeholder="Business / Organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold mb-1 block">
                Billing Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Full address for delivery & invoice"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Email (for PDF Invoice)</Label>
              <Input
                type="email"
                placeholder="client@domain.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* CUSTOMER CREDIT HUD */}
          {selectedCustomer && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Balance</span>
                <span className="font-mono font-bold text-rose-600 text-sm">৳ {formatBDT(customerOutstanding)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Limit</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {customerCreditLimit > 0 ? `৳ ${formatBDT(customerCreditLimit)}` : 'No Limit'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Credit</span>
                <span className={cn('font-mono font-bold text-sm', availableCredit > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {customerCreditLimit > 0 ? `৳ ${formatBDT(Math.max(0, availableCredit))}` : 'Unlimited'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Category</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                  {selectedCustomer.customer_type || 'Retail'}
                </Badge>
              </div>
            </div>
          )}

          {/* CREDIT LIMIT WARNING MODAL / BANNER */}
          {isCreditLimitExceeded && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-2 text-amber-900 dark:text-amber-200 animate-in fade-in-0">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Credit Limit Warning: Projected Outstanding Exceeds Credit Limit</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div>Outstanding: <strong>৳{formatBDT(customerOutstanding)}</strong></div>
                <div>New Due: <strong>৳{formatBDT(dueAmount)}</strong></div>
                <div>Limit: <strong>৳{formatBDT(customerCreditLimit)}</strong></div>
                <div className="text-rose-600 font-bold">Exceeds By: <strong>৳{formatBDT(creditExceededBy)}</strong></div>
              </div>
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmCreditOverride}
                    onChange={(e) => setConfirmCreditOverride(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Authorize Credit Limit Override</span>
                </label>
                {confirmCreditOverride && (
                  <Input
                    placeholder="Enter authorization reason (e.g. Approved by CFO / Owner)..."
                    value={creditOverrideReason}
                    onChange={(e) => setCreditOverrideReason(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900 font-medium"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: INVOICE ITEMS & PRINT SPECS
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Line Items & Print Specs
              </h3>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-7 text-xs font-bold gap-1 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const calc = calculatedItems[index]
              const isDimensionUnit = item.unit === 'sft' || item.unit === 'sqin' || item.unit === 'sqft'

              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </span>
                      <Input
                        placeholder="Item Description / Service Name"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="h-8 text-xs font-bold w-48 sm:w-64"
                        required
                      />
                      {getRateBadge(item.rateSource)}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        ৳ {formatBDT(calc?.lineTotal || 0)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                    {/* Dimension W */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Width</Label>
                      <Input
                        type="number"
                        placeholder="Width"
                        value={item.width}
                        onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Dimension H */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Height</Label>
                      <Input
                        type="number"
                        placeholder="Height"
                        value={item.height}
                        onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value) || 1)}
                        className="h-8 text-xs font-mono font-bold"
                        min={1}
                        required
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Unit</Label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full h-8 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rate */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Rate (৳)</Label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value) || 0)}
                        className="h-8 text-xs font-mono font-bold"
                        min={0}
                        required
                      />
                    </div>

                    {/* Finishing */}
                    <div>
                      <Label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">Finishing</Label>
                      <select
                        value={item.finishing}
                        onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                        className="w-full h-8 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2"
                      >
                        {FINISHING_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isDimensionUnit && calc && calc.area > 0 && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Area: <strong>{calc.area.toFixed(2)} {item.unit.toUpperCase()}</strong> • Total SFT: <strong>{(calc.area * item.quantity).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: FINANCIAL TOTALS & SETTLEMENT
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Financial Totals & Settlement
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Subtotal</Label>
              <div className="h-9 px-3 flex items-center bg-slate-100 dark:bg-slate-800 rounded-md font-mono font-bold text-slate-900 dark:text-white">
                ৳ {formatBDT(subtotal)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Discount (৳)</Label>
              <Input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0.00"
                min={0}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">VAT (%)</Label>
              <Input
                type="number"
                value={vatPercentage || ''}
                onChange={(e) => setVatPercentage(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0%"
                min={0}
                max={100}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Grand Total</Label>
              <div className="h-9 px-3 flex items-center bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md font-mono font-black text-blue-700 dark:text-blue-300 text-sm">
                ৳ {formatBDT(grandTotal)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Advance / Paid Now (৳)</Label>
              <Input
                type="number"
                value={advanceAmount || ''}
                onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono font-bold"
                placeholder="0.00"
                min={0}
                max={grandTotal}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Balance Due</Label>
              <div className={cn(
                'h-9 px-3 flex items-center rounded-md font-mono font-black text-sm border',
                dueAmount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              )}>
                ৳ {formatBDT(dueAmount)}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="cash">Cash Counter</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad Wallet</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Bank Cheque</option>
                <option value="other_mfs">Other MFS</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Advanced collapsible fields */}
          {isAdvancedMode && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in-0">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Invoice Notes / Special Instructions</Label>
                <Input
                  placeholder="Notes printed on invoice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Terms & Conditions</Label>
                <Input
                  placeholder="Delivery upon full payment, no return on custom prints..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          STANDARDIZED MODAL BOTTOM ACTION BAR
         ========================================================================= */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {/* Direct Print Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndPrint}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Save & Print PDF</span>
          </Button>

          {/* Send via WhatsApp / Email Dropdown */}
          <div className="relative" ref={sendMenuRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSendMenu(!showSendMenu)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>Save & Send</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {showSendMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => handleSaveAndSend('whatsapp')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndSend('email')}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Send PDF via Email</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Save Button */}
          <Button
            type="button"
            onClick={handleSaveOnly}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Invoice...</span>
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                <span>Save Invoice</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
