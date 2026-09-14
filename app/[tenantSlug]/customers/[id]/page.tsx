'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
import { CustomerRatesTable } from '@/components/customers/customer-rates-table'
import { CustomerProductAnalytics } from '@/components/customers/customer-product-analytics'
import { CustomerTimeline } from '@/components/customers/customer-timeline'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { MoneyReceiptModal } from '@/components/billing/money-receipt-modal'
import {
  updateCustomerAction,
  resolveCustomerRatesAction,
  getCustomerFinancialSummaryAction,
  getCustomerTimelineAction,
  getCustomerFullDetailsAction,
  logCustomerCommunicationAction,
} from '@/actions/customer.actions'
import { recordPaymentAction } from '@/actions/billing.actions'
import {
  CustomerRecord,
  ResolvedProductRate,
  CustomerFinancialSummary,
  CustomerTimelineEvent,
  CustomerCategory,
} from '@/types/crm.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { QuotationRecord } from '@/types/quotation.types'
import { SalesOrderRecord } from '@/types/order.types'
import { cn } from '@/lib/utils'

export default function CustomerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const customerId = (params?.id as string) || (params?.customerId as string) || ''
  const { company } = useTenant()
  const { can } = usePermissions()
  const { tBilingual } = useI18n()

  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

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

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Load all 360 data
  const loadCustomerData = useCallback(async () => {
    if (!companyId || !customerId) return
    setIsLoading(true)
    setIsError(false)

    try {
      const res = await getCustomerFullDetailsAction(customerId, companyId)
      if (!res.success || !res.data?.customer) {
        setIsError(true)
        setErrorText(res.error || 'Customer profile not found or removed.')
        setIsLoading(false)
        return
      }

      const {
        customer: cust,
        financialSummary: fin,
        rates: rts,
        timelineEvents: tml,
        invoices: invs,
        payments: pays,
        quotations: qts,
        orders: ords,
      } = res.data

      setCustomer(cust)
      if (fin) setFinancialSummary(fin)
      setRates(rts)
      setTimelineEvents(tml)
      setInvoices(invs)
      setPayments(pays)
      setQuotations(qts)
      setOrders(ords)

      // Pre-fill edit form
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
  }, [companyId, customerId])

  useEffect(() => {
    loadCustomerData()
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
        alert(res.error || 'Failed to update customer.')
      }
    } catch {
      alert('Network error updating customer.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.')
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
        alert(res.error || 'Failed to record payment.')
        return
      }

      setIsRecordPayOpen(false)
      setPayAmount('')
      setPayNotes('')
      showNotification(`Payment of ৳${amt} recorded successfully.`)
      loadCustomerData()
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment.')
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
        alert(res.error || 'Failed to log communication.')
        return
      }

      setIsLogCommOpen(false)
      setCommSummary('')
      setCommDetails('')
      showNotification('Communication logged successfully.')
      loadCustomerData()
    } catch {
      alert('Failed to log communication.')
    } finally {
      setIsLoggingComm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8 text-center">
        <Card className="p-12 space-y-4 border-rose-200 dark:border-rose-900">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {errorText || 'Customer Profile Not Found'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested customer profile could not be loaded or you do not have permission to view it.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" variant="outline" onClick={loadCustomerData}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
            <Link href={`/${slug}/customers`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Back to Customer Directory link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Customers</span>
        </Link>

        {customer.created_at && (
          <span className="text-[11px] text-slate-400">
            Customer since {new Date(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Customer 360 Header Profile Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Customer Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {customer.name}
                </h1>
                {customer.name_bn && (
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    ({customer.name_bn})
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    custType === 'corporate' && 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                    custType === 'agency' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                    custType === 'reseller' && 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300',
                    custType === 'government' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                    custType === 'retail' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  )}
                >
                  {custType}
                </Badge>
              </div>

              {/* Company & Contact Person */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                {customer.company_name && (
                  <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{customer.company_name}</span>
                  </div>
                )}
                {customer.contact_person && (
                  <div>
                    Contact: <strong className="text-slate-700 dark:text-slate-300">{customer.contact_person}</strong>
                  </div>
                )}
                {customer.area && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{customer.area}</span>
                  </div>
                )}
              </div>

              {/* Full Address */}
              {customer.address && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {customer.address}
                </p>
              )}
            </div>

            {/* Direct Contact & Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Phone Call */}
              <a
                href={`tel:${customer.mobile}`}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-xs text-slate-900 dark:text-white"
                title="Call Customer"
              >
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                <span>{customer.mobile}</span>
              </a>

              {/* WhatsApp Chat */}
              {customer.whatsapp && (
                <a
                  href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 font-bold text-xs"
                  title="Direct WhatsApp Chat"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Edit Customer */}
              {can('edit', 'customers') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  className="h-9 text-xs font-semibold"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit Customer
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8"
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              + Create Invoice
            </Button>

            <Link href={`/${slug}/quotations/new?customerId=${customer.id}`}>
              <Button size="sm" variant="outline" className="text-xs font-semibold h-8">
                <Send className="h-3.5 w-3.5 mr-1.5" />
                + New Quotation
              </Button>
            </Link>

            {hasDue && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRecordPayOpen(true)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 h-8"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Record Payment
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLogCommOpen(true)}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 h-8 ml-auto"
            >
              <Phone className="h-3 w-3 mr-1" />
              Log Comm
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer Financial Summary Cards */}
      <CustomerFinancialSummaryCards summary={financialSummary} />

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl p-1.5 gap-1 overflow-x-auto shadow-xs text-xs">
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT PANELS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Invoices & Payments Highlights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Invoices */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-900 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Recent Invoices</span>
                </CardTitle>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center"
                >
                  View All &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No invoices generated yet for this customer.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {invoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {inv.invoice_number}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {inv.invoice_date}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-white">
                              ৳{Number(inv.grand_total).toLocaleString('en-IN')}
                            </div>
                            {Number(inv.due_amount) > 0 && (
                              <div className="text-[10px] text-rose-500 font-semibold">
                                Due: ৳{Number(inv.due_amount).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] capitalize',
                              inv.status === 'paid' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              inv.status === 'unpaid' && 'bg-rose-50 text-rose-700 border-rose-200',
                              inv.status === 'partially_paid' && 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          >
                            {inv.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-900 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Recent Payments</span>
                </CardTitle>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center"
                >
                  View All &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No payment receipts recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-900 text-xs">
                    {payments.slice(0, 5).map((pay) => (
                      <div key={pay.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            MR #{pay.receipt_number}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pay.payment_date} • via {pay.payment_method.toUpperCase()}
                          </div>
                        </div>

                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
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
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-900 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Full History &rarr;
                </button>
              </CardHeader>
              <CardContent className="p-4">
                <CustomerTimeline events={timelineEvents.slice(0, 5)} />
              </CardContent>
            </Card>

            {/* Rates Card Shortcut */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-blue-600" />
                  <span>Special Pricing Configured</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {rates.filter((r) => r.hasCustomRate).length} Custom Rates
                </Badge>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Automated rate fallback ensures this customer always gets their agreed rate on new quotations and invoices.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('rates')}
                className="w-full text-xs font-semibold h-8 text-blue-600"
              >
                Open Rates Sheet
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* 2. INVOICES TAB */}
      {activeTab === 'invoices' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Invoices</h3>
              <p className="text-xs text-slate-400">All sales bills generated for this account</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold h-8"
            >
              + Create Invoice
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No invoices recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{inv.invoice_date}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                        ৳{Number(inv.grand_total).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">
                        ৳{Number(inv.paid_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        ৳{Number(inv.due_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize',
                            inv.status === 'paid' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            inv.status === 'unpaid' && 'bg-rose-50 text-rose-700 border-rose-200',
                            inv.status === 'partially_paid' && 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/${slug}/billing/invoices/${inv.id}`}
                          className="inline-flex items-center text-blue-600 hover:underline font-semibold"
                        >
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
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Payment Collections</h3>
              <p className="text-xs text-slate-400">All money receipts issued to this customer</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsRecordPayOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
            >
              + Record Payment
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3 text-right">Amount Paid</th>
                  <th className="py-3 px-3">Received By</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        MR #{p.receipt_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.payment_date}</td>
                      <td className="py-3 px-3 uppercase font-medium text-slate-700 dark:text-slate-300">
                        {p.payment_method}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 text-sm">
                        ৳{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.received_by_name}</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPaymentForReceipt(p as any)}
                          className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 gap-1"
                        >
                          <Receipt className="h-3 w-3" />
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
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Quotations</h3>
              <p className="text-xs text-slate-400">Price proposals and estimates</p>
            </div>
            <Link href={`/${slug}/quotations/new?customerId=${customer.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8">
                + New Quotation
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Valid Until</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No quotations issued yet for this customer.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {q.quotation_number}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{q.quotation_date}</td>
                      <td className="py-3 px-3 text-slate-500">{q.valid_until}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        ৳{Number(q.grand_total).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {q.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/${slug}/quotations`}
                          className="text-blue-600 hover:underline font-semibold"
                        >
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
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 p-6">
          <CustomerTimeline events={timelineEvents} />
        </Card>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Customer Profile
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-700">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Customer Type *</Label>
                  <select
                    value={editCustomerType}
                    onChange={(e) => setEditCustomerType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs"
                  >
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
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Mobile Phone *</Label>
                  <Input
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WhatsApp Number</Label>
                  <Input
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contact Person</Label>
                  <Input
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email Address</Label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Address / Area</Label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSavingEdit} className="bg-blue-600 hover:bg-blue-700 font-bold">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Log Customer Interaction
              </h3>
              <button onClick={() => setIsLogCommOpen(false)} className="text-slate-400 hover:text-slate-700">
                &times;
              </button>
            </div>

            <form onSubmit={handleLogComm} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Interaction Type</Label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs"
                >
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
                  placeholder="e.g. Called regarding urgent Panaflex billboard proof..."
                  value={commSummary}
                  onChange={(e) => setCommSummary(e.target.value)}
                  className="text-xs h-9"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Action Items / Details</Label>
                <textarea
                  rows={3}
                  placeholder="Additional notes, client promises, or design feedback..."
                  value={commDetails}
                  onChange={(e) => setCommDetails(e.target.value)}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsLogCommOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isLoggingComm} className="bg-blue-600 hover:bg-blue-700 font-bold">
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
    </div>
  )
}
