'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import {
 Users,
 ArrowLeft,
 Phone,
 MessageSquare,
 Mail,
 MapPin,
 Building,
 CheckCircle2,
 AlertCircle,
 FileText,
 CreditCard,
 Send,
 Plus,
 Edit2,
 Tag,
 ShoppingBag,
 Clock,
 ExternalLink,
 ChevronRight,
 RotateCcw,
 Loader2,
 Receipt,
 Download,
 Calendar,
 Layers,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerFinancialSummaryCards } from '@/components/customers/customer-financial-summary'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { CustomerRatesTable } from '@/components/customers/customer-rates-table'
import { CustomerProductAnalytics } from '@/components/customers/customer-product-analytics'
import { CustomerTimeline } from '@/components/customers/customer-timeline'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { MoneyReceiptModal } from '@/components/billing/money-receipt-modal'
import {
 updateCustomerAction,
 toggleCustomerActiveAction,
 resolveCustomerRatesAction,
 getCustomerFinancialSummaryAction,
 getCustomerTimelineAction,
 getCustomerFullDetailsAction,
 logCustomerCommunicationAction,
} from '@/actions/customer.actions'
import { recordPaymentAction } from '@/actions/billing.actions'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'
import { formatCustomerIdNo } from '@/lib/formatters'
import {
 CustomerRecord,
 ResolvedProductRate,
 CustomerFinancialSummary,
 CustomerTimelineEvent,
 CustomerCategory,
 RateSource,
} from '@/types/crm.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { QuotationRecord } from '@/types/quotation.types'
import { SalesOrderRecord } from '@/types/order.types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

function getLocalInvoices(slug?: string, companySlug?: string, companyId?: string): InvoiceRecord[] {
 if (typeof window === 'undefined') return []
 const invoiceMap = new Map<string, InvoiceRecord>()
 const keys = [
 STORAGE_KEYS.INVOICES,
 slug ? `${STORAGE_KEYS.INVOICES}__${slug}` : null,
 companySlug ? `${STORAGE_KEYS.INVOICES}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.INVOICES}__${companyId}` : null,
  ].filter(Boolean) as string[]

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((inv) => {
 if (inv && inv.id) invoiceMap.set(inv.id, inv)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(PrintFlowDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, slug) || []),
    ...(PrintFlowDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, companySlug) || []),
    ...(PrintFlowDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []),
  ]
 storeItems.forEach((inv) => {
 if (inv && inv.id) invoiceMap.set(inv.id, inv)
  })

 return Array.from(invoiceMap.values())
}

function getLocalPayments(slug?: string, companySlug?: string, companyId?: string): PaymentRecord[] {
 if (typeof window === 'undefined') return []
 const paymentMap = new Map<string, PaymentRecord>()
 const keys = [
 STORAGE_KEYS.PAYMENTS,
 slug ? `${STORAGE_KEYS.PAYMENTS}__${slug}` : null,
 companySlug ? `${STORAGE_KEYS.PAYMENTS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.PAYMENTS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((p) => {
 if (p && p.id) paymentMap.set(p.id, p)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(PrintFlowDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, slug) || []),
    ...(PrintFlowDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, companySlug) || []),
    ...(PrintFlowDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []),
  ]
 storeItems.forEach((p) => {
 if (p && p.id) paymentMap.set(p.id, p)
  })

 return Array.from(paymentMap.values())
}

function getLocalQuotations(slug?: string, companySlug?: string, companyId?: string): QuotationRecord[] {
 if (typeof window === 'undefined') return []
 const quoteMap = new Map<string, QuotationRecord>()
 const keys = [
 STORAGE_KEYS.QUOTATIONS,
 slug ? `${STORAGE_KEYS.QUOTATIONS}__${slug}` : null,
 companySlug ? `${STORAGE_KEYS.QUOTATIONS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.QUOTATIONS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((q) => {
 if (q && q.id) quoteMap.set(q.id, q)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(PrintFlowDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, slug) || []),
    ...(PrintFlowDataStore.getAll<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, companySlug) || []),
    ...(PrintFlowDataStore.get<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS) || []),
  ]
 storeItems.forEach((q) => {
 if (q && q.id) quoteMap.set(q.id, q)
  })

 return Array.from(quoteMap.values())
}

function getLocalOrders(slug?: string, companySlug?: string, companyId?: string): SalesOrderRecord[] {
 if (typeof window === 'undefined') return []
 const ordMap = new Map<string, SalesOrderRecord>()
 const keys = [
 STORAGE_KEYS.ORDERS,
 slug ? `${STORAGE_KEYS.ORDERS}__${slug}` : null,
 companySlug ? `${STORAGE_KEYS.ORDERS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.ORDERS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((ord) => {
 if (ord && ord.id) ordMap.set(ord.id, ord)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(PrintFlowDataStore.getAll<SalesOrderRecord>(STORAGE_KEYS.ORDERS, slug) || []),
    ...(PrintFlowDataStore.getAll<SalesOrderRecord>(STORAGE_KEYS.ORDERS, companySlug) || []),
    ...(PrintFlowDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []),
  ]
 storeItems.forEach((ord) => {
 if (ord && ord.id) ordMap.set(ord.id, ord)
  })

 return Array.from(ordMap.values())
}

function getLocalCustomers(slug?: string, companySlug?: string, companyId?: string): CustomerRecord[] {
 if (typeof window === 'undefined') return []
 const custMap = new Map<string, CustomerRecord>()
 const keys = [
 STORAGE_KEYS.CUSTOMERS,
 slug ? `${STORAGE_KEYS.CUSTOMERS}__${slug}` : null,
 companySlug ? `${STORAGE_KEYS.CUSTOMERS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.CUSTOMERS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((c) => {
 if (c && c.id) custMap.set(c.id, c)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(PrintFlowDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, slug) || []),
    ...(PrintFlowDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, companySlug) || []),
    ...(PrintFlowDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []),
  ]
 storeItems.forEach((c) => {
 if (c && c.id) custMap.set(c.id, c)
  })

 return Array.from(custMap.values())
}

function deriveCustomerRates(
 customerId: string,
 customerName: string,
 invoices: InvoiceRecord[],
 quotations: QuotationRecord[]
): ResolvedProductRate[] {
 const products = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
 const customOverrides = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.CUSTOMER_RATES) || []

 const productMap = new Map<string, any>()
 products.forEach((p: any) => {
 if (p && p.id) productMap.set(p.id, p)
  })

 invoices.forEach((inv) => {
 const items = inv.items || (inv as any).line_items || []
 items.forEach((it: any) => {
 const pId = it.product_id || it.id || it.name
 if (pId && !productMap.has(pId)) {
 productMap.set(pId, {
 id: pId,
 name: it.name || it.item_name || 'Product',
 unit: it.unit || 'pcs',
 base_price: Number(it.unit_price) || 0,
        })
      }
    })
  })

 quotations.forEach((q) => {
 const items = q.items || (q as any).line_items || []
 items.forEach((it: any) => {
 const pId = it.product_id || it.id || it.name
 if (pId && !productMap.has(pId)) {
 productMap.set(pId, {
 id: pId,
 name: it.name || (it as any).item_name || 'Product',
 unit: it.unit || 'pcs',
 base_price: Number(it.unit_rate ?? (it as any).unit_price ?? (it as any).rate ?? 0),
        })
      }
    })
  })

 const allProds = Array.from(productMap.values())

 return allProds.map((prod) => {
 let lastInvRate: number | null = null
 let lastInvNum: string | null = null
 let lastInvDate: string | null = null

 for (const inv of invoices) {
 if (inv.status === 'cancelled') continue
 const items = inv.items || (inv as any).line_items || []
 const match = items.find(
        (it: any) => (it.product_id && it.product_id === prod.id) || (it.name && prod.name && it.name.trim().toLowerCase() === prod.name.trim().toLowerCase())
      )
 if (match && typeof match.unit_price === 'number') {
 lastInvRate = match.unit_price
 lastInvNum = inv.invoice_number
 lastInvDate = inv.invoice_date || inv.created_at?.split('T')[0] || null
 break
      }
    }

 let lastQuoteRate: number | null = null
 let lastQuoteNum: string | null = null
 let lastQuoteDate: string | null = null

 for (const q of quotations) {
 if (q.status === 'rejected' || q.status === 'expired') continue
 const items = q.items || (q as any).line_items || []
 const match = items.find(
        (it: any) => (it.product_id && it.product_id === prod.id) || ((it.description || (it as any).name) && prod.name && (it.description || (it as any).name).trim().toLowerCase() === prod.name.trim().toLowerCase())
      )
 if (match && (typeof match.unit_rate === 'number' || typeof (match as any).unit_price === 'number' || typeof (match as any).rate === 'number')) {
 lastQuoteRate = Number(match.unit_rate ?? (match as any).unit_price ?? (match as any).rate)
 lastQuoteNum = q.quotation_number
 lastQuoteDate = q.quotation_date || q.created_at?.split('T')[0] || null
 break
      }
    }

 const customOverride = customOverrides.find(
      (cr: any) => cr.product_id === prod.id && cr.customer_id === customerId
    )
 const customRate = customOverride ? Number(customOverride.rate) : null
 const baseRate = Number(prod.base_price || prod.unit_price || prod.selling_price || (prod as any).rate || 0)

 let effectiveRate = baseRate
 let source: RateSource = 'default'
 if (customRate !== null && !isNaN(customRate)) {
 effectiveRate = customRate
 source = 'custom'
    } else if (lastInvRate !== null) {
 effectiveRate = lastInvRate
 source = 'last_invoice'
    } else if (lastQuoteRate !== null) {
 effectiveRate = lastQuoteRate
 source = 'last_quotation'
    }

 return {
 productId: prod.id,
 productName: prod.name,
 productNameBn: prod.name_bn || null,
 sku: prod.sku || prod.code || '',
 unit: prod.unit || 'pcs',
 category: prod.category || prod.product_category || 'general',
 customerRate: customRate,
 defaultRate: baseRate,
 effectiveRate,
 source,
 hasCustomRate: customRate !== null,
 lastInvoiceRate: lastInvRate,
 lastInvoiceNumber: lastInvNum,
 lastInvoiceDate: lastInvDate,
 lastQuotationRate: lastQuoteRate,
 lastQuotationNumber: lastQuoteNum,
 lastQuotationDate: lastQuoteDate,
    }
  })
}

export default function CustomerProfilePage() {
 const params = useParams()
 const router = useRouter()
 const pathname = usePathname()
 const customerId = (params?.id as string) || (params?.customerId as string) || ''
 const { company } = useTenant()
 const { can } = usePermissions()
 const { tBilingual } = useI18n()

 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
 const companyId = company?.id
 const [isMounted, setIsMounted] = useState(false)

  // Data State
 const [customer, setCustomer] = useState<CustomerRecord | null>(null)
 const [financialSummary, setFinancialSummary] = useState<CustomerFinancialSummary>({
 totalInvoices: 0,
 totalInvoiceAmount: 0,
 totalPaid: 0,
 totalDue: 0,
 lastPayment: null,
 lastOrder: null,
  })
 const [rates, setRates] = useState<ResolvedProductRate[]>([])
 const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
 const [payments, setPayments] = useState<PaymentRecord[]>([])
 const [quotations, setQuotations] = useState<QuotationRecord[]>([])
 const [orders, setOrders] = useState<SalesOrderRecord[]>([])
 const [timelineEvents, setTimelineEvents] = useState<CustomerTimelineEvent[]>([])

 const [isLoading, setIsLoading] = useState(true)
 const [isError, setIsError] = useState(false)
 const [errorText, setErrorText] = useState('')

 useEffect(() => {
 setIsMounted(true)
  }, [])

  // Tab State
 const [activeTab, setActiveTab] = useState<
    'overview' | 'invoices' | 'payments' | 'quotations' | 'products' | 'rates' | 'activity'
  >('overview')

  // Modals & Forms
 const [isEditOpen, setIsEditOpen] = useState(false)
 const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)
 const [isLogCommOpen, setIsLogCommOpen] = useState(false)
 const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false)
 const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null)
 const [notification, setNotification] = useState<string | null>(null)

  // Edit Customer Form State
 const [editCustomerIdNo, setEditCustomerIdNo] = useState('')
 const [editCustomerCode, setEditCustomerCode] = useState('')
 const [editName, setEditName] = useState('')
 const [editNameBn, setEditNameBn] = useState('')
 const [editCompanyName, setEditCompanyName] = useState('')
 const [editContactPerson, setEditContactPerson] = useState('')
 const [editMobile, setEditMobile] = useState('')
 const [editWhatsapp, setEditWhatsapp] = useState('')
 const [editEmail, setEditEmail] = useState('')
 const [editArea, setEditArea] = useState('')
 const [editAddress, setEditAddress] = useState('')
 const [editCustomerType, setEditCustomerType] = useState<CustomerCategory>('retail')
 const [editCreditLimit, setEditCreditLimit] = useState<number>(0)
 const [editNotes, setEditNotes] = useState('')
 const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Payment Recording Form State
 const [payAmount, setPayAmount] = useState('')
 const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'>('cash')
 const [payInvoiceId, setPayInvoiceId] = useState('')
 const [payNotes, setPayNotes] = useState('')
 const [isRecordingPayment, setIsRecordingPayment] = useState(false)

  // Communication Log Form State
 const [commType, setCommType] = useState<'phone_call' | 'whatsapp_message' | 'email' | 'meeting' | 'site_visit'>('phone_call')
 const [commSummary, setCommSummary] = useState('')
 const [commDetails, setCommDetails] = useState('')
 const [isLoggingComm, setIsLoggingComm] = useState(false)

  // Toggle active confirm modal state
 const [isToggleActiveConfirmOpen, setIsToggleActiveConfirmOpen] = useState(false)
 const [pendingActiveStatus, setPendingActiveStatus] = useState<boolean | null>(null)

 const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
 setNotification(msg)
 dispatchToast({
 type,
 title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
 titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
 message: msg,
    })
 setTimeout(() => setNotification(null), 3500)
  }

  // Load all 360 data
 const loadCustomerData = useCallback(async () => {
 if (!companyId || !customerId) return
 setIsLoading(true)
 setIsError(false)

 try {
 const localCusts = getLocalCustomers(slug, company?.slug, companyId)
 const foundLocalCust = localCusts.find((c) => c.id === customerId || (c as any)._id === customerId) || null

 const res = await getCustomerFullDetailsAction(customerId, companyId).catch(() => null)
 let cust = res?.success && res.data?.customer ? res.data.customer : foundLocalCust

 if (!cust) {
 setIsError(true)
 setErrorText(res?.error || 'Customer profile not found or removed.')
 setIsLoading(false)
 return
      }

      // Format customer ID no
 if (!cust.customer_id_no) {
 cust = {
          ...cust,
 customer_id_no: formatCustomerIdNo(cust),
        }
      }

      // Local collections
 const localInvs = getLocalInvoices(slug, company?.slug, companyId).filter(
        (i) => (i.customer_id === customerId || (i.customer_name && cust && i.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())) && i.status !== 'cancelled'
      )
 const localPays = getLocalPayments(slug, company?.slug, companyId).filter(
        (p) => p.customer_id === customerId || (p.customer_name && cust && p.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
      )
 const localQuotes = getLocalQuotations(slug, company?.slug, companyId).filter(
        (q) => q.customer_id === customerId || (q.customer_name && cust && q.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
      )
 const localOrds = getLocalOrders(slug, company?.slug, companyId).filter(
        (o) => o.customer_id === customerId || (o.customer_name && cust && o.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
      )

      // Merge server and local arrays
 const invMap = new Map<string, InvoiceRecord>()
 if (res?.data?.invoices) {
 res.data.invoices.forEach((i) => { if (i && i.id) invMap.set(i.id, i) })
      }
 localInvs.forEach((i) => { if (i && i.id) invMap.set(i.id, i) })
 const mergedInvs = Array.from(invMap.values()).sort(
        (a, b) => (b.invoice_date || b.created_at || '').localeCompare(a.invoice_date || a.created_at || '')
      )

 const payMap = new Map<string, PaymentRecord>()
 if (res?.data?.payments) {
 res.data.payments.forEach((p) => { if (p && p.id) payMap.set(p.id, p) })
      }
 localPays.forEach((p) => { if (p && p.id) payMap.set(p.id, p) })
 const mergedPays = Array.from(payMap.values()).sort(
        (a, b) => (b.payment_date || b.created_at || '').localeCompare(a.payment_date || a.created_at || '')
      )

 const quoteMap = new Map<string, QuotationRecord>()
 if (res?.data?.quotations) {
 res.data.quotations.forEach((q) => { if (q && q.id) quoteMap.set(q.id, q) })
      }
 localQuotes.forEach((q) => { if (q && q.id) quoteMap.set(q.id, q) })
 const mergedQuotes = Array.from(quoteMap.values()).sort(
        (a, b) => (b.quotation_date || b.created_at || '').localeCompare(a.quotation_date || a.created_at || '')
      )

 const ordMap = new Map<string, SalesOrderRecord>()
 if (res?.data?.orders) {
 res.data.orders.forEach((o) => { if (o && o.id) ordMap.set(o.id, o) })
      }
 localOrds.forEach((o) => { if (o && o.id) ordMap.set(o.id, o) })
 const mergedOrds = Array.from(ordMap.values()).sort(
        (a, b) => (b.order_date || b.created_at || '').localeCompare(a.order_date || a.created_at || '')
      )

      // Recompute financial metrics accurately
 const totalInvoicesCount = mergedInvs.length
 const totalInvoiceAmount = mergedInvs.reduce((sum, i) => sum + (Number(i.grand_total) || 0), 0)
 let totalPaidAmount = mergedInvs.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
 const totalDirectPayments = mergedPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
 if (totalDirectPayments > totalPaidAmount) {
 totalPaidAmount = totalDirectPayments
      }
 const totalDueAmount = Math.max(0, totalInvoiceAmount - totalPaidAmount)
 const todayStr = new Date().toISOString().split('T')[0]
 const totalOverdueAmount = mergedInvs
        .filter((i) => (Number(i.due_amount) > 0 || (i.status !== 'paid' && Number(i.grand_total) > Number(i.paid_amount))) && i.due_date && i.due_date.split('T')[0] < todayStr)
        .reduce((sum, i) => sum + (Number(i.due_amount) || Math.max(0, Number(i.grand_total) - Number(i.paid_amount))), 0)

 const creditLimit = Number(cust.credit_limit) || 0
 const availableCredit = Math.max(0, creditLimit - totalDueAmount)

 let lastPayment: CustomerFinancialSummary['lastPayment'] = res?.data?.financialSummary?.lastPayment || null
 if (mergedPays.length > 0) {
 lastPayment = {
 amount: Number(mergedPays[0].amount) || 0,
 date: mergedPays[0].payment_date || mergedPays[0].created_at,
 receiptNumber: mergedPays[0].receipt_number,
 paymentMethod: mergedPays[0].payment_method,
        }
      }

 let lastOrder: CustomerFinancialSummary['lastOrder'] = res?.data?.financialSummary?.lastOrder || null
 if (mergedOrds.length > 0) {
 lastOrder = {
 orderNumber: mergedOrds[0].order_number,
 date: mergedOrds[0].order_date || mergedOrds[0].created_at,
 amount: Number(mergedOrds[0].final_price) || 0,
 status: mergedOrds[0].status,
        }
      } else if (mergedInvs.length > 0) {
 lastOrder = {
 orderNumber: mergedInvs[0].invoice_number,
 date: mergedInvs[0].invoice_date || mergedInvs[0].created_at,
 amount: Number(mergedInvs[0].grand_total) || 0,
 status: mergedInvs[0].status,
        }
      }

 const calculatedFin: CustomerFinancialSummary = {
 totalInvoices: totalInvoicesCount,
 totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100,
 totalPaid: Math.round(totalPaidAmount * 100) / 100,
 totalDue: Math.round(totalDueAmount * 100) / 100,
 totalOverdue: Math.round(totalOverdueAmount * 100) / 100,
 creditLimit,
 availableCredit: Math.round(availableCredit * 100) / 100,
 paymentTerms: cust.payment_terms || 'cash_on_delivery',
 lastPayment,
 lastOrder,
      }

      // Rates resolution
 let resolvedRates: ResolvedProductRate[] = res?.data?.rates || []
 if (resolvedRates.length === 0) {
 resolvedRates = deriveCustomerRates(customerId, cust.name, mergedInvs, mergedQuotes)
      } else {
 resolvedRates = resolvedRates.map((r) => {
 if (!r.lastQuotationRate) {
 for (const q of mergedQuotes) {
 const items = q.items || (q as any).line_items || []
 const match = items.find((it: any) => it.product_id === r.productId || ((it.description || it.name) && (it.description || it.name).trim().toLowerCase() === r.productName.trim().toLowerCase()))
 if (match && (typeof match.unit_rate === 'number' || typeof (match as any).unit_price === 'number' || typeof (match as any).rate === 'number')) {
 return {
                  ...r,
 lastQuotationRate: Number(match.unit_rate ?? (match as any).unit_price ?? (match as any).rate),
 lastQuotationNumber: q.quotation_number,
 lastQuotationDate: q.quotation_date || q.created_at?.split('T')[0] || null,
                }
              }
            }
          }
 return r
        })
      }

      // Timeline events
 let events: CustomerTimelineEvent[] = res?.data?.timelineEvents || []
 if (events.length === 0) {
 mergedInvs.forEach((inv) => {
 events.push({
 id: `inv-event-${inv.id}`,
 type: 'invoice_created',
 title: `Invoice #${inv.invoice_number}`,
 description: `Sales invoice #${inv.invoice_number} created for ৳${Number(inv.grand_total).toLocaleString('en-IN')}`,
 timestamp: inv.created_at || inv.invoice_date || new Date().toISOString(),
 amount: Number(inv.grand_total) || 0,
 referenceType: 'invoice',
 referenceId: inv.id,
 referenceNumber: inv.invoice_number,
          })
        })
 mergedPays.forEach((pay) => {
 events.push({
 id: `pay-event-${pay.id}`,
 type: 'payment_received',
 title: `Payment Receipt MR #${pay.receipt_number}`,
 description: `Payment of ৳${Number(pay.amount).toLocaleString('en-IN')} received via ${(pay.payment_method || 'cash').toUpperCase()}`,
 timestamp: pay.created_at || pay.payment_date || new Date().toISOString(),
 amount: Number(pay.amount) || 0,
 referenceType: 'payment',
 referenceId: pay.id,
 referenceNumber: pay.receipt_number,
          })
        })
 mergedQuotes.forEach((quote) => {
 events.push({
 id: `quote-event-${quote.id}`,
 type: 'quotation_created',
 title: `Quotation #${quote.quotation_number}`,
 description: `Price quotation #${quote.quotation_number} generated for ৳${Number(quote.grand_total).toLocaleString('en-IN')}`,
 timestamp: quote.created_at || quote.quotation_date || new Date().toISOString(),
 amount: Number(quote.grand_total) || 0,
 referenceType: 'quotation',
 referenceId: quote.id,
 referenceNumber: quote.quotation_number,
          })
        })
 mergedOrds.forEach((ord) => {
 events.push({
 id: `order-event-${ord.id}`,
 type: 'order_created',
 title: `Production Order #${ord.order_number}`,
 description: `Commercial job #${ord.order_number} confirmed with status ${ord.status.replace('_', ' ')}`,
 timestamp: ord.created_at || ord.order_date || new Date().toISOString(),
 referenceType: 'order',
 referenceId: ord.id,
 referenceNumber: ord.order_number,
          })
        })
 events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      }

 setCustomer(cust)
 setFinancialSummary(calculatedFin)
 setRates(resolvedRates)
 setTimelineEvents(events)
 setInvoices(mergedInvs)
 setPayments(mergedPays)
 setQuotations(mergedQuotes)
 setOrders(mergedOrds)

      // Pre-fill edit form
 setEditCustomerIdNo(cust.customer_id_no || formatCustomerIdNo(cust))
 setEditCustomerCode(cust.customer_code || '')
 setEditName(cust.name)
 setEditNameBn(cust.name_bn || '')
 setEditCompanyName(cust.company_name || '')
 setEditContactPerson(cust.contact_person || '')
 setEditMobile(cust.mobile)
 setEditWhatsapp(cust.whatsapp || '')
 setEditEmail(cust.email || '')
 setEditArea(cust.area || '')
 setEditAddress(cust.address || '')
 setEditCustomerType(cust.customer_category || cust.customer_type || 'retail')
 setEditCreditLimit(cust.credit_limit || 0)
 setEditNotes(cust.notes || '')
    } catch {
 setIsError(true)
 setErrorText('Failed to load customer profile.')
    } finally {
 setIsLoading(false)
    }
  }, [company?.slug, companyId, customerId, slug])

 useEffect(() => {
 loadCustomerData()

 const handleSync = () => {
 loadCustomerData()
    }
 if (typeof window !== 'undefined') {
 window.addEventListener('storage', handleSync)
 window.addEventListener('printflow_table_synced:customers', handleSync)
 window.addEventListener('printflow_table_synced:invoices', handleSync)
 window.addEventListener('printflow_table_synced:payments', handleSync)
 window.addEventListener('printflow_table_synced:quotations', handleSync)
 window.addEventListener('printflow_table_synced:orders', handleSync)
 window.addEventListener('printflow_data_sync', handleSync)
 return () => {
 window.removeEventListener('storage', handleSync)
 window.removeEventListener('printflow_table_synced:customers', handleSync)
 window.removeEventListener('printflow_table_synced:invoices', handleSync)
 window.removeEventListener('printflow_table_synced:payments', handleSync)
 window.removeEventListener('printflow_table_synced:quotations', handleSync)
 window.removeEventListener('printflow_table_synced:orders', handleSync)
 window.removeEventListener('printflow_data_sync', handleSync)
      }
    }
  }, [loadCustomerData])

  // Handle Edit Customer
 const handleSaveEdit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!companyId || !customer) return
 setIsSavingEdit(true)

 try {
 const res = await updateCustomerAction(
 customer.id,
        {
 customer_id_no: editCustomerIdNo.trim() || null,
 customer_code: editCustomerCode.trim() || null,
 name: editName.trim(),
 name_bn: editNameBn.trim() || null,
 company_name: editCompanyName.trim() || null,
 contact_person: editContactPerson.trim() || null,
 mobile: editMobile.trim(),
 whatsapp: editWhatsapp.trim() || null,
 email: editEmail.trim() || null,
 area: editArea.trim() || null,
 address: editAddress.trim() || null,
 customer_category: editCustomerType,
 credit_limit: editCreditLimit,
 notes: editNotes.trim() || null,
        },
 companyId
      )

 if (res.success && res.data) {
 setCustomer(res.data)
 setIsEditOpen(false)
 showNotification('Customer profile updated successfully.')
 loadCustomerData()
      } else {
 showNotification(res.error || 'Failed to update customer.', 'error')
      }
    } catch {
 showNotification('Network error updating customer.', 'error')
    } finally {
 setIsSavingEdit(false)
    }
  }

  // Handle Toggle Customer Active / Inactive Status
 const [isTogglingActive, setIsTogglingActive] = useState(false)
 const handleToggleActive = () => {
 if (!companyId || !customer) return
 const newStatus = customer.is_active === false
 setPendingActiveStatus(newStatus)
 setIsToggleActiveConfirmOpen(true)
  }

 const confirmToggleActive = async () => {
 if (!companyId || !customer || pendingActiveStatus === null) return
 const newStatus = pendingActiveStatus
 const actionName = newStatus ? 'Reactivate' : 'Deactivate'

 setIsTogglingActive(true)
 try {
 const res = await toggleCustomerActiveAction(customer.id, newStatus, companyId)
 if (res.success && res.data) {
 setCustomer(res.data)
 showNotification(`Customer successfully ${newStatus ? 'reactivated' : 'deactivated'}.`)
 setIsToggleActiveConfirmOpen(false)
 setPendingActiveStatus(null)
 loadCustomerData()
      } else {
 showNotification(res.error || `Failed to ${actionName.toLowerCase()} customer.`, 'error')
      }
    } catch {
 showNotification(`Network error while attempting to ${actionName.toLowerCase()} customer.`, 'error')
    } finally {
 setIsTogglingActive(false)
    }
  }

  // Handle Record Payment
 const handleRecordPayment = async (e: React.FormEvent) => {
 e.preventDefault()
 const amt = parseFloat(payAmount)
 if (isNaN(amt) || amt <= 0) {
 showNotification('Please enter a valid payment amount.', 'error')
 return
    }

 if (!companyId || !customer) return
 setIsRecordingPayment(true)

 try {
 const res = await recordPaymentAction(
        {
 customer_id: customer.id,
 customer_name: customer.name,
 amount: amt,
 payment_method: payMethod as any,
 invoice_id: payInvoiceId || undefined,
 notes: payNotes.trim() || undefined,
        },
 companyId
      )

 if (!res.success) {
 showNotification(res.error || 'Failed to record payment.', 'error')
 return
      }

 setIsRecordPayOpen(false)
 setPayAmount('')
 setPayNotes('')
 showNotification(`Payment of ৳${amt} recorded successfully.`)
 loadCustomerData()
    } catch (err: any) {
 showNotification(err?.message || 'Failed to record payment.', 'error')
    } finally {
 setIsRecordingPayment(false)
    }
  }

  // Handle Log Communication
 const handleLogComm = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!commSummary.trim() || !companyId || !customer) return
 setIsLoggingComm(true)

 try {
 const res = await logCustomerCommunicationAction(
        {
 customerId: customer.id,
 type: commType,
 summary: commSummary.trim(),
 details: commDetails.trim() || null,
        },
 companyId
      )

 if (!res.success) {
 showNotification(res.error || 'Failed to log communication.', 'error')
 return
      }

 setIsLogCommOpen(false)
 setCommSummary('')
 setCommDetails('')
 showNotification('Communication logged successfully.')
 loadCustomerData()
    } catch {
 showNotification('Failed to log communication.', 'error')
    } finally {
 setIsLoggingComm(false)
    }
  }

 if (!isMounted || isLoading) {
 return (
      <div className="space-y-6 mx-auto pb-12">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse"/>
        <div className="h-40 rounded-xl bg-muted animate-pulse"/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse"/>
          ))}
        </div>
      </div>
    )
  }

 if (isError || !customer) {
 return (
      <div className="space-y-6 mx-auto py-8 text-center">
        <Card className="p-12 space-y-4 border-danger-border border-danger-border">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto"/>
          <h2 className="text-lg font-bold text-foreground">
            {errorText || 'Customer Profile Not Found'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 The requested customer profile could not be loaded or you do not have permission to view it.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm"variant="outline"onClick={loadCustomerData}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5"/>
 Retry
            </Button>
            <Link href={getTenantNavHref('/customers', pathname, slug)}>
              <Button size="sm"className="bg-primary hover:bg-primary">
 Back to Customer Directory
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

 const custType = customer.customer_category || customer.customer_type || 'retail'
 const hasDue = financialSummary.totalDue > 0

 const unpaidInvoices = invoices.filter(
    (inv) => inv.status === 'unpaid' || inv.status === 'partially_paid' || Number(inv.due_amount) > 0
  )
 const openQuotations = quotations.filter(
    (q) => q.status === 'draft' || q.status === 'sent' || (q.status as string) === 'pending'
  )
 const activeOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'in_production' || (o.status as string) === 'processing' || o.status === 'draft'
  )
 const hasOpenWork = unpaidInvoices.length > 0 || openQuotations.length > 0 || activeOrders.length > 0

 return (
    <PanelAccessGuard
 module="customers"action="view"panelTitle="Customer 360 Profile"panelTitleBn="গ্রাহক ৩৬০ প্রোফাইল">
      <div className="space-y-6 mx-auto pb-16">
      {/* Back to Customer Directory link */}
      <div className="flex items-center justify-between">
        <Link
 href={getTenantNavHref('/customers', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5"/>
          <span>Back to Customers</span>
        </Link>

        {customer.created_at && (
          <span className="text-xs text-muted-foreground">
 Customer since {new Date(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-success-surface border border-success-border bg-success-surface border-success-border text-success text-success text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Customer 360 Header Profile Card */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Customer Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {customer.name}
                </h1>
                {customer.name_bn && (
                  <span className="text-sm font-semibold text-muted-foreground">
                    ({customer.name_bn})
                  </span>
                )}
                <span className="tabular-nums text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                  {formatCustomerIdNo(customer)}
                </span>
                <Badge
 variant="outline"className={cn(
                    'text-xs font-bold uppercase tracking-wider',
 custType === 'corporate' && 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary',
 custType === 'agency' && 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary',
 custType === 'reseller' && 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary',
 custType === 'government' && 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning',
 custType === 'retail' && 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                  )}
                >
                  {custType === 'corporate'
                    ? tBilingual('Corporate', 'কর্পোরেট')
                    : custType === 'agency'
                    ? tBilingual('Agency', 'এজেন্সি')
                    : custType === 'reseller'
                    ? tBilingual('Reseller', 'রিসেলার')
                    : custType === 'government'
                    ? tBilingual('Government', 'সরকারি')
                    : tBilingual('Retail', 'খুচরা')}
                </Badge>
                {customer.is_active === false && (
                  <Badge variant="destructive"className="text-xs font-bold uppercase tracking-wider bg-danger-surface text-destructive border-danger-border">
                    {tBilingual('Inactive', 'নিষ্ক্রিয়')}
                  </Badge>
                )}
              </div>

              {/* Company & Contact Person */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {customer.company_name && (
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Building className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span>{customer.company_name}</span>
                  </div>
                )}
                {customer.contact_person && (
                  <div>
                    {tBilingual('Contact:', 'যোগাযোগ:')} <strong className="text-foreground">{customer.contact_person}</strong>
                  </div>
                )}
                {customer.area && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground"/>
                    <span>{customer.area}</span>
                  </div>
                )}
              </div>

              {/* Full Address */}
              {customer.address && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {customer.address}
                </p>
              )}
            </div>

            {/* Direct Contact & Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Phone Call */}
              <a
 href={`tel:${customer.mobile}`}
 className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-muted hover:bg-muted font-bold text-xs text-foreground"title="Call Customer">
                <Phone className="h-3.5 w-3.5 text-primary"/>
                <span>{customer.mobile}</span>
              </a>

              {/* WhatsApp Chat */}
              {customer.whatsapp && (
                <a
 href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
 target="_blank"rel="noreferrer"className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-success-surface bg-success-surface/60 text-success text-success hover:bg-success-surface border border-success-border border-success-border font-bold text-xs"title="Direct WhatsApp Chat">
                  <MessageSquare className="h-3.5 w-3.5 text-success"/>
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Edit Customer */}
              {can('edit', 'customers') && (
                <Button
 size="sm"variant="outline"onClick={() => setIsEditOpen(true)}
 className="h-9 text-xs font-semibold">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5"/>
                  <span>{tBilingual('Edit', 'সম্পাদনা')}</span>
                </Button>
              )}

              {/* Deactivate / Reactivate Customer */}
              {can('edit', 'customers') && (
                <Button
 size="sm"variant="outline"onClick={handleToggleActive}
 disabled={isTogglingActive}
 className={cn(
                    'h-9 text-xs font-semibold transition-colors',
 customer.is_active === false
                      ? 'text-success border-success-border hover:bg-success-surface text-success border-success-border'
                      : 'text-muted-foreground border-border hover:bg-danger-surface hover:text-destructive hover:border-danger-border dark:hover:bg-danger-surface'
                  )}
                >
                  {customer.is_active === false
                    ? tBilingual('Reactivate', 'পুনরায় সক্রিয় করুন')
                    : tBilingual('Deactivate', 'নিষ্ক্রিয় করুন')}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
            <Button
 size="sm"onClick={() => setIsNewInvoiceOpen(true)}
 className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8">
              <Receipt className="h-3.5 w-3.5 mr-1.5"/>
              <span>{tBilingual('Create Invoice', 'ইনভয়েস তৈরি')}</span>
            </Button>

            <Link href={getTenantNavHref(`/quotations/new?customerId=${customer.id}`, pathname, slug)}>
              <Button size="sm"variant="outline"className="text-xs font-semibold h-8">
                <Send className="h-3.5 w-3.5 mr-1.5"/>
                <span>{tBilingual('New Quotation', 'নতুন কোটেশন')}</span>
              </Button>
            </Link>

            {hasDue && (
              <Button
 size="sm"variant="outline"onClick={() => setIsRecordPayOpen(true)}
 className="text-xs font-bold text-success text-success border-success-border border-success-border bg-success-surface/50 bg-success-surface h-8">
                <CreditCard className="h-3.5 w-3.5 mr-1.5"/>
                <span>{tBilingual('Record Payment', 'পেমেন্ট গ্রহণ')}</span>
              </Button>
            )}

            <Button
 size="sm"variant="outline"onClick={() => setIsLogCommOpen(true)}
 className="text-xs font-medium text-muted-foreground h-8 ml-auto">
              <Phone className="h-3 w-3 mr-1"/>
              <span>{tBilingual('Log Comm', 'যোগাযোগ রেকর্ড')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer Financial Summary Cards */}
      <CustomerFinancialSummaryCards summary={financialSummary} />

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-border bg-card rounded-xl p-1.5 gap-1 overflow-x-auto shadow-xs text-xs">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
          { key: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { key: 'quotations', label: `Quotations (${quotations.length})`, icon: Send },
          { key: 'products', label: 'Products Purchased', icon: ShoppingBag },
          { key: 'rates', label: `Rates Sheet (${rates.length})`, icon: Tag },
          { key: 'activity', label: 'Timeline & History', icon: Clock },
        ].map((t) => {
 const Icon = t.icon
 const isActive = activeTab === t.key

 return (
            <button
 key={t.key}
 onClick={() => setActiveTab(t.key as any)}
 className={cn(
                'py-2 px-3.5 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-colors',
 isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5"/>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Open Work & Action Items Section */}
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="p-4 bg-muted border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className={cn("h-4 w-4", hasDue ?"text-warning":"text-primary")} />
                <CardTitle className="text-sm font-bold text-foreground">
 Open Business & Action Items
                </CardTitle>
              </div>
              <Badge variant="outline"className="text-xs font-semibold">
                {unpaidInvoices.length} Unpaid • {openQuotations.length} Open Quotes • {activeOrders.length} Active Orders
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {!hasOpenWork ? (
                <div className="p-4 text-center text-xs text-success text-success font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success"/>
                  <span>All customer accounts are settled — no outstanding dues, open quotes or active orders.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Unpaid Invoices */}
                  <div className="rounded-xl border border-border p-3 bg-muted space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-destructive"/>
 Unpaid Invoices ({unpaidInvoices.length})
                      </span>
                      {unpaidInvoices.length > 0 && (
                        <button
 onClick={() => setIsRecordPayOpen(true)}
 className="text-xs font-bold text-success hover:underline">
                          {tBilingual('Pay', 'পরিশোধ')}
                        </button>
                      )}
                    </div>
                    {unpaidInvoices.length === 0 ? (
                      <p className="text-xs text-success text-success font-medium py-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3"/> Account Settled (No unpaid invoices)
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {unpaidInvoices.map((inv) => (
                          <div
 key={inv.id}
 className="p-2 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                            <div>
                              <Link
 href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
 className="font-bold text-primary hover:underline flex items-center gap-1">
                                {inv.invoice_number}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {inv.invoice_date}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-destructive text-xs">
 Due ৳{Number(inv.due_amount).toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs text-muted-foreground">
 Total ৳{Number(inv.grand_total).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Open Quotations */}
                  <div className="rounded-xl border border-border p-3 bg-muted space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-warning"/>
 Open Quotations ({openQuotations.length})
                      </span>
                      <Link
 href={getTenantNavHref(`/quotations/new?customerId=${customer.id}`, pathname, slug)}
 className="text-xs font-bold text-primary hover:underline">
                        {tBilingual('New Quote', 'নতুন কোটেশন')}
                      </Link>
                    </div>
                    {openQuotations.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No pending quotations</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {openQuotations.map((q) => (
                          <div
 key={q.id}
 className="p-2 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                            <div>
                              <Link
 href={getTenantNavHref('/quotations', pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1">
                                {q.quotation_number}
                              </Link>
                              <div className="text-xs text-muted-foreground capitalize">
 Status: {q.status}
                              </div>
                            </div>
                            <div className="font-bold text-foreground text-xs">
                              ৳{Number(q.grand_total).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Orders */}
                  <div className="rounded-xl border border-border p-3 bg-muted space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-primary"/>
 Active Orders ({activeOrders.length})
                      </span>
                      <Link
 href={getTenantNavHref('/orders', pathname, slug)}
 className="text-xs font-bold text-primary hover:underline">
 View
                      </Link>
                    </div>
                    {activeOrders.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No active production orders</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {activeOrders.map((ord) => (
                          <div
 key={ord.id}
 className="p-2 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                            <div>
                              <Link
 href={getTenantNavHref('/orders', pathname, slug)}
 className="font-bold text-foreground hover:text-primary flex items-center gap-1">
                                {ord.order_number}
                              </Link>
                              <div className="text-xs text-primary text-primary capitalize">
                                {ord.status.replace('_', ' ')}
                              </div>
                            </div>
                            <div className="font-bold text-foreground text-xs">
                              ৳{Number(ord.final_price || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Invoices & Payments Highlights */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Invoices */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary"/>
                    <span>Recent Invoices</span>
                  </CardTitle>
                  <button
 onClick={() => setActiveTab('invoices')}
 className="text-xs font-semibold text-primary hover:underline flex items-center">
 View All &rarr;
                  </button>
                </CardHeader>
                <CardContent className="p-0">
                  {invoices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
 No invoices generated yet for this customer.
                    </div>
                  ) : (
                    <div className="divide-y divide-border dark:divide-slate-900 text-xs">
                      {invoices.slice(0, 5).map((inv) => (
                        <div key={inv.id} className="p-3.5 flex items-center justify-between hover:bg-muted dark:hover:bg-muted/40">
                          <div>
                            <div className="font-bold text-foreground">
                              {inv.invoice_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {inv.invoice_date}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-bold text-foreground">
                                ৳{Number(inv.grand_total).toLocaleString('en-IN')}
                              </div>
                              {Number(inv.due_amount) > 0 && (
                                <div className="text-xs text-destructive font-semibold">
 Due: ৳{Number(inv.due_amount).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>

                            {(() => {
                              const isPaid = inv.status === 'paid' || (Number(inv.due_amount) <= 0.01 && Number(inv.grand_total) > 0)
                              const isPartial = !isPaid && (inv.status === 'partially_paid' || (Number(inv.paid_amount) > 0 && Number(inv.due_amount) > 0.01))
                              const effectiveStatus = isPaid ? 'paid' : isPartial ? 'partially_paid' : inv.status
                              return (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs capitalize',
                                    effectiveStatus === 'paid' && 'bg-success-surface text-success border-success-border',
                                    effectiveStatus === 'unpaid' && 'bg-danger-surface text-destructive border-danger-border',
                                    effectiveStatus === 'partially_paid' && 'bg-warning-surface text-warning border-warning-border'
                                  )}
                                >
                                  {effectiveStatus.replace('_', ' ')}
                                </Badge>
                              )
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-success"/>
                    <span>Recent Payments</span>
                  </CardTitle>
                  <button
 onClick={() => setActiveTab('payments')}
 className="text-xs font-semibold text-primary hover:underline flex items-center">
 View All &rarr;
                  </button>
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
 No payment receipts recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border dark:divide-slate-900 text-xs">
                      {payments.slice(0, 5).map((pay) => (
                        <div key={pay.id} className="p-3.5 flex items-center justify-between hover:bg-muted dark:hover:bg-muted/40">
                          <div>
                            <div className="font-bold text-foreground">
 MR #{pay.receipt_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pay.payment_date} • via {pay.payment_method.toUpperCase()}
                            </div>
                          </div>

                          <div className="font-black text-success text-success text-sm">
                            ৳{Number(pay.amount).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Timeline & Quick Rate Snapshot */}
            <div className="space-y-6">
              {/* Quick Activity Timeline */}
              <Card className="border-border shadow-sm bg-card">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary"/>
                    <span>Recent Activity</span>
                  </CardTitle>
                  <button
 onClick={() => setActiveTab('activity')}
 className="text-xs font-semibold text-primary hover:underline">
 Full History &rarr;
                  </button>
                </CardHeader>
                <CardContent className="p-4">
                  <CustomerTimeline events={timelineEvents.slice(0, 5)} tenantSlug={slug} />
                </CardContent>
              </Card>

              {/* Rates Card Shortcut */}
              <Card className="border-border shadow-sm bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary"/>
                    <span>Special Pricing Configured</span>
                  </div>
                  <Badge variant="outline"className="text-xs">
                    {rates.filter((r) => r.hasCustomRate).length} Custom Rates
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
 Automated rate fallback ensures this customer always gets their agreed rate on new quotations and invoices.
                </p>

                <Button
 variant="outline"size="sm"onClick={() => setActiveTab('rates')}
 className="w-full text-xs font-semibold h-8 text-primary">
 Open Rates Sheet
                </Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Customer Invoices</h3>
              <p className="text-xs text-muted-foreground">All sales bills generated for this account</p>
            </div>
            <Button
 size="sm"onClick={() => setIsNewInvoiceOpen(true)}
 className="bg-primary hover:bg-primary text-xs font-bold h-8">
              <Receipt className="h-3.5 w-3.5 mr-1.5"/>
              <span>{tBilingual('Create Invoice', 'ইনভয়েস তৈরি')}</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Paid Amount</th>
                  <th className="py-3 px-3 text-right">Due Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-900">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
 No invoices recorded for this customer.
                    </td>
                  </tr>
                ) : (
 invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted dark:hover:bg-muted/40">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{inv.invoice_date}</td>
                      <td className="py-3 px-3 text-right font-semibold text-foreground">
                        ৳{Number(inv.grand_total).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-success">
                        ৳{Number(inv.paid_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-destructive">
                        ৳{Number(inv.due_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const isPaid = inv.status === 'paid' || (Number(inv.due_amount) <= 0.01 && Number(inv.grand_total) > 0)
                          const isPartial = !isPaid && (inv.status === 'partially_paid' || (Number(inv.paid_amount) > 0 && Number(inv.due_amount) > 0.01))
                          const effectiveStatus = isPaid ? 'paid' : isPartial ? 'partially_paid' : inv.status
                          return (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs capitalize',
                                effectiveStatus === 'paid' && 'bg-success-surface text-success border-success-border',
                                effectiveStatus === 'unpaid' && 'bg-danger-surface text-destructive border-danger-border',
                                effectiveStatus === 'partially_paid' && 'bg-warning-surface text-warning border-warning-border'
                              )}
                            >
                              {effectiveStatus.replace('_', ' ')}
                            </Badge>
                          )
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
 href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
 className="inline-flex items-center text-primary hover:underline font-semibold">
 View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Payment Collections</h3>
              <p className="text-xs text-muted-foreground">All money receipts issued to this customer</p>
            </div>
            <Button
 size="sm"onClick={() => setIsRecordPayOpen(true)}
 className="bg-success hover:bg-success text-white text-xs font-bold h-8">
              <CreditCard className="h-3.5 w-3.5 mr-1.5"/>
              <span>{tBilingual('Record Payment', 'পেমেন্ট গ্রহণ')}</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3 text-right">Amount Paid</th>
                  <th className="py-3 px-3">Received By</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-900">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
 No payments recorded yet.
                    </td>
                  </tr>
                ) : (
 payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted dark:hover:bg-muted/40">
                      <td className="py-3 px-4 font-bold text-foreground">
 MR #{p.receipt_number}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{p.payment_date}</td>
                      <td className="py-3 px-3 uppercase font-medium text-foreground">
                        {p.payment_method}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-success text-sm">
                        ৳{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{p.received_by_name}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
 size="sm"variant="outline"onClick={() => setSelectedPaymentForReceipt(p as any)}
 className="h-7 text-xs font-bold text-success border-success-border hover:bg-success-surface border-success-border text-success gap-1">
                          <Receipt className="h-3 w-3"/>
 View MR
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. QUOTATIONS TAB */}
      {activeTab === 'quotations' && (
        <Card className="border-border shadow-sm bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Customer Quotations</h3>
              <p className="text-xs text-muted-foreground">Price proposals and estimates</p>
            </div>
            <Link href={getTenantNavHref(`/quotations/new?customerId=${customer.id}`, pathname, slug)}>
              <Button size="sm"className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8">
                <Send className="h-3.5 w-3.5 mr-1.5"/>
                <span>{tBilingual('New Quotation', 'নতুন কোটেশন')}</span>
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Valid Until</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-900">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
 No quotations issued yet for this customer.
                    </td>
                  </tr>
                ) : (
 quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-muted dark:hover:bg-muted/40">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {q.quotation_number}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{q.quotation_date}</td>
                      <td className="py-3 px-3 text-muted-foreground">{q.valid_until}</td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        ৳{Number(q.grand_total).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline"className="text-xs capitalize">
                          {q.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
 href={getTenantNavHref('/quotations', pathname, slug)}
 className="text-primary hover:underline font-semibold">
 View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. PRODUCTS PURCHASED TAB */}
      {activeTab === 'products' && (
        <CustomerProductAnalytics customerId={customer.id} companyId={companyId} />
      )}

      {/* 6. RATES TAB */}
      {activeTab === 'rates' && (
        <CustomerRatesTable
 customerId={customer.id}
 rates={rates}
 companyId={companyId}
 canEdit={can('edit', 'customers')}
 onRatesUpdated={loadCustomerData}
        />
      )}

      {/* 7. ACTIVITY & TIMELINE TAB */}
      {activeTab === 'activity' && (
        <Card className="border-border shadow-sm bg-card p-6">
          <CustomerTimeline events={timelineEvents} tenantSlug={slug} />
        </Card>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inset backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-xs p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground">
 Edit Customer Profile
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{tBilingual('Customer ID', 'কাস্টমার আইডি')}</Label>
                  <Input
 value={editCustomerIdNo}
 onChange={(e) => setEditCustomerIdNo(e.target.value)}
 placeholder="e.g. CUST-0001"className="text-xs h-9 tabular-nums font-bold"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{tBilingual('Customer Code', 'গ্রাহক কোড')}</Label>
                  <Input
 value={editCustomerCode}
 onChange={(e) => setEditCustomerCode(e.target.value)}
 placeholder="e.g. AC-01"className="text-xs h-9 tabular-nums"/>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="text-xs h-9"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Customer Type *</Label>
                  <select
 value={editCustomerType}
 onChange={(e) => setEditCustomerType(e.target.value as any)}
 className="w-full h-9 rounded-md border border-border bg-card px-2 text-xs">
                    <option value="retail">Retail</option>
                    <option value="reseller">Reseller</option>
                    <option value="corporate">Corporate</option>
                    <option value="agency">Agency</option>
                    <option value="government">Government</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Company Name</Label>
                  <Input
 value={editCompanyName}
 onChange={(e) => setEditCompanyName(e.target.value)}
 className="text-xs h-9"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Mobile Phone *</Label>
                  <Input
 required
 value={editMobile}
 onChange={(e) => setEditMobile(e.target.value)}
 className="text-xs h-9"/>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WhatsApp Number</Label>
                  <Input
 value={editWhatsapp}
 onChange={(e) => setEditWhatsapp(e.target.value)}
 className="text-xs h-9"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contact Person</Label>
                  <Input
 value={editContactPerson}
 onChange={(e) => setEditContactPerson(e.target.value)}
 className="text-xs h-9"/>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
 type="email"value={editEmail}
 onChange={(e) => setEditEmail(e.target.value)}
 className="text-xs h-9"/>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Address / Area</Label>
                <Input
 value={editAddress}
 onChange={(e) => setEditAddress(e.target.value)}
 className="text-xs h-9"/>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button"variant="outline"size="sm"onClick={() => setIsEditOpen(false)}>
 Cancel
                </Button>
                <Button type="submit"size="sm"disabled={isSavingEdit} className="bg-primary hover:bg-primary font-bold">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
 open={isRecordPayOpen}
 onOpenChange={setIsRecordPayOpen}
 preselectedCustomerId={customer.id}
 onPaymentRecorded={() => {
 loadCustomerData()
        }}
      />

      {/* VIEW MONEY RECEIPT MODAL */}
      <MoneyReceiptModal
 open={Boolean(selectedPaymentForReceipt)}
 onOpenChange={(open) => !open && setSelectedPaymentForReceipt(null)}
 payment={selectedPaymentForReceipt}
 customer={customer}
 invoices={invoices}
      />

      {/* LOG COMMUNICATION MODAL */}
      {isLogCommOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inset backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-xs p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground">
 Log Customer Interaction
              </h3>
              <button onClick={() => setIsLogCommOpen(false)} className="text-muted-foreground hover:text-foreground">
                &times;
              </button>
            </div>

            <form onSubmit={handleLogComm} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Interaction Type</Label>
                <select
 value={commType}
 onChange={(e) => setCommType(e.target.value as any)}
 className="w-full h-9 rounded-md border border-border bg-card px-3 text-xs">
                  <option value="phone_call">Phone Call (ফোন কল)</option>
                  <option value="whatsapp_message">WhatsApp Message</option>
                  <option value="meeting">In-Person Meeting / Office Visit</option>
                  <option value="site_visit">Site / Measurement Visit</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Discussion Summary *</Label>
                <Input
 required
 placeholder="e.g. Called regarding urgent Panaflex billboard proof..."value={commSummary}
 onChange={(e) => setCommSummary(e.target.value)}
 className="text-xs h-9"autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Action Items / Details</Label>
                <textarea
 rows={3}
 placeholder="Additional notes, client promises, or design feedback..."value={commDetails}
 onChange={(e) => setCommDetails(e.target.value)}
 className="w-full rounded-md border border-border bg-card p-2 text-xs"/>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button"variant="outline"size="sm"onClick={() => setIsLogCommOpen(false)}>
 Cancel
                </Button>
                <Button type="submit"size="sm"disabled={isLoggingComm} className="bg-primary hover:bg-primary font-bold">
                  {isLoggingComm ? 'Saving...' : 'Save Interaction Log'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Invoice Modal Workspace */}
      <NewInvoiceModal
 open={isNewInvoiceOpen}
 onOpenChange={setIsNewInvoiceOpen}
 preselectedCustomerId={customer.id}
 onInvoiceCreated={(newInv) => {
 loadCustomerData()
 showNotification(`Invoice ${newInv.invoice_number} created & Customer 360 profile updated!`)
        }}
      />

      {/* Customer Status Toggle Confirm Dialog */}
      <ConfirmDialog
 open={isToggleActiveConfirmOpen}
 onOpenChange={setIsToggleActiveConfirmOpen}
 title={pendingActiveStatus ? `Reactivate Customer"${customer.name}"?` : `Deactivate Customer"${customer.name}"?`}
 titleBn={pendingActiveStatus ? `কাস্টমার"${customer.name}"পুনরায় সক্রিয় করবেন?` : `কাস্টমার"${customer.name}"নিষ্ক্রিয় করবেন?`}
 message={pendingActiveStatus ? `Reactivating this customer will allow new orders and quotations.` : `Deactivating this customer will prevent new quotations and orders while retaining existing data.`}
 messageBn={pendingActiveStatus ? `গ্রাহক পুনরায় সক্রিয় হলে নতুন অর্ডার ও চালান তৈরি করা যাবে।` : `গ্রাহক নিষ্ক্রিয় করা হলে নতুন অর্ডার গ্রহণ বন্ধ থাকবে, তবে পুরাতন হিসেব ঠিক থাকবে।`}
 confirmText={pendingActiveStatus ? 'Reactivate' : 'Deactivate'}
 confirmTextBn={pendingActiveStatus ? 'সক্রিয় করুন' : 'নিষ্ক্রিয় করুন'}
 cancelText="Cancel"cancelTextBn="বাতিল"isDestructive={!pendingActiveStatus}
 isLoading={isTogglingActive}
 onConfirm={confirmToggleActive}
      />
    </div>
    </PanelAccessGuard>
  )
}