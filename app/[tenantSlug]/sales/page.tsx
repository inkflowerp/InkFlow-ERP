'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  FileSpreadsheet,
  Receipt,
  Truck,
  TrendingUp,
  Plus,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { QuotationRecord } from '@/types/quotation.types'
import { SalesOrderRecord } from '@/types/order.types'
import { formatBDT } from '@/lib/formatters'

export default function SalesManagerPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [quotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])

  const [activeTab, setActiveTab] = useState<'quotations' | 'orders' | 'leads'>('quotations')
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleConvertToOrder = (quoteId: string) => {
    const res = PrintERPDataStore.convertQuotationToSalesOrder(quoteId)
    if (res) {
      showNotification(`Quotation converted to Sales Order ${res.order_number} successfully!`)
    } else {
      showNotification('Quotation updated.')
    }
  }

  const totalBookedSales = (orders || []).reduce((acc, o) => acc + (o.final_price || 0), 0)
  const pendingQuotes = (quotations || []).filter((q) => q.status !== 'approved' && q.status !== 'rejected')
  const pendingQuotesValue = pendingQuotes.reduce((acc, q) => acc + (q.grand_total || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Commercial & Sales Management"
        titleBn="কমার্শিয়াল ও সেলস ম্যানেজমেন্ট"
        descriptionEn="CRM leads, dimensional quotations, booked job orders, advance payments, and customer delivery schedules."
        descriptionBn="সিআরএম লিড, পরিমাপভিত্তিক কোটেশন, বুক করা জব অর্ডার, অগ্রিম আদায় ও ডেলিভারি সময়সূচী।"
        icon={Briefcase}
        iconColor="text-blue-600"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
            {tBilingual('Role: Sales Manager', 'রোল: সেলস ম্যানেজার')}
          </Badge>
        }
        actions={
          <Link href={`/${slug}/quotations`}>
            <Button className="bg-blue-600 hover:bg-blue-700 bangla-text">
              <Plus className="mr-1.5 h-4 w-4" />
              {tBilingual('New Quotation', 'নতুন কোটেশন')}
            </Button>
          </Link>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Today&apos;s Sales Booked</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalBookedSales} />
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> Live active revenue
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pending Quotations</span>
            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {pendingQuotes.length} Quotes
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Value: <CurrencyDisplay amount={pendingQuotesValue} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Orders</span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {orders.length} Booked
          </div>
          <div className="text-[11px] text-blue-600 mt-1">
            Direct production pipeline
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Ready for Delivery</span>
            <Truck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {orders.filter((o) => o.status === 'ready_for_delivery').length} Orders
          </div>
          <div className="text-[11px] text-purple-600 mt-1">
            <Link href={`/${slug}/delivery`} className="hover:underline">
              Generate Challans &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto touch-scroll pb-px">
        {[
          { id: 'quotations', label: tBilingual('Active Quotations (দরপ্রস্তাব)', 'দরপ্রস্তাব') },
          { id: 'orders', label: tBilingual('Booked Job Orders (জব অর্ডার)', 'জব অর্ডার') },
          { id: 'leads', label: tBilingual('Corporate Leads (কর্পোরেট লিড)', 'কর্পোরেট লিড') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap bangla-text ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotations List */}
      {activeTab === 'quotations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Pending Customer Quotations</CardTitle>
            <CardDescription className="text-xs">
              Review estimates, discount approvals, and convert directly to Job Orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Quote No.</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Items / Specifications</th>
                    <th className="py-3 px-4">Estimated Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(quotations || []).map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-blue-600">
                        <Link href={`/${slug}/quotations/${q.id}`} className="hover:underline">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{q.customer_name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {q.items?.map((i) => `${i.description} (${i.width}x${i.height} ${i.unit})`).join(', ') || 'Custom Print Job'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={q.grand_total} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {q.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {q.status !== 'approved' && q.status !== 'converted' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertToOrder(q.id)}
                            className="h-8 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Convert to Order
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">Converted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(quotations || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No quotations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {(quotations || []).map((q) => (
                <div key={q.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/${slug}/quotations/${q.id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {q.quotation_number}
                      </Link>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                        {q.customer_name}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {q.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    {q.items?.map((i) => `${i.description} (${i.width}x${i.height} ${i.unit})`).join(', ') || 'Custom Print Job'}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="font-black font-mono text-base text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={q.grand_total} />
                    </div>
                    {q.status !== 'approved' && q.status !== 'converted' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvertToOrder(q.id)}
                        className="h-9 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50"
                      >
                        Convert to Order
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold">Converted</span>
                    )}
                  </div>
                </div>
              ))}
              {(quotations || []).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No quotations found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Orders List */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Commercial Job Orders ({orders.length})</CardTitle>
            <CardDescription className="text-xs">
              Track production and delivery statuses for sales team commission & customer follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order No.</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Due</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(orders || []).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-blue-600">
                        <Link href={`/${slug}/orders/${o.id}`} className="hover:underline">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{o.customer_name}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={o.final_price || 0} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600">
                        <CurrencyDisplay amount={o.advance_amount || 0} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-red-600">
                        <CurrencyDisplay amount={o.due_amount || 0} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(orders || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No commercial job orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {(orders || []).map((o) => (
                <div key={o.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/${slug}/orders/${o.id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
                        {o.customer_name}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {o.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/60 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        ৳{formatBDT(o.final_price || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase block">Paid</span>
                      <div className="font-mono font-bold text-xs text-emerald-600">
                        ৳{formatBDT(o.advance_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-red-500 uppercase block">Due</span>
                      <div className="font-mono font-bold text-xs text-red-600">
                        ৳{formatBDT(o.due_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(orders || []).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No commercial job orders found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads List */}
      {activeTab === 'leads' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base">Corporate Printing Leads</CardTitle>
            <CardDescription className="text-xs">
              New prospective business inquiries from advertising agencies and corporate clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-500">
            3 new corporate procurement inquiries received via WhatsApp and phone today.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
