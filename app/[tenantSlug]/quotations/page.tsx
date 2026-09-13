'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import { QuotationRecord, QuotationStatus } from '@/types/quotation.types'
import { NewQuotationModal } from '@/components/quotations/new-quotation-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

export default function QuotationsPage() {
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal } = useSubscription()
  const { tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [quotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // New Quotation Modal State
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleQuotationCreated = (quote: QuotationRecord) => {
    showNotification(`Quotation #${quote.quotation_number} created successfully.`)
  }

  const filtered = quotations.filter((q) => {
    const matchSearch =
      q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.salesperson_name && q.salesperson_name.toLowerCase().includes(search.toLowerCase())) ||
      (q.customer_phone && q.customer_phone.includes(search))

    const matchStatus = selectedStatus === 'all' || q.status === selectedStatus
    return matchSearch && matchStatus
  })

  // Quick stats
  const totalValue = quotations.reduce((acc, q) => acc + (q.grand_total || 0), 0)
  const inNegotiation = quotations
    .filter((q) => q.status === 'negotiation' || q.status === 'sent')
    .reduce((acc, q) => acc + (q.grand_total || 0), 0)
  const convertedValue = quotations
    .filter((q) => q.status === 'converted' || q.status === 'approved')
    .reduce((acc, q) => acc + (q.grand_total || 0), 0)

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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <PageHeader
          titleEn="Quotations & Estimates"
          titleBn="কোটেশন ও প্রাক্কলন"
          descriptionEn="Generate formal commercial estimates, resolve custom rates, and convert approved proposals to job orders."
          descriptionBn="আনুষ্ঠানিক কোটেশন তৈরি, দরদাম ও কাস্টমার রেট নির্ধারণ এবং অনুমোদিত প্রস্তাবনা সরাসরি অর্ডারে রূপান্তর করুন।"
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
                title={!checkCanCreate('monthly_orders').allowed ? checkCanCreate('monthly_orders').reason : undefined}
                className="bg-blue-600 hover:bg-blue-700 text-xs bangla-text shadow-sm hover:shadow"
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
          <Card className="p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Total Quoted Pipeline</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              <CurrencyDisplay amount={totalValue} />
            </div>
            <span className="text-[11px] text-slate-400">{quotations.length} total quotations issued</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Active Proposals in Negotiation</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              <CurrencyDisplay amount={inNegotiation} />
            </div>
            <span className="text-[11px] text-amber-600 font-medium">Awaiting customer sign-off</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Won & Converted to Orders/Invoices</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              <CurrencyDisplay amount={convertedValue} />
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Approved job tickets</span>
          </Card>
        </div>

        {/* Filter Tabs & Search */}
        <Card className="p-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by quote number, customer name, phone, salesperson..."
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
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quotation Directory ({filtered.length})</CardTitle>
              <span className="text-xs text-slate-400">All commercial proposals & estimates</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                        {tBilingual('No quotations found matching filter.', 'কোন কোটেশন পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((q) => (
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
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {q.customer_name}
                            {q.customer_company && (
                              <span className="text-slate-500 font-normal text-xs ml-1">({q.customer_company})</span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">{q.customer_phone}</div>
                        </td>

                        {/* Primary Item */}
                        <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300">
                          {q.items?.[0]?.description || 'Custom Job'}
                          {q.items && q.items.length > 1 && (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {tBilingual('No quotations found matching filter.', 'কোন কোটেশন পাওয়া যায়নি।')}
                </div>
              ) : (
                filtered.map((q) => (
                  <div key={q.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Top: Quote # & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/${slug}/quotations/${q.id}`}
                        className="font-mono font-bold text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>{q.quotation_number}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                      {getStatusBadge(q.status)}
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                          {q.customer_name} {q.customer_company && `(${q.customer_company})`}
                        </div>
                        {q.customer_phone && (
                          <a href={`tel:${q.customer_phone}`} className="text-xs font-mono text-blue-600 hover:underline">
                            {q.customer_phone}
                          </a>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Grand Total</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          <CurrencyDisplay amount={q.grand_total} />
                        </span>
                      </div>
                    </div>

                    {/* Primary Item Spec */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                        {q.items?.[0]?.description || 'Custom Job'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span>Subtotal: <CurrencyDisplay amount={q.subtotal} /></span>
                        <span>Valid: {q.valid_until}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/${slug}/quotations/${q.id}`}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 min-h-[38px]"
                      >
                        Open Quotation Cockpit →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* NEW REBUILT MODAL: CREATE QUOTATION */}
        <NewQuotationModal
          open={isNewOpen}
          onOpenChange={setIsNewOpen}
          onQuotationCreated={handleQuotationCreated}
          companyId={company?.id || 'c-01'}
        />
      </div>
    </FeatureGate>
  )
}
