'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { CustomerRecord } from '@/types/crm.types'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import {
  InvoiceRecord,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentRecord,
  FinancialWriteOffRecord,
} from '@/types/billing.types'
import { formatBDT, calculateDaysOverdue } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { usePermissions } from '@/hooks/use-permissions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function BillingPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [invoices, setInvoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [payments, setPayments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  const [customerList] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modals
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false)
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [selectedInvoiceForWriteOff, setSelectedInvoiceForWriteOff] = useState<InvoiceRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCustomerCreated = (newCust: CustomerRecord) => {
    if (isRecordPaymentOpen) {
      setPayCustomerId(newCust.id)
    }
    if (isNewInvoiceOpen) {
      setNewCustId(newCust.id)
    }
    showNotification(`Selected customer: ${newCust.name}`)
  }

  // Payment Form State (Multi-Invoice Allocation)
  const [payCustomerId, setPayCustomerId] = useState<string>('cust-02')
  const [totalPayAmount, setTotalPayAmount] = useState<number>(50000)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank')
  const [payBankName, setPayBankName] = useState('City Bank PLC')
  const [payChequeNo, setPayChequeNo] = useState('')
  const [payMfsTrx, setPayMfsTrx] = useState('')
  const [payAllocations, setPayAllocations] = useState<Record<string, number>>({})

  // Write-off Form State
  const [writeOffAmount, setWriteOffAmount] = useState<number>(2000)
  const [writeOffReason, setWriteOffReason] = useState('')
  const [authorizedBy, setAuthorizedBy] = useState('Chief Financial Officer')

  // New Invoice Form State
  const [newCustId, setNewCustId] = useState('cust-01')
  const [newInvType, setNewInvType] = useState<InvoiceType>('sales_invoice')
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
  const [newDesc, setNewDesc] = useState('')
  const [newDimensions, setNewDimensions] = useState('10ft × 4ft (40 SFT)')
  const [newQty, setNewQty] = useState<number>(1)
  const [newPrice, setNewPrice] = useState<number>(25000)
  const [newVatPercent, setNewVatPercent] = useState<number>(0)

  // Filtered invoices
  const filtered = invoices.filter((inv: InvoiceRecord) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer_bin && inv.customer_bin.includes(search))

    if (!matchSearch) return false

    if (selectedTab === 'vat') return inv.invoice_type === 'vat_invoice'
    if (selectedTab === 'overdue') return inv.status === 'overdue' || (inv.due_amount > 0 && calculateDaysOverdue(inv.due_date) > 0)
    if (selectedTab === 'unpaid') return inv.status === 'unpaid' || inv.status === 'partially_paid'
    return true
  })

  // Executive Metrics
  const totalInvoiced = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + inv.grand_total, 0)
  const totalCollected = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + inv.paid_amount, 0)
  const totalReceivables = invoices.reduce((acc: number, inv: InvoiceRecord) => acc + inv.due_amount, 0)
  const overdueInvoices = invoices.filter(
    (inv: InvoiceRecord) => inv.due_amount > 0 && (inv.status === 'overdue' || calculateDaysOverdue(inv.due_date) > 0)
  )
  const totalOverdueAmount = overdueInvoices.reduce((acc: number, inv: InvoiceRecord) => acc + inv.due_amount, 0)

  // Quick Action: Record Payment & Multi-Invoice Allocation
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customerList.find((c: CustomerRecord) => c.id === payCustomerId) || customerList[0]
    const receiptNum = `MR-${Date.now().toString().slice(-4)}`

    if (customer) {
      PrintERPDataStore.recordPaymentCollection({
        customerId: customer.id,
        amount: totalPayAmount,
        paymentMethod: payMethod,
        notes: `Payment collected and allocated across invoices for ${customer.name}. Money Receipt: ${receiptNum}`,
      })
    }

    setIsRecordPaymentOpen(false)
    showNotification(
      `Payment of ৳ ${formatBDT(totalPayAmount)} received from ${customer?.name || 'Customer'} and synced to Customer Ledger & Cash Book.`
    )
  }

  // Quick Action: Non-Destructive Write-off
  const handleRecordWriteOff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceForWriteOff) return

    const newDue = Math.max(0, selectedInvoiceForWriteOff.due_amount - writeOffAmount)
    const newWriteOff = selectedInvoiceForWriteOff.write_off_amount + writeOffAmount

    const newAuditLog: FinancialWriteOffRecord = {
      id: `wo-${Date.now()}`,
      company_id: company?.id || 'c-01',
      invoice_id: selectedInvoiceForWriteOff.id,
      amount: writeOffAmount,
      reason: writeOffReason,
      authorized_by_name: authorizedBy,
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, selectedInvoiceForWriteOff.id, {
      due_amount: newDue,
      write_off_amount: newWriteOff,
      status: newDue === 0 ? 'written_off' : selectedInvoiceForWriteOff.status,
      write_offs: [...(selectedInvoiceForWriteOff.write_offs || []), newAuditLog],
      updated_at: new Date().toISOString(),
    })

    setSelectedInvoiceForWriteOff(null)
    setWriteOffReason('')
    showNotification(
      `Financial write-off of ৳ ${formatBDT(writeOffAmount)} logged for ${selectedInvoiceForWriteOff.invoice_number}. Non-destructive audit entry created.`
    )
  }

  // Quick Action: Create New Invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customerList.find((c: CustomerRecord) => c.id === newCustId) || customerList[0]
    const invNum = newInvType === 'vat_invoice' ? `MUS-${Date.now().toString().slice(-4)}` : `INV-${Date.now().toString().slice(-4)}`
    const subtotal = newQty * newPrice
    const vatAmt = Math.round((subtotal * newVatPercent) / 100)
    const grandTotal = subtotal + vatAmt

    const newInv: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      company_id: 'c-01',
      invoice_number: invNum,
      invoice_type: newInvType,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile,
      customer_bin: customer.bin_no || '1234567890123',
      customer_tin: customer.tin_no || '987654321012',
      customer_address: customer.address,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: newDueDate,
      status: 'unpaid',
      subtotal,
      discount_amount: 0,
      vat_percentage: newVatPercent,
      vat_amount: vatAmt,
      grand_total: grandTotal,
      paid_amount: 0,
      due_amount: grandTotal,
      write_off_amount: 0,
      notes: 'Standard billing contract.',
      created_by_name: 'Commercial Executive',
      items: [
        {
          id: `ii-${Date.now()}`,
          item_description: newDesc || 'Print Production Services',
          dimensions_spec: newDimensions,
          quantity: newQty,
          unit: 'piece',
          unit_price: newPrice,
          vat_percentage: newVatPercent,
          total_price: subtotal,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<InvoiceRecord>(STORAGE_KEYS.INVOICES, newInv)
    setIsNewInvoiceOpen(false)
    showNotification(`Invoice ${invNum} created successfully!`)
  }

  const getStatusBadge = (status: InvoiceStatus, dueDate: string, dueAmt: number) => {
    const daysOverdue = calculateDaysOverdue(dueDate)

    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
        </span>
      )
    }

    if (status === 'written_off') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
          Written Off
        </span>
      )
    }

    if (dueAmt > 0 && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
          <AlertOctagon className="h-3 w-3 text-red-600" /> {daysOverdue}d Overdue
        </span>
      )
    }

    if (status === 'partially_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <Clock className="h-3 w-3 text-blue-600" /> Partially Paid
        </span>
      )
    }

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
        Unpaid
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Invoicing & Payment Collections"
        titleBn="বিলিং ও পেমেন্ট কালেকশন"
        descriptionEn="Commercial sales invoices, NBR Mushak 6.3 VAT documents, multi-invoice payment allocation, and bad-debt audit logs."
        descriptionBn="কমার্শিয়াল ইনভয়েস, এনবিআর মূসক ৬.৩ চালান, পেমেন্ট বণ্টন এবং বকেয়া ট্র্যাকিং করুন।"
        icon={Receipt}
        iconColor="text-emerald-600"
        actions={
          <div className="flex items-center gap-2.5">
            {can('create', 'payments') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 bangla-text"
              >
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Record Payment (MR)', 'পেমেন্ট গ্রহণ (এমআর)')}
              </Button>
            )}

            {can('create', 'invoices') && (
              <Button
                size="sm"
                onClick={() => setIsNewInvoiceOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white bangla-text"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Create Invoice', 'নতুন ইনভয়েস')}
              </Button>
            )}
          </div>
        }
      />

      {/* Read-Only Notice */}
      {isReadOnly('invoices') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-200 dark:border-blue-900 animate-in fade-in-0">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{tBilingual('View-Only Mode: You have read-only access to commercial billing & invoices.', 'শুধুমাত্র দেখার অনুমতি: ইনভয়েস তৈরি বা সম্পাদনার অনুমতি নেই।')}</span>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Executive Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-slate-400">
          <span className="text-xs font-semibold text-slate-500">Total Billed Revenue</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalInvoiced} />
          </div>
          <span className="text-[11px] text-slate-400">{invoices.length} total issued invoices</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500">Total Collected (আদায়কৃত)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={totalCollected} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% recovery rate
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">Total Receivables (মোট বাকি)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            <CurrencyDisplay amount={totalReceivables} />
          </div>
          <span className="text-[11px] text-slate-400">Open client balances</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50/20 dark:bg-red-950/10">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
            Overdue Debt (মেয়াদোত্তীর্ণ বাকি)
          </span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={totalOverdueAmount} />
          </div>
          <span className="text-[11px] text-red-600 font-medium">
            {overdueInvoices.length} invoices past due date
          </span>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice #, customer name, or 13-digit BIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'All Invoices' },
              { id: 'vat', label: 'NBR VAT (Mushak 6.3)' },
              { id: 'overdue', label: 'Overdue Aging' },
              { id: 'unpaid', label: 'Pending Due' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={selectedTab === tab.id ? 'default' : 'outline'}
                onClick={() => setSelectedTab(tab.id)}
                className="text-xs h-8 px-3"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Invoices Directory Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoices Ledger ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Multi-type invoices with aging tracking</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer & BIN</th>
                <th className="py-3 px-4">Date / Due Date</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Paid / Due</th>
                <th className="py-3 px-4">Status & Overdue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((inv: InvoiceRecord) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Invoice # */}
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/${slug}/billing/${inv.id}`}
                      className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 group"
                    >
                      <span>{inv.invoice_number}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="mt-0.5">
                      {inv.invoice_type === 'vat_invoice' ? (
                        <span className="inline-block text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          মূসক ৬.৩
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Sales Inv
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">
                      {inv.customer_name}
                    </div>
                    {inv.customer_bin && (
                      <div className="text-[10px] font-mono text-purple-600">
                        BIN: {inv.customer_bin}
                      </div>
                    )}
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-mono text-slate-600 dark:text-slate-300">
                      {inv.invoice_date}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Due: {inv.due_date}
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono text-xs">
                    <CurrencyDisplay amount={inv.grand_total} />
                  </td>

                  {/* Paid / Due */}
                  <td className="py-3.5 px-4 text-xs font-mono">
                    <div className="text-emerald-600 font-medium">Paid: ৳ {formatBDT(inv.paid_amount)}</div>
                    {inv.due_amount > 0 ? (
                      <div className="text-red-600 font-bold">Due: ৳ {formatBDT(inv.due_amount)}</div>
                    ) : (
                      <div className="text-slate-400">Due: ৳ 0</div>
                    )}
                  </td>

                  {/* Status & Overdue */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/${slug}/billing/${inv.id}`}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        Cockpit
                      </Link>

                      {inv.due_amount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoiceForWriteOff(inv)
                            setWriteOffAmount(Math.min(inv.due_amount, 2000))
                          }}
                          className="h-7 text-[11px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Write-off
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: RECORD MULTI-INVOICE PAYMENT (MONEY RECEIPT) */}
      <ModalDialog
        open={isRecordPaymentOpen}
        onOpenChange={setIsRecordPaymentOpen}
        title="Record Customer Payment & Money Receipt (MR)"
        description="A single lump-sum customer payment can be allocated across multiple outstanding invoices."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="payCust" required>Select Customer</Label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                + New Customer
              </button>
            </div>
            <div className="flex gap-2">
              <select
                id="payCust"
                value={payCustomerId}
                onChange={(e) => setPayCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {customerList.map((c: CustomerRecord) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - Phone: {c.mobile}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-10 px-3 shrink-0 rounded-xl border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                + New
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pAmt" required>Total Received Amount (৳ BDT)</Label>
              <Input
                id="pAmt"
                type="number"
                value={totalPayAmount}
                onChange={(e) => setTotalPayAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pMeth" required>Payment Channel</Label>
              <select
                id="pMeth"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="bank">Bank Transfer (EFT / RTGS)</option>
                <option value="cheque">Bank Cheque</option>
                <option value="cash">Cash Counter</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad Wallet</option>
                <option value="other_mfs">Rocket / Other MFS</option>
              </select>
            </div>
          </div>

          {(payMethod === 'bank' || payMethod === 'cheque') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pBank">Bank Name</Label>
                <Input
                  id="pBank"
                  value={payBankName}
                  onChange={(e) => setPayBankName(e.target.value)}
                />
              </div>
              {payMethod === 'cheque' && (
                <div className="space-y-1.5">
                  <Label htmlFor="pCheq" required>Cheque Number</Label>
                  <Input
                    id="pCheq"
                    placeholder="e.g. CQ-8849201"
                    value={payChequeNo}
                    onChange={(e) => setPayChequeNo(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {(payMethod === 'bkash' || payMethod === 'nagad') && (
            <div className="space-y-1.5">
              <Label htmlFor="pTrx" required>MFS Transaction ID (TrxID)</Label>
              <Input
                id="pTrx"
                placeholder="e.g. 9J48KL21"
                value={payMfsTrx}
                onChange={(e) => setPayMfsTrx(e.target.value)}
                required
              />
            </div>
          )}

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">Multi-Invoice Allocation:</span>
            <p className="text-slate-600 dark:text-slate-400">
              This payment will be automatically applied to the customer&apos;s oldest open invoices to settle outstanding balances in FIFO order.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Generate Money Receipt
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: FINANCIAL WRITE-OFF & ADJUSTMENT */}
      <ModalDialog
        open={Boolean(selectedInvoiceForWriteOff)}
        onOpenChange={(open) => !open && setSelectedInvoiceForWriteOff(null)}
        title="Record Financial Write-Off & Adjustment"
        description="Non-destructive financial audit entry. Original invoice history is preserved without silent modification."
      >
        {selectedInvoiceForWriteOff && (
          <form onSubmit={handleRecordWriteOff} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
              <span className="text-red-700 dark:text-red-300 font-bold">Invoice: </span>
              <strong>{selectedInvoiceForWriteOff.invoice_number}</strong> ({selectedInvoiceForWriteOff.customer_name})
              <div className="text-red-600 font-mono font-bold mt-0.5">
                Current Due Balance: ৳ {formatBDT(selectedInvoiceForWriteOff.due_amount)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="woAmt" required>Write-off / Discount Amount (৳ BDT)</Label>
                <Input
                  id="woAmt"
                  type="number"
                  max={selectedInvoiceForWriteOff.due_amount}
                  value={writeOffAmount}
                  onChange={(e) => setWriteOffAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="woAuth" required>Authorized By</Label>
                <Input
                  id="woAuth"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="woRsn" required>Mandatory Audit Justification Reason</Label>
              <textarea
                id="woRsn"
                rows={2}
                placeholder="e.g. Final round-off waiver negotiated with Beximco procurement head; approved bad debt."
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                required
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedInvoiceForWriteOff(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Log Authorized Write-Off
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: CREATE INVOICE */}
      <ModalDialog
        open={isNewInvoiceOpen}
        onOpenChange={setIsNewInvoiceOpen}
        title="Create New Customer Invoice"
        description="Issue standard commercial sales invoice or official NBR Mushak 6.3 VAT document."
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="invCust" required>Select Customer</Label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  + New Customer
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  id="invCust"
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {customerList.map((c: CustomerRecord) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_type || c.customer_category || 'Customer'})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="h-10 px-3 shrink-0 rounded-xl border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  + New
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invTyp" required>Invoice Document Type</Label>
              <select
                id="invTyp"
                value={newInvType}
                onChange={(e) => {
                  const typ = e.target.value as InvoiceType
                  setNewInvType(typ)
                  if (typ === 'vat_invoice') setNewVatPercent(10)
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="sales_invoice">Commercial Sales Invoice</option>
                <option value="vat_invoice">NBR VAT Invoice (মূসক ৬.৩)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invDue" required>Payment Due Date</Label>
              <Input
                id="invDue"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invVat">VAT Rate (%)</Label>
              <Input
                id="invVat"
                type="number"
                value={newVatPercent}
                onChange={(e) => setNewVatPercent(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invDesc" required>Item / Service Description</Label>
            <Input
              id="invDesc"
              placeholder="e.g. Star Flex Billboard Print & High-Altitude Rigging"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invDim">Size / Specs</Label>
              <Input
                id="invDim"
                value={newDimensions}
                onChange={(e) => setNewDimensions(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invQ" required>Quantity</Label>
              <Input
                id="invQ"
                type="number"
                min="1"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invP" required>Unit Price (৳)</Label>
              <Input
                id="invP"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Issue Invoice
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: NEW CUSTOMER */}
      <NewCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onCustomerCreated={handleCustomerCreated}
        companyId={company?.id || 'c-01'}
      />
    </div>
  )
}
