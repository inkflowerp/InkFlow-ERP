'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Send,
  Building,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import { QuotationRecord, QuotationStatus } from '@/types/quotation.types'
import { DEFAULT_QUOTATION_TERMS } from '@/services/quotation.service'
import { CustomerRecord } from '@/types/crm.types'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'

export default function QuotationsPage() {
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [quotations, setQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
  const [customerList] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // New Quote Modal
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemWidth, setItemWidth] = useState<number>(0)
  const [itemHeight, setItemHeight] = useState<number>(0)
  const [itemQty, setItemQty] = useState<number>(1)
  const [itemRate, setItemRate] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleCustomerCreated = (newCust: CustomerRecord) => {
    setSelectedCustomerId(newCust.id)
    showNotification(`Selected customer: ${newCust.name}`)
  }

  // Live item total calculation
  const calculatedArea = (itemWidth || 0) * (itemHeight || 0) * (itemQty || 1)
  const calculatedSubtotal = calculatedArea > 0 ? calculatedArea * (itemRate || 0) : (itemQty || 1) * (itemRate || 0)
  const calculatedVat = Math.round((Math.max(0, calculatedSubtotal - discountAmount) * 7.5) / 100)
  const calculatedGrandTotal = Math.max(0, calculatedSubtotal - discountAmount) + calculatedVat

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault()
    const orderCheck = checkCanCreate('monthly_orders')
    if (!orderCheck.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }
    const customer = customerList.find((c) => c.id === selectedCustomerId)
    if (!customer) {
      showNotification('Please select or add a customer first.')
      return
    }
    const quoteNum = `QUO-0000${quotations.length + 1}`

    const newQuote: QuotationRecord = {
      id: `quo-${Date.now()}`,
      company_id: company?.id || 'co-main',
      quotation_number: quoteNum,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_name_bn: customer.name_bn,
      customer_phone: customer.mobile,
      customer_email: customer.email,
      customer_address: customer.address,
      customer_bin: customer.bin_no,
      status: 'draft',
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      salesperson_name: 'Current User',
      items: [
        {
          id: `qi-${Date.now()}`,
          description: itemDesc,
          width: itemWidth,
          height: itemHeight,
          dimension_unit: 'ft',
          area_sft: calculatedArea,
          quantity: itemQty,
          unit: 'sft',
          unit_rate: itemRate,
          item_total: calculatedSubtotal,
        },
      ],
      subtotal: calculatedSubtotal,
      discount_amount: discountAmount,
      vat_rate: 7.5,
      vat_amount: calculatedVat,
      grand_total: calculatedGrandTotal,
      total_cost: Math.round(calculatedSubtotal * 0.55),
      margin_percent: 45.0,
      language_mode: 'bn',
      notes: 'Standard dimensional print order estimate.',
      terms_and_conditions: DEFAULT_QUOTATION_TERMS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, newQuote)
    refreshUsage()
    setIsNewOpen(false)
    showNotification(`Quotation ${quoteNum} created successfully.`)
  }

  const filtered = quotations.filter((q) => {
    const matchSearch =
      q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      q.salesperson_name.toLowerCase().includes(search.toLowerCase())

    const matchStatus = selectedStatus === 'all' || q.status === selectedStatus
    return matchSearch && matchStatus
  })

  // Quick stats
  const totalValue = quotations.reduce((acc, q) => acc + q.grand_total, 0)
  const inNegotiation = quotations
    .filter((q) => q.status === 'negotiation' || q.status === 'sent')
    .reduce((acc, q) => acc + q.grand_total, 0)
  const convertedValue = quotations
    .filter((q) => q.status === 'converted' || q.status === 'approved')
    .reduce((acc, q) => acc + q.grand_total, 0)

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">Draft</Badge>
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>
      case 'viewed':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Viewed</Badge>
      case 'negotiation':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold">Negotiation</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">Approved</Badge>
      case 'converted':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-bold">Converted to Order</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-slate-100 text-slate-500">Expired</Badge>
    }
  }

  return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
      <PageHeader
        titleEn="Quotations & Estimates"
        titleBn="কোটেশন ও প্রাক্কলন"
        descriptionEn="Generate formal commercial estimates, manage pricing negotiation margins, and convert approved proposals to shop floor job orders."
        descriptionBn="আনুষ্ঠানিক কোটেশন তৈরি, দরদাম ও প্রফিট মার্জিন নির্ধারণ এবং অনুমোদিত প্রস্তাবনা সরাসরি প্রোডাকশনে রূপান্তর করুন।"
        icon={FileSpreadsheet}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Link href={`/${slug}/pricing`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                {tBilingual('Live Estimator', 'লাইভ ক্যালকুলেটর')}
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => {
                const check = checkCanCreate('monthly_orders')
                if (!check.allowed) {
                  openLimitExceededModal('monthly_orders')
                  return
                }
                setIsNewOpen(true)
              }}
              disabled={!checkCanCreate('monthly_orders').allowed}
              title={!checkCanCreate('monthly_orders').allowed ? checkCanCreate('monthly_orders').reason : undefined}
              className={cn("bg-blue-600 hover:bg-blue-700 text-xs bangla-text", !checkCanCreate('monthly_orders').allowed && "opacity-60 cursor-not-allowed")}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Quotation', 'নতুন কোটেশন')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500">Total Quoted Pipeline</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalValue} />
          </div>
          <span className="text-[11px] text-slate-400">{quotations.length} total quotations issued</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Active Proposals in Negotiation</span>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            <CurrencyDisplay amount={inNegotiation} />
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Awaiting customer sign-off</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Won & Converted to Orders</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            <CurrencyDisplay amount={convertedValue} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">100% conversion to job tickets</span>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by quote number, customer name, salesperson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'sent', label: 'Sent' },
              { id: 'negotiation', label: 'Negotiation' },
              { id: 'approved', label: 'Approved' },
              { id: 'converted', label: 'Converted' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={selectedStatus === tab.id ? 'default' : 'outline'}
                onClick={() => setSelectedStatus(tab.id)}
                className="text-xs h-8 px-3"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Quotations Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quotation Directory ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">All customer price quotes</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Quote Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Primary Item</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Grand Total (৳)</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  {/* Quote Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    <Link
                      href={`/${slug}/quotations/${q.id}`}
                      className="hover:underline flex items-center gap-1 group"
                    >
                      <span>{q.quotation_number}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{q.customer_name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{q.customer_phone}</div>
                  </td>

                  {/* Primary Item */}
                  <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                    {q.items[0]?.description || 'Custom Job'}
                    {q.items.length > 1 && (
                      <span className="text-slate-400 ml-1">(+{q.items.length - 1} more)</span>
                    )}
                  </td>

                  {/* Subtotal */}
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                    <CurrencyDisplay amount={q.subtotal} />
                  </td>

                  {/* Grand Total */}
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    <CurrencyDisplay amount={q.grand_total} />
                  </td>

                  {/* Valid Until */}
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {q.valid_until}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(q.status)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/${slug}/quotations/${q.id}`}
                      className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Open Cockpit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: CREATE QUOTATION */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Create New Formal Quotation"
        description="Calculate job area, add finishing options, and generate a quotation voucher."
      >
        <form onSubmit={handleCreateQuote} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="qCust" required>Select Customer Profile</Label>
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
                id="qCust"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile}) - {c.area || 'Dhaka'}
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
            <Label htmlFor="qItem" required>Item Description / Specifications</Label>
            <Input
              id="qItem"
              placeholder="e.g. Star Flex Billboard Banner 40ft × 20ft with Brass Eyelets"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qW">Width (ft)</Label>
              <Input
                id="qW"
                type="number"
                step="0.1"
                value={itemWidth}
                onChange={(e) => setItemWidth(Math.max(0.1, Number(e.target.value)))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qH">Height (ft)</Label>
              <Input
                id="qH"
                type="number"
                step="0.1"
                value={itemHeight}
                onChange={(e) => setItemHeight(Math.max(0.1, Number(e.target.value)))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qQty">Quantity</Label>
              <Input
                id="qQty"
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qRate">Rate (৳/sft)</Label>
              <Input
                id="qRate"
                type="number"
                value={itemRate}
                onChange={(e) => setItemRate(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qDisc">Discount (৳ BDT)</Label>
              <Input
                id="qDisc"
                type="number"
                placeholder="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Area (sft)</Label>
              <div className="h-10 px-3 flex items-center bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-xs font-bold">
                {calculatedArea} sft
              </div>
            </div>
          </div>

          {/* Live Quote Summary Banner */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs flex justify-between items-center">
            <div>
              <div className="text-slate-500">Calculated Subtotal: ৳ {calculatedSubtotal}</div>
              <div className="text-slate-500">VAT (7.5%): +৳ {calculatedVat}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Grand Total</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                ৳ {calculatedGrandTotal}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!checkCanCreate('monthly_orders').allowed}
              className={cn("bg-blue-600 hover:bg-blue-700", !checkCanCreate('monthly_orders').allowed && "opacity-60 cursor-not-allowed")}
            >
              Create & Review
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
    </FeatureGate>
  )
}
