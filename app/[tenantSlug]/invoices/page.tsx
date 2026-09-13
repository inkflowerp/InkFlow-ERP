'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  Building,
  FileSpreadsheet,
  FileCheck2,
  TrendingDown,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Printer,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Filter,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { CustomerRecord } from '@/types/crm.types'
import {
  InvoiceRecord,
  InvoiceStatus,
  InvoiceType,
  PaymentRecord,
} from '@/types/billing.types'
import { formatBDT, calculateDaysOverdue } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { usePermissions } from '@/hooks/use-permissions'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { sendInvoiceAction } from '@/actions/billing.actions'

export default function InvoicesPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const searchParams = useSearchParams()
  const slug = company?.slug || 'my-company'

  const [invoices, setInvoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [search, setSearch] = useState('')

  // New Invoice Modal
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false)
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined)
  const [notification, setNotification] = useState<string | null>(null)

  // Auto-open modal if query params dictate
  useEffect(() => {
    const action = searchParams?.get('action')
    const custId = searchParams?.get('customerId')
    if (action === 'new' || custId) {
      if (custId) setPreselectedCustomerId(custId)
      setIsNewInvoiceOpen(true)
    }
  }, [searchParams])

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Filtered invoices
  const filtered = useMemo(() => {
    return invoices.filter((inv: InvoiceRecord) => {
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        (inv.customer_phone && inv.customer_phone.includes(search)) ||
        (inv.customer_bin && inv.customer_bin.includes(search))

      if (!matchSearch) return false

      if (selectedTab === 'vat') return inv.invoice_type === 'vat_invoice'
      if (selectedTab === 'overdue')
        return inv.status === 'overdue' || (inv.due_amount > 0 && calculateDaysOverdue(inv.due_date) > 0)
      if (selectedTab === 'unpaid')
        return inv.status === 'unpaid' || inv.status === 'partially_paid' || inv.due_amount > 0
      return true
    })
  }, [invoices, search, selectedTab])

  // Executive Metrics
  const totalInvoiced = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + (Number(inv.grand_total) || 0), 0)
  const totalCollected = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + (Number(inv.paid_amount) || 0), 0)
  const totalReceivables = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + (Number(inv.due_amount) || 0), 0)
  const overdueInvoices = invoices.filter(
    (inv: InvoiceRecord) => (Number(inv.due_amount) || 0) > 0 && (inv.status === 'overdue' || calculateDaysOverdue(inv.due_date) > 0)
  )
  const totalOverdueAmount = overdueInvoices.reduce((acc: number, inv: InvoiceRecord) => acc + (Number(inv.due_amount) || 0), 0)

  const handleInvoiceCreated = (newInv: InvoiceRecord) => {
    setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)])
    showNotification(`Invoice ${newInv.invoice_number} saved & synced to Customer Ledger!`)
  }

  const handleQuickSend = async (invoiceId: string, channel: 'whatsapp' | 'email') => {
    showNotification(`Dispatching ${channel.toUpperCase()} message...`)
    const res = await sendInvoiceAction({ invoiceId, channel, format: 'pdf' }, company?.id)
    if (res.success) {
      showNotification(`Invoice dispatched via ${channel.toUpperCase()} successfully!`)
      if (channel === 'whatsapp' && res.data?.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank')
      }
    } else {
      showNotification(`Failed to send via ${channel.toUpperCase()}: ${res.error}`)
    }
  }

  const getStatusBadge = (status: InvoiceStatus, dueDate: string, dueAmt: number) => {
    const daysOverdue = calculateDaysOverdue(dueDate)

    if (status === 'paid' || dueAmt === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
        </span>
      )
    }

    if (status === 'written_off') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Written Off
        </span>
      )
    }

    if (dueAmt > 0 && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/50 dark:text-red-300 animate-pulse">
          <AlertOctagon className="h-3 w-3 text-red-600" /> {daysOverdue}d Overdue
        </span>
      )
    }

    if (status === 'partially_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300">
          <Clock className="h-3 w-3 text-blue-600" /> Partially Paid
        </span>
      )
    }

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
        Unpaid
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Header */}
      <PageHeader
        titleEn="Invoices & Commercial Billing Hub"
        titleBn="চালান ও বাণিজ্যিক বিলিং কেন্দ্র"
        descriptionEn="Create mobile-first invoices in seconds, auto-resolve 3-tier rates, collect advances, and dispatch PDF/Text via WhatsApp, Email & SMS."
        descriptionBn="সহজে মোবাইল থেকে ইনভয়েস তৈরি করুন, গ্রাহক অনুযায়ী স্বয়ংক্রিয় দর নির্ধারণ এবং হোয়াটসঅ্যাপে পাঠান।"
        icon={Receipt}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/${slug}/billing`}>
              <Button size="sm" variant="outline" className="text-xs font-semibold h-9">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Billing Hub & Ledger
              </Button>
            </Link>

            {can('create', 'invoices') && (
              <Button
                size="sm"
                onClick={() => {
                  setPreselectedCustomerId(undefined)
                  setIsNewInvoiceOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs h-9"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                + New Invoice
              </Button>
            )}
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Read-Only Notice */}
      {isReadOnly('invoices') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-blue-200 dark:border-blue-900 animate-in fade-in-0">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>View-Only Mode: You have read-only access to invoices.</span>
        </div>
      )}

      {/* Executive Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-slate-400 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalInvoiced} />
          </div>
          <span className="text-[11px] text-slate-400">{invoices.length} total issued invoices</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Collected</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={totalCollected} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% recovery rate
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Receivables (Due)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            <CurrencyDisplay amount={totalReceivables} />
          </div>
          <span className="text-[11px] text-slate-400">Outstanding client balance</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Overdue Invoices</span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            <CurrencyDisplay amount={totalOverdueAmount} />
          </div>
          <span className="text-[11px] text-rose-600 font-medium">{overdueInvoices.length} overdue bills</span>
        </Card>
      </div>

      {/* Main Invoices Workspace Card */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { key: 'all', label: 'All Invoices' },
              { key: 'unpaid', label: 'Unpaid / Due' },
              { key: 'overdue', label: 'Overdue' },
              { key: 'vat', label: 'NBR Mushak 6.3' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedTab === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer, phone..."
              className="pl-9 h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Invoices Table / Mobile Cards */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">No invoices found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'No invoices match your search query.'
                : 'Start issuing invoices with the Save-First engine to manage sales and collections.'}
            </p>
            {can('create', 'invoices') && (
              <Button
                size="sm"
                onClick={() => setIsNewInvoiceOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white mt-2"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Create New Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Due Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <Link
                        href={`/${slug}/billing/${inv.id}`}
                        className="hover:text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        {inv.invoice_number}
                        {inv.invoice_type === 'vat_invoice' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                            VAT
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 font-mono">{inv.invoice_date}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{inv.customer_name}</div>
                      {inv.customer_phone && (
                        <div className="text-[11px] text-slate-400 font-mono">{inv.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳{formatBDT(inv.grand_total)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600 font-bold">
                      ৳{formatBDT(inv.paid_amount)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={inv.due_amount > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        ৳{formatBDT(inv.due_amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/${slug}/billing/${inv.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="View & Print Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </Link>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickSend(inv.id, 'whatsapp')}
                          className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          title="Send via WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickSend(inv.id, 'email')}
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          title="Send via Email"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Invoice Modal */}
      <NewInvoiceModal
        open={isNewInvoiceOpen}
        onOpenChange={setIsNewInvoiceOpen}
        preselectedCustomerId={preselectedCustomerId}
        onInvoiceCreated={handleInvoiceCreated}
      />
    </div>
  )
}
