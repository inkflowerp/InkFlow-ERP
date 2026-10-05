'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
 QuotationRecord,
 normalizeQuotationRecord,
 extractQuotationsFromAny,
 deduplicateQuotations,
} from '@/types/quotation.types'
import { SalesOrderRecord } from '@/types/order.types'
import { formatBDT } from '@/lib/formatters'
import { getQuotationsAction, convertQuotationToJobOrderAction } from '@/actions/quotation.actions'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export default function SalesManagerPage() {
 const pathname = usePathname()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = company?.slug || 'my-company'
 const companyId = company?.id

 const [localQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [], slug)
 const [serverQuotations, setServerQuotations] = useState<QuotationRecord[] | null>(null)
 const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [], slug)

 const [activeTab, setActiveTab] = useState<'quotations' | 'orders' | 'leads'>('quotations')
 const [notification, setNotification] = useState<string | null>(null)

 useEffect(() => {
 async function load() {
 try {
 const res = await getQuotationsAction(companyId, slug)
 if (res.success && res.data) {
 setServerQuotations(res.data)
        }
      } catch {}
    }
 load()

 const handleRealtimeSync = () => {
 load()
    }

 if (typeof window !== 'undefined') {
 window.addEventListener('printflow_table_synced:quotations', handleRealtimeSync)
 window.addEventListener('printflow_table_synced:sales_orders', handleRealtimeSync)
 window.addEventListener('printflow_table_synced', handleRealtimeSync)
 window.addEventListener('printflow_data_sync', handleRealtimeSync)
 window.addEventListener('storage', handleRealtimeSync)
    }

 return () => {
 if (typeof window !== 'undefined') {
 window.removeEventListener('printflow_table_synced:quotations', handleRealtimeSync)
 window.removeEventListener('printflow_table_synced:sales_orders', handleRealtimeSync)
 window.removeEventListener('printflow_table_synced', handleRealtimeSync)
 window.removeEventListener('printflow_data_sync', handleRealtimeSync)
 window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [companyId, slug])

  // Resiliently merge all quotation sources
 const quotations = React.useMemo(() => {
 const rawList: any[] = []

 if (typeof window !== 'undefined') {
 try {
 for (let i = 0; i < window.localStorage.length; i++) {
 const k = window.localStorage.key(i)
 if (!k) continue
 const raw = window.localStorage.getItem(k)
 if (!raw) continue

 if (
 k.startsWith('printflow_tenant_quotations') ||
 k.startsWith('printflow_quotations') ||
 k.includes('quotation') ||
 k.includes('quotes') ||
 k.includes('draft') ||
 k.includes('outbox') ||
 k.includes('printflow')
          ) {
 const extracted = extractQuotationsFromAny(raw)
 if (extracted.length > 0) {
 rawList.push(...extracted)
            }
          }
        }
      } catch {}
    }

    // Direct DataStore reads
 const dsTenant = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS, slug) || []
 if (Array.isArray(dsTenant)) rawList.push(...dsTenant)

 const dsGlobal = PrintFlowDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
 if (Array.isArray(dsGlobal)) rawList.push(...dsGlobal)

 if (localQuotations && Array.isArray(localQuotations)) {
 rawList.push(...localQuotations)
    }

 if (serverQuotations && Array.isArray(serverQuotations)) {
 rawList.push(...serverQuotations)
    }

 return deduplicateQuotations(rawList, companyId, slug)
  }, [serverQuotations, localQuotations, slug, companyId])

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
  }

 const handleConvertToOrder = async (quoteId: string) => {
 try {
 const q = (quotations || []).find((item) => item.id === quoteId || item.quotation_number === quoteId)
 const res = await convertQuotationToJobOrderAction(
 quoteId,
        { advanceAmount: q?.advance_amount ?? undefined },
 companyId
      )
 if (res.success && res.data) {
 PrintFlowDataStore.createSalesOrderWithIntegrations(res.data)
 if (slug && slug !== 'default') {
 PrintFlowDataStore.addItem(STORAGE_KEYS.ORDERS, res.data, slug)
 if (res.data.job_order) {
 PrintFlowDataStore.addItem(STORAGE_KEYS.JOB_ORDERS, res.data.job_order, slug)
          }
 if (res.data.production_job) {
 PrintFlowDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, res.data.production_job, slug)
          }
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quoteId, {
 status: 'converted',
 converted_order_id: res.data.order_number,
          }, slug)
        }
 PrintFlowDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quoteId, {
 status: 'converted',
 converted_order_id: res.data.order_number,
        })
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('printflow_data_sync'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:sales_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:job_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:quotations'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced'))
        }
 showNotification(`Quotation converted to Job Order Ticket #${res.data.order_number} successfully!`)
      } else {
 const localRes = PrintFlowDataStore.convertQuotationToSalesOrder(quoteId)
 if (localRes) {
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('printflow_data_sync'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:sales_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:job_orders'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:quotations'))
          }
 showNotification(`Quotation converted to Sales Order ${localRes.order_number} successfully!`)
        } else {
 showNotification(`Conversion failed: ${res.error || 'Unknown error'}`)
        }
      }
    } catch {
 const localRes = PrintFlowDataStore.convertQuotationToSalesOrder(quoteId)
 if (localRes) {
 showNotification(`Quotation converted to Sales Order ${localRes.order_number} successfully!`)
      }
    }
  }

 const totalBookedSales = (orders || []).reduce((acc, o) => acc + (o.final_price || 0), 0)
 const pendingQuotes = (quotations || []).filter((q) => q.status !== 'approved' && q.status !== 'rejected')
 const pendingQuotesValue = pendingQuotes.reduce((acc, q) => acc + (q.grand_total || 0), 0)

 return (
    <PanelAccessGuard
 module="orders"action="view"panelTitle="Commercial & Sales"panelTitleBn="কমার্শিয়াল ও সেলস">
      <div className="space-y-6">
      {/* Header */}
      <PageHeader
 titleEn="Commercial & Sales Management"titleBn="কমার্শিয়াল ও সেলস ম্যানেজমেন্ট"descriptionEn="CRM leads, dimensional quotations, booked job orders, advance payments, and customer delivery schedules."descriptionBn="সিআরএম লিড, পরিমাপভিত্তিক কোটেশন, বুক করা জব অর্ডার, অগ্রিম আদায় ও ডেলিভারি সময়সূচী।"icon={Briefcase}
 iconColor="text-primary"badge={
          <Badge variant="outline"className="text-xs bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary bangla-text">
            {tBilingual('Role: Sales Manager', 'রোল: সেলস ম্যানেজার')}
          </Badge>
        }
 actions={
          <Link href={getTenantNavHref('/quotations', pathname, slug)}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold bangla-text shadow-xs">
              <Plus className="mr-1.5 h-4 w-4"/>
              {tBilingual('New Quotation', 'নতুন কোটেশন')}
            </Button>
          </Link>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <KpiGrid columns={4}>
        <KpiCard
 titleEn="Today's Sales Booked"titleBn="আজকের বিক্রয় বুকিং"value={totalBookedSales}
 isCurrency
 icon={TrendingUp}
 colorVariant="emerald"trend={{
 value: 'Live',
 labelEn: 'active revenue',
 labelBn: 'সক্রিয় আয়',
 direction: 'up',
          }}
        />

        <KpiCard
 titleEn="Pending Quotations"titleBn="অপেক্ষমান দরপ্রস্তাব"value={pendingQuotes.length}
 unitEn="Quotes"unitBn="টি কোটেশন"icon={FileSpreadsheet}
 colorVariant="amber"subtitleEn={`Value: ${formatBDT(pendingQuotesValue)}`}
 subtitleBn={`মূল্য: ${formatBDT(pendingQuotesValue)}`}
        />

        <KpiCard
 titleEn="Active Orders"titleBn="সক্রিয় জব অর্ডার"value={orders.length}
 unitEn="Booked"unitBn="টি অর্ডার"icon={Receipt}
 colorVariant="blue"subtitleEn="Direct production pipeline"subtitleBn="উৎপাদন পাইপলাইন"/>

        <KpiCard
 titleEn="Ready for Delivery"titleBn="ডেলিভারির জন্য প্রস্তুত"value={orders.filter((o) => o.status === 'ready_for_delivery').length}
 unitEn="Orders"unitBn="টি অর্ডার"icon={Truck}
 colorVariant="purple"footer={
            <Link
 href={getTenantNavHref('/delivery', pathname, slug)}
 className="text-xs font-semibold text-primary text-primary hover:underline inline-flex items-center gap-1">
              <span>{tBilingual('Generate Challans', 'চালান তৈরি করুন')}</span>
              <span>&rarr;</span>
            </Link>
          }
        />
      </KpiGrid>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto touch-scroll pb-px">
        {[
          { id: 'quotations', label: tBilingual('Active Quotations', 'দরপ্রস্তাব') },
          { id: 'orders', label: tBilingual('Booked Job Orders', 'জব অর্ডার') },
          { id: 'leads', label: tBilingual('Corporate Leads', 'কর্পোরেট লিড') },
        ].map((tab) => (
          <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as typeof activeTab)}
 className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap bangla-text ${
 activeTab === tab.id
                ? 'border-border text-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotations List */}
      {activeTab === 'quotations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">Pending Customer Quotations</CardTitle>
            <CardDescription className="text-xs">
 Review estimates, discount approvals, and convert directly to Job Orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Quote No.</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Items / Specifications</th>
                    <th className="py-3 px-4">Estimated Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {(quotations || []).map((q) => (
                    <tr key={q.id} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                      <td className="py-3.5 px-4 tabular-nums text-xs font-bold text-primary">
                        <Link href={`/quotations/${q.id}`} className="hover:underline">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">{q.customer_name}</td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {q.items?.map((i) => `${i.description} (${i.width}x${i.height} ${i.unit})`).join(', ') || 'Custom Print Job'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <CurrencyDisplay amount={q.grand_total} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline"className="text-xs capitalize">
                          {q.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {q.status !== 'converted' && !q.converted_order_id ? (
                          <Button
 size="sm"variant="outline"onClick={() => handleConvertToOrder(q.id)}
 className="h-8 text-xs font-semibold text-primary hover:bg-primary/10">
 Convert to Order
                          </Button>
                        ) : (
                          <Link
 href={`/orders?search=${q.converted_order_id || ''}`}
 className="text-xs text-primary font-semibold hover:underline">
 Job Order #{q.converted_order_id || 'View'} →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(quotations || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
 No quotations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border dark:divide-border">
              {(quotations || []).map((q) => (
                <div key={q.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
 href={`/quotations/${q.id}`}
 className="tabular-nums text-xs font-bold text-primary hover:underline">
                        {q.quotation_number}
                      </Link>
                      <div className="font-semibold text-sm text-foreground mt-0.5">
                        {q.customer_name}
                      </div>
                    </div>
                    <Badge variant="outline"className="text-xs capitalize">
                      {q.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted p-2.5 rounded-lg border border-border /60">
                    {q.items?.map((i) => `${i.description} (${i.width}x${i.height} ${i.unit})`).join(', ') || 'Custom Print Job'}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="font-black tabular-nums text-base text-foreground">
                      <CurrencyDisplay amount={q.grand_total} />
                    </div>
                    {q.status !== 'converted' && !q.converted_order_id ? (
                      <Button
 size="sm"variant="outline"onClick={() => handleConvertToOrder(q.id)}
 className="h-9 px-3 text-xs font-bold text-primary hover:bg-primary/10">
 Convert to Order
                      </Button>
                    ) : (
                      <Link
 href={`/orders?search=${q.converted_order_id || ''}`}
 className="text-xs text-primary font-bold hover:underline">
 Job Order #{q.converted_order_id || 'View'} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {(quotations || []).length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
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
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">Commercial Job Orders ({orders.length})</CardTitle>
            <CardDescription className="text-xs">
 Track production and delivery statuses for sales team commission & customer follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Order No.</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Due</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {(orders || []).map((o) => (
                    <tr key={o.id} className="hover:bg-muted">
                      <td className="py-3.5 px-4 tabular-nums text-xs font-bold text-primary">
                        <Link href={`/orders/${o.id}`} className="hover:underline">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">{o.customer_name}</td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <CurrencyDisplay amount={o.final_price || 0} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-success">
                        <CurrencyDisplay amount={o.advance_amount || 0} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-destructive">
                        <CurrencyDisplay amount={o.due_amount || 0} />
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline"className="text-xs capitalize">
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(orders || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
 No commercial job orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border dark:divide-border">
              {(orders || []).map((o) => (
                <div key={o.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
 href={`/orders/${o.id}`}
 className="tabular-nums text-xs font-bold text-primary hover:underline">
                        {o.order_number}
                      </Link>
                      <div className="font-semibold text-sm text-foreground mt-0.5">
                        {o.customer_name}
                      </div>
                    </div>
                    <Badge variant="outline"className="text-xs capitalize">
                      {o.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted rounded-lg border border-border /60 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block">Total</span>
                      <div className="tabular-nums font-bold text-xs text-foreground">
                        {formatBDT(o.final_price || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-success uppercase block">Paid</span>
                      <div className="tabular-nums font-bold text-xs text-success">
                        {formatBDT(o.advance_amount || 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-destructive uppercase block">Due</span>
                      <div className="tabular-nums font-bold text-xs text-destructive">
                        {formatBDT(o.due_amount || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(orders || []).length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs">
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
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">Corporate Printing Leads</CardTitle>
            <CardDescription className="text-xs">
 New prospective business inquiries from advertising agencies and corporate clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 text-xs text-muted-foreground">
            3 new corporate procurement inquiries received via WhatsApp and phone today.
          </CardContent>
        </Card>
      )}
    </div>
    </PanelAccessGuard>
  )
}
