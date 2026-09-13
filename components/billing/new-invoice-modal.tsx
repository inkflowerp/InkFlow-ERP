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
  Clock,
  Sparkles,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  FileText,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord, ResolvedProductRate, RateSource } from '@/types/crm.types'
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

export type ModalRateSource = 'custom' | 'last_invoice' | 'default' | 'manual'

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
  rateSource?: ModalRateSource
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
  { value: 'sft', label: 'SFT (Sq Feet)' },
  { value: 'sqin', label: 'Sq Inch' },
  { value: 'pcs', label: 'Pieces (Pcs)' },
  { value: 'page', label: 'Pages' },
  { value: 'book', label: 'Books' },
  { value: 'set', label: 'Sets' },
]

export function NewInvoiceModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  onInvoiceCreated,
}: NewInvoiceModalProps) {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = company?.slug || 'my-company'

  // Products catalog & pricing cache
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [customerRates, setCustomerRates] = useState<ResolvedProductRate[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Customer search & selection
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerRecord[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false)

  // New customer form fields
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerWhatsApp, setNewCustomerWhatsApp] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerType, setNewCustomerType] = useState<'retail' | 'reseller' | 'corporate' | 'government'>('retail')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(true)

  // Duplicate customer warning
  const [duplicateMatchWarning, setDuplicateMatchWarning] = useState<CustomerRecord | null>(null)

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
  const [invoiceType, setInvoiceType] = useState<'sales_invoice' | 'vat_invoice'>('sales_invoice')
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [vatPercentage, setVatPercentage] = useState<number>(0)
  const [advanceAmount, setAdvanceAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank' | 'cheque'>('cash')
  const [invoiceNotes, setInvoiceNotes] = useState('')

  // State flags & feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'save' | 'print' | 'send' | null>(null)
  const [savedInvoice, setSavedInvoice] = useState<InvoiceRecord | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [communicationStatus, setCommunicationStatus] = useState<{
    status: 'idle' | 'success' | 'failed'
    message: string
    channel?: string
    format?: string
  }>({ status: 'idle', message: '' })

  // Send Dropdown state
  const [showSendMenu, setShowSendMenu] = useState(false)
  const sendMenuRef = useRef<HTMLDivElement>(null)

  // Load active products on mount
  useEffect(() => {
    if (!open) return
    let isMounted = true
    setLoadingProducts(true)
    getInvoiceProductsAction(company?.id)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setProducts(res.data)
        }
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false)
      })
    return () => {
      isMounted = false
    }
  }, [open, company?.id])

  // Close Send dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) {
        setShowSendMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Handle preselected customer ID
  useEffect(() => {
    if (open && preselectedCustomerId) {
      searchInvoiceCustomersAction(preselectedCustomerId, company?.id).then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          handleSelectCustomer(res.data[0])
        }
      })
    }
  }, [open, preselectedCustomerId, company?.id])

  // Customer search with debounce
  useEffect(() => {
    if (!customerSearchQuery.trim() || isNewCustomerMode) {
      setCustomerSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true)
      try {
        const res = await searchInvoiceCustomersAction(customerSearchQuery, company?.id)
        if (res.success && res.data) {
          setCustomerSearchResults(res.data)
          setShowCustomerDropdown(true)
        }
      } catch (err) {
        console.error('Customer search error:', err)
      } finally {
        setIsSearchingCustomers(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [customerSearchQuery, isNewCustomerMode, company?.id])

  // Rate resolution when customer changes
  const handleSelectCustomer = async (cust: CustomerRecord) => {
    setSelectedCustomer(cust)
    setIsNewCustomerMode(false)
    setCustomerSearchQuery(`${cust.name} ${cust.company_name ? `(${cust.company_name})` : ''}`)
    setShowCustomerDropdown(false)
    setDuplicateMatchWarning(null)
    setValidationError(null)

    // Load 3-tier customer pricing
    try {
      const rateRes = await resolveCustomerPricingAction(cust.id, company?.id)
      if (rateRes.success && rateRes.data) {
        setCustomerRates(rateRes.data)
        // Refresh rates on current items if not manually modified
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

  const handleStartNewCustomer = () => {
    setIsNewCustomerMode(true)
    setSelectedCustomer(null)
    setCustomerRates([])
    setShowCustomerDropdown(false)
    setNewCustomerName(customerSearchQuery.trim())
    setDuplicateMatchWarning(null)
  }

  const handleCancelNewCustomer = () => {
    setIsNewCustomerMode(false)
    setCustomerSearchQuery('')
    setNewCustomerName('')
    setNewCompanyName('')
    setNewCustomerPhone('')
    setNewCustomerWhatsApp('')
    setNewCustomerAddress('')
    setNewCustomerEmail('')
    setDuplicateMatchWarning(null)
  }

  // Handle line item changes & automatic rate resolution
  const handleProductSelect = (index: number, productId: string) => {
    const prd = products.find((p) => p.id === productId)
    if (!prd) return

    setItems((prev) => {
      const next = [...prev]
      const current = next[index]

      // Determine rate from hierarchy
      const defaultSellingPrice = Number(prd.selling_price) || Number((prd as any).base_price) || 20
      let effectiveRate = defaultSellingPrice
      let rateSrc: ModalRateSource = 'default'

      if (selectedCustomer && customerRates.length > 0) {
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
        width: '3',
        height: '5',
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

  // Calculate line item totals
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

  // Overall Financial Calculations
  const subtotal = useMemo(() => {
    return calculatedItems.reduce((acc, it) => acc + it.lineTotal, 0)
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
    setValidationError(null)

    // Validation
    if (!selectedCustomer && !isNewCustomerMode) {
      setValidationError('Please select an existing customer or create a new customer.')
      return null
    }

    if (isNewCustomerMode) {
      if (!newCustomerName.trim()) {
        setValidationError('Customer Name is required.')
        return null
      }
      if (!newCustomerPhone.trim()) {
        setValidationError('Customer Phone number is required.')
        return null
      }
      if (!newCustomerAddress.trim()) {
        setValidationError('Customer Address is required.')
        return null
      }
    }

    if (items.length === 0) {
      setValidationError('At least one line item is required.')
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
      customer_id: selectedCustomer?.id,
      new_customer: isNewCustomerMode
        ? {
            name: newCustomerName,
            company_name: newCompanyName,
            mobile: newCustomerPhone,
            whatsapp: newCustomerWhatsApp,
            address: newCustomerAddress,
            customer_type: newCustomerType,
            email: newCustomerEmail,
            save_customer: saveCustomer,
          }
        : undefined,
      customer_name: selectedCustomer?.name,
      customer_company: selectedCustomer?.company_name || undefined,
      customer_phone: selectedCustomer?.mobile,
      customer_whatsapp: selectedCustomer?.whatsapp || undefined,
      customer_address: selectedCustomer?.address || undefined,
      customer_email: selectedCustomer?.email || undefined,
      customer_type: selectedCustomer?.customer_type,
      invoice_type: invoiceType,
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount_amount: Number(discountAmount) || 0,
      vat_percentage: Number(vatPercentage) || 0,
      advance_amount: effectiveAdvance,
      payment_method: paymentMethod,
      notes: invoiceNotes,
      items: payloadItems,
    }

    const res = await createInvoiceAction(payload, company?.id)

    if (!res.success || !res.data) {
      if (res.duplicateMatch && res.duplicateCustomer) {
        setDuplicateMatchWarning(res.duplicateCustomer)
        setValidationError(`Existing customer found with matching phone (${res.duplicateCustomer.name}).`)
      } else {
        setValidationError(res.error || 'Failed to save invoice.')
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
          message: `Invoice ${inv.invoice_number} saved successfully with immutable snapshot!`,
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
          message: `Invoice ${inv.invoice_number} saved & print document prepared!`,
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

      if (!inv) {
        return
      }

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
          message: `Invoice ${inv.invoice_number} sent via ${channel.toUpperCase()} (${format.toUpperCase()}) successfully!`,
          channel,
          format,
        })
      } else {
        setCommunicationStatus({
          status: 'failed',
          message: `Invoice ${inv.invoice_number} saved successfully, but ${channel.toUpperCase()} delivery failed: ${sendRes.error}`,
          channel,
          format,
        })
      }
    } finally {
      setIsSubmitting(false)
      setSubmittingAction(null)
    }
  }

  const handleRetrySend = async () => {
    if (!savedInvoice || !communicationStatus.channel || !communicationStatus.format) return
    handleSend(
      communicationStatus.channel as 'whatsapp' | 'email' | 'sms',
      communicationStatus.format as 'pdf' | 'text'
    )
  }

  const resetModal = () => {
    setSavedInvoice(null)
    setValidationError(null)
    setCommunicationStatus({ status: 'idle', message: '' })
    setSelectedCustomer(null)
    setIsNewCustomerMode(false)
    setCustomerSearchQuery('')
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
    setInvoiceNotes('')
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetModal()
        onOpenChange(v)
      }}
      size="6xl"
      title={
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'নতুন চালান / ইনভয়েস তৈরি' : 'New Invoice Workspace'}
              </h2>
              <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                Save-First Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Easier than Excel • Faster than paper • Centralized Persistence & Financial Integrity
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-6 pt-2 pb-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Success Banner if Invoice Persisted */}
        {savedInvoice && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                  Invoice {savedInvoice.invoice_number} Persisted in Database
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400">
                  Total: ৳{formatBDT(savedInvoice.grand_total)} • Paid: ৳{formatBDT(savedInvoice.paid_amount)} • Due: ৳{formatBDT(savedInvoice.due_amount)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/${tenantSlug}/billing/${savedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                View & Print Invoice
              </a>
            </div>
          </div>
        )}

        {/* Communication Status Banner */}
        {communicationStatus.status !== 'idle' && (
          <div
            className={cn(
              'rounded-xl border p-3.5 flex items-center justify-between gap-3 text-xs',
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
            {communicationStatus.status === 'failed' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetrySend}
                className="h-7 text-[11px] gap-1 shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Send
              </Button>
            )}
          </div>
        )}

        {/* Validation / Error Banner */}
        {validationError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{validationError}</span>
              {duplicateMatchWarning && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSelectCustomer(duplicateMatchWarning)}
                    className="h-7 text-xs bg-rose-700 hover:bg-rose-800 text-white"
                  >
                    Use Existing Customer ({duplicateMatchWarning.name})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: CUSTOMER SELECTION & DETAILS */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-black">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Customer Information <span className="text-rose-500">*</span>
              </h3>
            </div>
            {!isNewCustomerMode && selectedCustomer && (
              <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Customer ID: {selectedCustomer.id.slice(0, 8)}
              </Badge>
            )}
          </div>

          {!isNewCustomerMode ? (
            <div className="space-y-3">
              {/* Existing Customer Search Input */}
              <div className="relative">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Search Existing Customer (Name / Bangla / Phone / WhatsApp / Company)
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value)
                      if (selectedCustomer) setSelectedCustomer(null)
                    }}
                    onFocus={() => {
                      if (customerSearchResults.length > 0) setShowCustomerDropdown(true)
                    }}
                    placeholder="Search by customer name, 017xxxxxxxx, company..."
                    className="pl-10 pr-10 h-11 rounded-xl text-sm font-medium border-slate-200 dark:border-slate-800"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery('')
                        setSelectedCustomer(null)
                        setCustomerRates([])
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showCustomerDropdown && customerSearchResults.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {customerSearchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{c.name}</span>
                            {c.name_bn && <span className="text-xs text-slate-400 font-normal">({c.name_bn})</span>}
                            {c.company_name && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                                {c.company_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3" /> {c.mobile}
                            </span>
                            {c.address && <span className="truncate max-w-xs">• {c.address}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {c.customer_type || 'Retail'}
                          </Badge>
                          {Number(c.total_due_balance) > 0 && (
                            <div className="text-[11px] font-bold text-rose-600 mt-1">
                              Due: ৳{formatBDT(c.total_due_balance || 0)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Card Preview or "Create New Customer" Option */}
              {selectedCustomer ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50 p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Customer:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedCustomer.name}</span>
                    {selectedCustomer.company_name && (
                      <span className="text-slate-500 block">{selectedCustomer.company_name}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Contact:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 block">{selectedCustomer.mobile}</span>
                    {selectedCustomer.whatsapp && (
                      <span className="text-emerald-600 font-mono block">WA: {selectedCustomer.whatsapp}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Address & Type:</span>
                    <span className="text-slate-700 dark:text-slate-300 block truncate">{selectedCustomer.address || 'Dhaka, Bangladesh'}</span>
                    <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                      {selectedCustomer.customer_type || 'Retail'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Don't see the customer in database?</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartNewCustomer}
                    className="h-8 text-xs font-bold gap-1.5 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Enter New Customer
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* New Customer Input Form */
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 p-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Creating New Customer Profile
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelNewCustomer}
                  className="h-7 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel & Search Existing
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Customer Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Rahim Uddin"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Company Name</Label>
                  <Input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="e.g. Rahim Enterprise Ltd."
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="h-9 text-xs rounded-lg font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">WhatsApp Number</Label>
                  <Input
                    type="tel"
                    value={newCustomerWhatsApp}
                    onChange={(e) => setNewCustomerWhatsApp(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="h-9 text-xs rounded-lg font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    Customer Type <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={newCustomerType}
                    onChange={(e) => setNewCustomerType(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="retail">Retail</option>
                    <option value="reseller">Reseller</option>
                    <option value="corporate">Corporate</option>
                    <option value="government">Government</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">Email Address (Optional)</Label>
                  <Input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="billing@company.com"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs font-semibold mb-1 block">
                    Address <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    placeholder="e.g. 42 Motijheel C/A, Dhaka - 1000"
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Save Customer Checkbox */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="save-customer-toggle"
                  checked={saveCustomer}
                  onChange={(e) => setSaveCustomer(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="save-customer-toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Save Customer profile to permanent customer directory (Recommended)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: LINE ITEMS BUILDER */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-xs font-black">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Invoice Line Items <span className="text-rose-500">*</span>
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-8 text-xs font-bold gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
            >
              <Plus className="h-3.5 w-3.5" />
              + Add Another Item
            </Button>
          </div>

          {/* Items Table / Cards */}
          <div className="space-y-3">
            {calculatedItems.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Product / Service Catalog */}
                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Product / Service Catalog
                    </Label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-bold"
                    >
                      <option value="">Custom Service Item</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit || (p as any).unit_of_measure})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                      placeholder="Item description..."
                      className="h-8 text-xs rounded-lg mt-1"
                    />
                  </div>

                  {/* Size (Width x Height) */}
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Dimensions & Unit
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="any"
                        value={item.width}
                        onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                        placeholder="W"
                        className="h-9 text-xs rounded-lg w-16 text-center font-mono"
                        title="Width"
                      />
                      <span className="text-slate-400 text-xs font-bold">×</span>
                      <Input
                        type="number"
                        step="any"
                        value={item.height}
                        onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                        placeholder="H"
                        className="h-9 text-xs rounded-lg w-16 text-center font-mono"
                        title="Height"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 text-[11px] font-medium flex-1"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.value.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    {item.area > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Area: {item.area.toFixed(2)} {item.unit}
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="h-9 text-xs rounded-lg text-center font-mono font-bold"
                    />
                  </div>

                  {/* Finishing */}
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Finishing</Label>
                    <select
                      value={item.finishing}
                      onChange={(e) => handleItemChange(index, 'finishing', e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                    >
                      {FINISHING_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Rate & Rate Source */}
                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Rate (৳)
                      </Label>
                      {item.rateSource && (
                        <span
                          className={cn(
                            'text-[9px] font-extrabold px-1 rounded uppercase tracking-tighter',
                            item.rateSource === 'custom'
                              ? 'bg-purple-100 text-purple-700'
                              : item.rateSource === 'last_invoice'
                              ? 'bg-blue-100 text-blue-700'
                              : item.rateSource === 'manual'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {item.rateSource === 'last_invoice'
                            ? 'Last Inv'
                            : item.rateSource === 'custom'
                            ? 'Special'
                            : item.rateSource === 'manual'
                            ? 'Manual'
                            : 'Std'}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="any"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                      className="h-9 text-xs rounded-lg font-mono font-bold text-right"
                    />
                  </div>
                </div>

                {/* Line Calculation & Remove Item */}
                <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <span>
                      {item.area > 0 ? `${item.area.toFixed(2)} ${item.unit} × ` : ''}
                      {item.quantity} pcs @ ৳{item.rate}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      = ৳{formatBDT(item.lineTotal)}
                    </span>
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: INVOICE CONFIGURATION & FINANCIAL TOTALS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Dates & Notes */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Terms & Billing Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Document Type</Label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-bold"
                >
                  <option value="sales_invoice">Standard Sales Invoice</option>
                  <option value="vat_invoice">NBR Mushak 6.3 Tax Invoice</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Payment Method (for Advance)</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-bold capitalize"
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="bkash">bKash Merchant / Personal</option>
                  <option value="nagad">Nagad MFS</option>
                  <option value="bank">Bank Transfer (EFT/NPSB)</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9 text-xs rounded-lg font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Payment Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Invoice Notes / Terms</Label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Specific delivery instructions, PO reference, or payment terms..."
                rows={2}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Column: Financial Summary */}
          <div className="lg:col-span-6 rounded-2xl border border-blue-200 bg-blue-50/30 dark:bg-slate-900 dark:border-blue-900/40 p-4 sm:p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
              <span>Financial Calculation</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                Server-Authoritative
              </Badge>
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-200/60 dark:divide-slate-800">
              {/* Subtotal */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 dark:text-slate-400">Subtotal ({calculatedItems.length} items):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">৳{formatBDT(subtotal)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Special Discount (৳):</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="h-8 w-28 text-right font-mono font-bold text-xs rounded-lg"
                />
              </div>

              {/* VAT */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400">VAT (%):</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={vatPercentage}
                    onChange={(e) => setVatPercentage(Math.max(0, Number(e.target.value)))}
                    className="h-8 w-20 text-right font-mono font-bold text-xs rounded-lg"
                  />
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-20 text-right">
                    +৳{formatBDT(vatAmount)}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between pt-2 text-sm font-black text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="text-base text-blue-700 dark:text-blue-400 font-mono">
                  ৳{formatBDT(grandTotal)}
                </span>
              </div>

              {/* Advance Amount */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Advance Received (৳):</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value)))}
                  className="h-8 w-28 text-right font-mono font-bold text-xs rounded-lg text-emerald-600"
                />
              </div>

              {/* Due Balance */}
              <div className="flex items-center justify-between pt-2 text-sm font-black">
                <span className="text-rose-600">Total Due Balance:</span>
                <span className="text-base text-rose-600 font-mono">৳{formatBDT(dueAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: SAVE-FIRST ACTION BAR */}
        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            <span className="font-bold text-slate-900 dark:text-white">Save-First Guarantee:</span> All actions
            persist to PostgreSQL ledger before printing or dispatching.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* 1. SAVE BUTTON */}
            <Button
              type="button"
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-xs"
            >
              {isSubmitting && submittingAction === 'save' ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Save Invoice</span>
                </div>
              )}
            </Button>

            {/* 2. SEND DROPDOWN */}
            <div className="relative" ref={sendMenuRef}>
              <Button
                type="button"
                onClick={() => setShowSendMenu(!showSendMenu)}
                disabled={isSubmitting}
                className="h-11 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
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
                <div className="absolute right-0 bottom-full mb-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-1.5 z-50 divide-y divide-slate-100 dark:divide-slate-800">
                  {/* WhatsApp Options */}
                  <div className="p-1 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 px-2 py-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> WhatsApp
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSend('whatsapp', 'pdf')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-between"
                    >
                      <span>Send PDF Document</span>
                      <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700">
                        PDF
                      </Badge>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend('whatsapp', 'text')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center justify-between"
                    >
                      <span>Send Text Summary</span>
                      <Badge variant="outline" className="text-[9px]">
                        Text
                      </Badge>
                    </button>
                  </div>

                  {/* Email Options */}
                  <div className="p-1 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 px-2 py-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSend('email', 'pdf')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between"
                    >
                      <span>Attach Invoice PDF</span>
                      <Badge variant="outline" className="text-[9px] border-blue-300 text-blue-700">
                        PDF
                      </Badge>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend('email', 'text')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between"
                    >
                      <span>Send Email Summary</span>
                      <Badge variant="outline" className="text-[9px]">
                        Text
                      </Badge>
                    </button>
                  </div>

                  {/* SMS Options */}
                  <div className="p-1 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-600 px-2 py-1 flex items-center gap-1">
                      <Smartphone className="h-3 w-3" /> SMS Gateway
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSend('sms', 'text')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between"
                    >
                      <span>Send SMS Text</span>
                      <Badge variant="outline" className="text-[9px]">
                        Text
                      </Badge>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend('sms', 'pdf')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between"
                    >
                      <span>SMS with PDF Link</span>
                      <Badge variant="outline" className="text-[9px] border-purple-300 text-purple-700">
                        Link
                      </Badge>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. PRINT BUTTON */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={isSubmitting}
              className="h-11 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1.5"
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
      </div>
    </ModalDialog>
  )
}
