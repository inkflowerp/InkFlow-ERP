'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
  Wifi,
  WifiOff,
  Clock,
  Briefcase,
  Printer,
  LayoutDashboard,
  Zap,
  Phone,
  MessageSquare,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Play,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuickQuotationModal } from '@/components/mobile/quick-quotation-modal'
import { OfflineSyncDrawer } from '@/components/mobile/offline-sync-drawer'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { OfflineSyncManager } from '@/lib/offline/sync-queue'
import { useTenant } from '@/hooks/use-tenant'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { formatBDT } from '@/lib/formatters'
import { ProductionJobRecord } from '@/types/production.types'
import { SalesOrderRecord } from '@/types/order.types'
import { CustomerRecord } from '@/types/crm.types'
import { MaterialRecord } from '@/types/inventory.types'

type MobileTab = 'owner' | 'sales' | 'production'

export default function MobileSuitePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { company } = useTenant()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const tabParam = (searchParams.get('tab') as MobileTab) || 'owner'
  const actionParam = searchParams.get('action')

  const [activeTab, setActiveTab] = useState<MobileTab>(tabParam)
  const [quickQuoteOpen, setQuickQuoteOpen] = useState<boolean>(actionParam === 'quote')
  const [syncDrawerOpen, setSyncDrawerOpen] = useState<boolean>(false)

  const { isOnline } = useNetworkStatus()
  const { pendingCount } = useOfflineQueue()

  // Real Tenant Data
  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])
  const [productionJobs, setProductionJobs] = useDataStore<ProductionJobRecord[]>(
    STORAGE_KEYS.PRODUCTION_JOBS,
    []
  )

  // Payment form state
  const [payAmount, setPayAmount] = useState<string>('')
  const [payCustomer, setPayCustomer] = useState<string>('')
  const [payMethod, setPayMethod] = useState<string>('bkash')
  const [paySuccess, setPaySuccess] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const switchTab = (tab: MobileTab) => {
    setActiveTab(tab)
    router.replace(`/${tenantSlug}/mobile?tab=${tab}`)
  }

  // Calculate live owner metrics
  const todaySalesMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayInvoices = invoices.filter((i) => {
      const d = (i.created_at || i.issue_date || '').split('T')[0]
      return d === today
    })

    const total = todayInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || Number(i.subtotal) || 0), 0)
    const cash = todayInvoices
      .filter((i) => i.payment_method === 'cash')
      .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
    const mfs = todayInvoices
      .filter((i) => i.payment_method === 'mfs' || i.payment_method === 'bkash' || i.payment_method === 'nagad')
      .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)
    const bank = todayInvoices
      .filter((i) => i.payment_method === 'bank' || i.payment_method === 'cheque')
      .reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0)

    return { total, cash, mfs, bank }
  }, [invoices])

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'draft' || o.status === 'pending')
  }, [orders])

  const dueInvoices = useMemo(() => {
    return invoices.filter((i) => (Number(i.due_amount) || 0) > 0)
  }, [invoices])

  const totalDueAmount = useMemo(() => {
    return dueInvoices.reduce((sum, i) => sum + (Number(i.due_amount) || 0), 0)
  }, [dueInvoices])

  const lowStockMaterials = useMemo(() => {
    return materials.filter((m) => (Number(m.current_stock) || 0) <= (Number(m.min_stock_level) || 0) && (Number(m.min_stock_level) || 0) > 0)
  }, [materials])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5)
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.mobile && c.mobile.includes(customerSearch)) ||
        (c.company_name && c.company_name.toLowerCase().includes(customerSearch.toLowerCase()))
    )
  }, [customers, customerSearch])

  const handleStartJob = (jobId: string) => {
    setProductionJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'in_progress', updated_at: new Date().toISOString() } : j))
    )
    OfflineSyncManager.enqueueAction(
      company?.id || 'c-01',
      'production.start',
      `Started Job ${jobId}`,
      `/api/production/start/${jobId}`,
      { jobId, timestamp: new Date().toISOString() }
    )
  }

  const handleCompleteJob = (jobId: string) => {
    setProductionJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'completed', updated_at: new Date().toISOString() } : j))
    )
    OfflineSyncManager.enqueueAction(
      company?.id || 'c-01',
      'production.complete',
      `Completed Job ${jobId}`,
      `/api/production/complete/${jobId}`,
      { jobId, timestamp: new Date().toISOString() }
    )
  }

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payAmount || !payCustomer) return

    OfflineSyncManager.enqueueAction(
      company?.id || 'c-01',
      'payment.record',
      `Payment ৳${parseInt(payAmount).toLocaleString()} from ${payCustomer}`,
      '/api/billing/payments',
      {
        customer: payCustomer,
        amount: parseFloat(payAmount),
        method: payMethod,
        date: new Date().toISOString(),
      }
    )
    setPaySuccess(`Payment of ৳${parseInt(payAmount).toLocaleString()} recorded (${isOnline ? 'Online' : 'Queued offline'})`)
    setPayAmount('')
    setPayCustomer('')
    setTimeout(() => setPaySuccess(null), 3000)
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20 font-sans">
      {/* Mobile Top App Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold uppercase tracking-wider">
            <span>{company?.name || 'PrintERP Mobile'}</span>
            {!isOnline ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <WifiOff className="h-2.5 w-2.5" /> OFFLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <Wifi className="h-2.5 w-2.5" /> ONLINE
              </span>
            )}
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Mobile Workshop Hub
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSyncDrawerOpen(true)}
            className="h-8 text-xs bg-slate-900 border-slate-800 text-slate-300 rounded-xl px-2.5 relative"
          >
            <Clock className="h-3.5 w-3.5 mr-1 text-indigo-400" />
            <span>Sync</span>
            {pendingCount > 0 && (
              <span className="ml-1 h-4 w-4 rounded-full bg-indigo-600 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Persona Role Switcher */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => switchTab('owner')}
          className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'owner'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Owner</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('sales')}
          className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'sales'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Sales POS</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('production')}
          className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'production'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Printer className="h-4 w-4" />
          <span>Press</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. BUSINESS OWNER TAB                                                */}
      {/* ==================================================================== */}
      {activeTab === 'owner' && (
        <div className="space-y-3.5 animate-in fade-in-50">
          {/* Priority 1: Today's Sales */}
          <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Today&apos;s Sales &amp; Collections</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="text-3xl font-black text-white mt-1">
                ৳ {formatBDT(todaySalesMetrics.total)}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Cash POS</div>
                <div className="font-bold text-white mt-0.5">৳ {formatBDT(todaySalesMetrics.cash)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">bKash/Nagad</div>
                <div className="font-bold text-emerald-400 mt-0.5">৳ {formatBDT(todaySalesMetrics.mfs)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Bank EFT</div>
                <div className="font-bold text-indigo-400 mt-0.5">৳ {formatBDT(todaySalesMetrics.bank)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Quote Floating Shortcut */}
          <Button
            onClick={() => setQuickQuoteOpen(true)}
            className="w-full h-12 text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-98 transition-transform cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Instant Quick Quotation (SFT / BDT)</span>
          </Button>

          {/* Priority 2: Pending Orders & Approvals */}
          <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Pending Orders ({pendingOrders.length})</span>
              </CardTitle>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Awaiting Processing
              </span>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-800/60 space-y-2 text-xs">
              {pendingOrders.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  No pending orders awaiting approval.
                </div>
              ) : (
                pendingOrders.slice(0, 4).map((ord) => (
                  <div key={ord.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{ord.order_number} • {ord.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{ord.customer_name_bn || 'Sales Order'}</div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">
                      ৳ {formatBDT(ord.final_price || ord.subtotal || 0)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Priority 3: Due Payments (Receivables) */}
          <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Critical Due Payments</span>
              </CardTitle>
              <span className="text-[10px] font-bold text-rose-400">Total: ৳ {formatBDT(totalDueAmount)}</span>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              {dueInvoices.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  No outstanding receivables or overdue payments.
                </div>
              ) : (
                dueInvoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{inv.customer_name || 'Client'}</div>
                      <div className="text-[11px] text-rose-400 font-mono">{inv.invoice_number} • Due: {inv.due_date || 'Agreed'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">৳ {formatBDT(inv.due_amount)}</span>
                      {inv.customer_phone && (
                        <a
                          href={`tel:${inv.customer_phone}`}
                          className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Priority 4: Live Production Status */}
          <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-800">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="h-3.5 w-3.5 text-indigo-400" />
                <span>Live Press Floor Status ({productionJobs.length} Active Jobs)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              {productionJobs.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  No active jobs currently in production. Machines are idle &amp; ready.
                </div>
              ) : (
                productionJobs.slice(0, 3).map((j) => (
                  <div key={j.id} className="space-y-1 pt-1">
                    <div className="flex justify-between text-slate-300">
                      <span className="font-bold">{j.production_job_number} - {j.product_name}</span>
                      <span className="text-emerald-400 font-mono capitalize">{j.status.replace('_', ' ')}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: j.status === 'completed' ? '100%' : j.status === 'in_progress' ? '60%' : '20%' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Priority 5: Inventory Alerts */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <AlertCircle className="h-4 w-4" />
              <span>Low Stock Material Alerts</span>
            </div>
            {lowStockMaterials.length === 0 ? (
              <p className="text-slate-400 text-[11px]">
                All inventory materials are at healthy operational stock levels.
              </p>
            ) : (
              <p className="text-slate-400 text-[11px]">
                {lowStockMaterials.slice(0, 2).map((m) => `${m.name}: ${m.current_stock} ${m.unit} left`).join(' • ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. SALES POS TAB                                                     */}
      {/* ==================================================================== */}
      {activeTab === 'sales' && (
        <div className="space-y-3.5 animate-in fade-in-50">
          {/* Action 1: Quick Customer Lookup */}
          <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider">
                Customer Direct Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <div className="divide-y divide-slate-800/60 pt-1 text-xs">
                {filteredCustomers.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    {customerSearch ? 'No matching customers found.' : 'No customers in directory.'}
                  </div>
                ) : (
                  filteredCustomers.map((cust) => (
                    <div key={cust.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{cust.name} {cust.company_name ? `(${cust.company_name})` : ''}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cust.mobile}</div>
                      </div>
                      <div className="flex gap-1.5">
                        {cust.mobile && (
                          <>
                            <a
                              href={`tel:${cust.mobile}`}
                              className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center hover:bg-slate-700"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${cust.mobile.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-600 hover:text-white"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action 2: Fast Payment Collection */}
          <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Collect Payment / Advance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {paySuccess && (
                <div className="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{paySuccess}</span>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-slate-400 block mb-1">Customer Name / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name..."
                    value={payCustomer}
                    onChange={(e) => setPayCustomer(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-medium text-slate-400 block mb-1">Amount (BDT)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="৳ 0"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-sm font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-400 block mb-1">Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs text-white"
                    >
                      <option value="bkash">bKash Merchant</option>
                      <option value="nagad">Nagad Direct</option>
                      <option value="cash">Cash Counter</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Confirm Receipt &amp; Generate Voucher</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Action 3: Quick Quotation Trigger */}
          <Button
            onClick={() => setQuickQuoteOpen(true)}
            className="w-full h-12 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" />
            <span>Create New Estimate (Offline Ready)</span>
          </Button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. PRODUCTION PRESS FLOOR TAB                                        */}
      {/* ==================================================================== */}
      {activeTab === 'production' && (
        <div className="space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Press Queue</span>
            <span className="text-[11px] font-mono text-indigo-400">{productionJobs.length} Jobs Total</span>
          </div>

          <div className="space-y-3">
            {productionJobs.length === 0 ? (
              <Card className="p-8 text-center bg-slate-900 border-slate-800 text-slate-500 text-xs">
                No active jobs in production queue. Jobs created from work orders will appear here.
              </Card>
            ) : (
              productionJobs.map((job) => (
                <Card
                  key={job.id}
                  className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden shadow-md"
                >
                  <CardHeader className="p-3.5 pb-2 bg-slate-950/60 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs">{job.production_job_number}</div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : job.status === 'in_progress'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm font-black text-slate-200 mt-0.5">{job.product_name}</div>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-300">
                        Qty: {job.quantity} • Dimensions: {job.dimensions_spec || 'Standard'}
                      </div>
                      {job.production_instructions && <div className="text-[11px] text-slate-400">{job.production_instructions}</div>}
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500">Department:</span>
                        <div className="font-medium text-white capitalize">{job.department || 'Floor Queue'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Operator:</span>
                        <div className="font-mono text-indigo-400">{job.assigned_workers?.[0] || 'Unassigned'}</div>
                      </div>
                    </div>

                    {/* Production Operator Action Buttons */}
                    <div className="pt-1">
                      {(job.status === 'queued' || (job.status as any) === 'pending') && (
                        <Button
                          type="button"
                          onClick={() => handleStartJob(job.id)}
                          className="w-full h-12 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          <span>Start Printing &amp; Log Run</span>
                        </Button>
                      )}

                      {job.status === 'in_progress' && (
                        <Button
                          type="button"
                          onClick={() => handleCompleteJob(job.id)}
                          className="w-full h-12 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                        >
                          <Check className="h-5 w-5" />
                          <span>Mark Completed &amp; Move to Finishing</span>
                        </Button>
                      )}

                      {job.status === 'completed' && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-bold text-xs flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Print Finished • Ready for Delivery</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Quotation Modal */}
      <QuickQuotationModal
        open={quickQuoteOpen}
        onClose={() => setQuickQuoteOpen(false)}
        tenantSlug={tenantSlug}
      />

      {/* Offline Sync Drawer */}
      <OfflineSyncDrawer
        open={syncDrawerOpen}
        onClose={() => setSyncDrawerOpen(false)}
      />
    </div>
  )
}
