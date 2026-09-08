'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  FileCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformBillingReconciliationAction } from '@/actions/platform-data.actions'
import { BillingOverviewMetrics } from '@/types/platform.types'

export default function PlatformBillingPage() {
  const [data, setData] = useState<BillingOverviewMetrics | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const res = await getPlatformBillingReconciliationAction()
    if (res.success && res.data) {
      setData(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const filtered = data.items.filter((it) => {
    const matchesSearch =
      it.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (it.transaction_ref && it.transaction_ref.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || it.payment_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Financial Integrity &amp; Settlement
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-400" />
            Billing Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconcile expected subscription MRR against gateway settlements (bKash, SSLCommerz, Nagad, Bank Wire).
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Expected Revenue</span>
            <DollarSign className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            <CurrencyDisplay amount={data.expected_mrr} />
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">September 2026 Invoicing</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Collected / Settled</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            <CurrencyDisplay amount={data.collected_mrr} />
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
            {data.collection_efficiency_pct}% Collection Rate
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Outstanding / Due</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            <CurrencyDisplay amount={data.outstanding_mrr} />
          </div>
          <div className="text-[11px] text-amber-400 mt-0.5">{data.past_due_tenants_count} Tenants in Grace Period</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Failed Settlements</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{data.failed_payments_count}</div>
          <div className="text-[11px] text-red-400 mt-0.5">Gateway timeout or rejection</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Transactions' },
            { id: 'paid', label: 'Settled (Paid)' },
            { id: 'pending', label: 'Pending / Trial' },
            { id: 'failed', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search company or TRX..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white"
          />
        </div>
      </div>

      {/* Reconciliation Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tenant Company</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Expected (BDT)</th>
                <th className="py-3 px-4">Collected</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Gateway &amp; Reference</th>
                <th className="py-3 px-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filtered.map((it) => (
                <tr key={it.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/platform/companies/${it.company_id}`} className="font-bold text-white hover:text-indigo-400">
                      {it.company_name}
                    </Link>
                  </td>

                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                      {it.plan_code}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-white">
                    <CurrencyDisplay amount={it.expected_amount_bdt} />
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    <CurrencyDisplay amount={it.collected_amount_bdt} />
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        it.payment_status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : it.payment_status === 'pending'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {it.payment_status}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    {it.transaction_ref ? (
                      <div>
                        <div className="font-mono text-white text-[11px]">{it.transaction_ref}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{it.payment_gateway}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-400">
                    {it.due_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
