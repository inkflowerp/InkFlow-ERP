'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { formatBDT, toBengaliNumerals } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { SalesOrderRecord } from '@/types/order.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { ProductionJobRecord } from '@/types/production.types'
import { BarChart2 } from 'lucide-react'
import { getBangladeshDateRange, toBangladeshDateString } from '@/lib/utils/business-date'

export function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-5 border-slate-200 dark:border-slate-800">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
          <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800/60 rounded mb-6" />
          <div className="h-56 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
        </Card>
      ))}
    </div>
  )
}

function EmptyChartState({ title, titleBn }: { title?: string; titleBn?: string }) {
  const { tBilingual } = useI18n()
  return (
    <div className="h-56 w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center p-6">
      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-3 text-slate-400 mb-2">
        <BarChart2 className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 bangla-text">
        {tBilingual('Not enough data yet', 'এখনও পর্যাপ্ত তথ্য নেই')}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 bangla-text">
        {tBilingual(
          title || 'New chart trends will appear automatically as you create records.',
          titleBn || 'নতুন রেকর্ড তৈরি করলে চার্ট স্বয়ংক্রিয়ভাবে আপডেট হবে।'
        )}
      </p>
    </div>
  )
}

export function DashboardCharts() {
  const { locale, tBilingual } = useI18n()
  const { isOwner, isSales, isAccountant, can } = usePermissions()
  const canSeeFinancials = isOwner || isSales || isAccountant || can('view', 'invoices') || can('view', 'reports')
  const num = (v: number | string) => (typeof v === 'number' ? v.toLocaleString() : v)

  // Live Data Stores
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [payments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  const [productionJobs] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])

  // 1. Compute dynamic 7-day sales and collections trend using Bangladesh Date Range
  const salesTrendData = useMemo(() => {
    const range = getBangladeshDateRange(7)

    return range.map((item) => {
      // Aggregate invoices for this day
      const daySales = (invoices || [])
        .filter((inv) => {
          const invDate = toBangladeshDateString(inv.invoice_date || inv.created_at)
          const rawStatus = String(inv.status || '').toLowerCase()
          return invDate === item.dateStr && rawStatus !== 'cancelled' && rawStatus !== 'void'
        })
        .reduce((sum, inv) => sum + (Number(inv.grand_total) || Number(inv.subtotal) || 0), 0)

      // Aggregate payments for this day
      const dayCollections = (payments || [])
        .filter((p) => {
          const pDate = toBangladeshDateString(p.payment_date || p.created_at)
          return pDate === item.dateStr
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

      return {
        day: item.dayOfWeek,
        dateStr: item.dateStr,
        sales: daySales,
        collections: dayCollections,
      }
    })
  }, [invoices, payments])

  const hasSalesTrendData = useMemo(() => {
    return salesTrendData.some((d) => d.sales > 0 || d.collections > 0)
  }, [salesTrendData])

  // 2. Compute payment collection by method from live data
  const paymentCollectionData = useMemo(() => {
    const methodTotals: Record<string, number> = {
      bkash: 0,
      nagad: 0,
      bank: 0,
      cash: 0,
    }

    ;(payments || []).forEach((p) => {
      const method = (p.payment_method || '').toLowerCase()
      if (method.includes('bkash')) {
        methodTotals.bkash += Number(p.amount) || 0
      } else if (method.includes('nagad') || method.includes('rocket')) {
        methodTotals.nagad += Number(p.amount) || 0
      } else if (method.includes('bank') || method.includes('cheque') || method.includes('card')) {
        methodTotals.bank += Number(p.amount) || 0
      } else {
        methodTotals.cash += Number(p.amount) || 0
      }
    })

    const channels = [
      { name: 'bKash MFS', key: 'bkash', color: '#ec4899' },
      { name: 'Nagad / Rocket', key: 'nagad', color: '#f97316' },
      { name: 'Bank Transfer / Cheque', key: 'bank', color: '#3b82f6' },
      { name: 'Cash Counter', key: 'cash', color: '#10b981' },
    ]

    return channels
      .map((c) => ({
        name: c.name,
        amount: methodTotals[c.key] || 0,
        color: c.color,
      }))
      .filter((c) => c.amount > 0)
  }, [payments])

  const hasPaymentData = paymentCollectionData.length > 0

  // 3. Compute order stage distribution from live orders
  const orderStatusData = useMemo(() => {
    const stageCounts: Record<string, number> = {
      artwork_proofing: 0,
      in_production: 0,
      finishing: 0,
      ready_for_delivery: 0,
      delivered: 0,
    }

    ;(orders || []).forEach((o) => {
      const st = o.status as string
      if (st === 'draft' || st === 'pending_approval' || st === 'design_pending' || st === 'pending') {
        stageCounts.artwork_proofing++
      } else if (st === 'in_production') {
        stageCounts.in_production++
      } else if (st === 'finishing') {
        stageCounts.finishing++
      } else if (st === 'ready_for_delivery') {
        stageCounts.ready_for_delivery++
      } else if (st === 'delivered') {
        stageCounts.delivered++
      } else {
        stageCounts.in_production++
      }
    })

    const stages = [
      { name: 'Artwork / Proofing', key: 'artwork_proofing', color: '#3b82f6' },
      { name: 'Print Queue', key: 'in_production', color: '#f59e0b' },
      { name: 'Finishing', key: 'finishing', color: '#8b5cf6' },
      { name: 'Ready for Dispatch', key: 'ready_for_delivery', color: '#10b981' },
      { name: 'Delivered', key: 'delivered', color: '#06b6d4' },
    ]

    return stages
      .map((s) => ({
        name: s.name,
        value: stageCounts[s.key] || 0,
        color: s.color,
      }))
      .filter((s) => s.value > 0)
  }, [orders])

  const activeOrdersCount = (orders || []).filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length

  // 4. Compute active production work volume by department from live jobs
  const productionDepartmentData = useMemo(() => {
    const deptMap: Record<string, { jobCount: number; totalQuantity: number }> = {}

    ;(productionJobs || []).forEach((job) => {
      if (job.status === 'completed' || (job.status as string) === 'cancelled') return
      const deptName = (job.department || 'printing').replace(/_/g, ' ').toUpperCase()
      if (!deptMap[deptName]) {
        deptMap[deptName] = { jobCount: 0, totalQuantity: 0 }
      }
      deptMap[deptName].jobCount++
      deptMap[deptName].totalQuantity += Number(job.quantity) || 1
    })

    return Object.entries(deptMap).map(([department, data]) => ({
      department,
      jobCount: data.jobCount,
      totalQuantity: data.totalQuantity,
    }))
  }, [productionJobs])

  const hasProductionData = productionDepartmentData.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1 & 2: Financial Charts (Protected) */}
      {canSeeFinancials && (
        <>
          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold bangla-text">
                    {tBilingual('Daily Sales & Collection Trend', 'দৈনিক বিক্রয় ও আদায় ট্রেন্ড')}
                  </CardTitle>
                  <CardDescription className="text-xs bangla-text">
                    {tBilingual('Past 7 days performance comparison (৳ BDT)', 'বিগত ৭ দিনের তুলনা (টাকা)')}
                  </CardDescription>
                </div>
                {hasSalesTrendData && (
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1 bangla-text">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> {tBilingual('Sales', 'সেলস')}
                    </span>
                    <span className="flex items-center gap-1 bangla-text">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {tBilingual('Collections', 'আদায়')}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!hasSalesTrendData ? (
                <EmptyChartState />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrendData}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(val) => `৳${val / 1000}k`} />
                      <Tooltip formatter={(value: any) => [`৳ ${formatBDT(Number(value))}`, '']} />
                      <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" name="Sales" />
                      <Area type="monotone" dataKey="collections" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colGrad)" name="Collections" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-5">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold bangla-text">
                    {tBilingual('Payment Collection by Method', 'পেমেন্ট গেটওয়ে ও ক্যাশ কালেকশন')}
                  </CardTitle>
                  <CardDescription className="text-xs bangla-text">
                    {tBilingual('bKash, Nagad, Bank deposit & Cash split', 'বিকাশ, নগদ, ব্যাংক ও ক্যাশ কাউন্টার')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-semibold bangla-text">
                  {tBilingual('All Recorded', 'সর্বমোট প্রাপ্তি')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!hasPaymentData ? (
                <EmptyChartState />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentCollectionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(val) => `৳${val / 1000}k`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={140} />
                      <Tooltip formatter={(value: any) => [`৳ ${formatBDT(Number(value))}`, 'Collected']} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {paymentCollectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Chart 3: Order Status Distribution (Donut) */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold bangla-text">
                {tBilingual('Order Stage Distribution', 'অর্ডার ও কাজের পর্যায় বিন্যাস')}
              </CardTitle>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Active jobs by production phase', 'উৎপাদন পর্যায় অনুযায়ী চলমান কাজ')}
              </CardDescription>
            </div>
            <span className="text-xs font-bold text-blue-600 bangla-text">
              {tBilingual(`${activeOrdersCount} Active Orders`, `${num(activeOrdersCount)}টি সক্রিয় অর্ডার`)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orderStatusData.length === 0 ? (
            <EmptyChartState />
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 flex-1 text-xs">
                {orderStatusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{s.name}</span>
                    </div>
                    <strong className="text-slate-900 dark:text-white bangla-text">
                      {num(s.value)} {tBilingual('Jobs', 'টি কাজ')}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 4: Active Work Volume by Department */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold bangla-text">
                {tBilingual('Active Work by Department', 'বিভাগ অনুযায়ী চলমান কাজের চাপ')}
              </CardTitle>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Current active job count across departments', 'বিভিন্ন বিভাগের সক্রিয় কাজের সংখ্যা')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!hasProductionData ? (
            <EmptyChartState />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productionDepartmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="jobCount" fill="#3b82f6" name="Active Jobs" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
