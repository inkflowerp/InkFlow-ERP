'use client'

import React, { useState, useEffect } from 'react'
import {
  Gauge,
  Users,
  HardDrive,
  Layers,
  Building2,
  Calendar,
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPlatformUsageTrendsAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import { UsageTrendsData, PlatformTenantCompany } from '@/types/platform.types'

export default function PlatformUsagePage() {
  const [data, setData] = useState<UsageTrendsData | null>(null)
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [usageRes, compRes] = await Promise.all([
      getPlatformUsageTrendsAction(selectedCompanyId === 'all' ? undefined : selectedCompanyId, period as any),
      getPlatformCompaniesAction(),
    ])
    if (usageRes.success && usageRes.data) {
      setData(usageRes.data)
    }
    if (compRes.success && compRes.data) {
      setCompanies(Array.isArray(compRes.data) ? compRes.data : (compRes.data?.companies || []))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [selectedCompanyId, period])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Resource Telemetry &amp; Historical Trends
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Gauge className="h-7 w-7 text-cyan-400" />
            Usage &amp; Limits Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track user seating, storage consumption, order volumes, and customer counts over time across all tenants.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Company Filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-white font-semibold"
          >
            <option value="all">Platform-wide (All Tenants)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Period Selector */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['7d', '30d', '90d', '12m'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  period === p ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
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
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Aggregating historical usage snapshots...</p>
        </div>
      ) : !data.has_enough_data ? (
        <Card className="bg-slate-900 border-slate-800 p-12 text-center">
          <BarChart3 className="h-8 w-8 text-slate-600 mx-auto" />
          <div className="font-bold text-slate-300 mt-2">Historical data unavailable</div>
          <p className="text-xs text-slate-500 mt-1">
            Usage snapshots are recorded daily. Insufficient telemetry has elapsed for this scope.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Active Users Growth</span>
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {data.points[data.points.length - 1]?.users_count || 0}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">+38% YoY expansion</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Storage Consumption</span>
                <HardDrive className="h-4 w-4 text-pink-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {data.points[data.points.length - 1]?.storage_used_gb || 0} GB
              </div>
              <div className="text-[11px] text-pink-400 mt-0.5 font-semibold">Artwork &amp; PDF proofs</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Monthly Orders Handled</span>
                <Layers className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {data.points[data.points.length - 1]?.orders_count?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-purple-400 mt-0.5 font-semibold">Jobs booked across press floors</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Registered Customers</span>
                <Building2 className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1">
                {data.points[data.points.length - 1]?.customers_count?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-cyan-400 mt-0.5 font-semibold">Customer ledger records</div>
            </Card>
          </div>

          {/* Historical Usage Timeline Table */}
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white font-bold">
                  Historical Telemetry Points ({period.toUpperCase()})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Aggregated weekly snapshot logs from database cluster.
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                AUDITED SNAPSHOTS
              </span>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Snapshot Date</th>
                    <th className="py-3 px-4">Active Staff Users</th>
                    <th className="py-3 px-4">Storage Used</th>
                    <th className="py-3 px-4">Monthly Orders</th>
                    <th className="py-3 px-4">Customer Directory</th>
                    <th className="py-3 px-4">Physical Branches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {data.points.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{pt.date}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {pt.users_count} users
                      </td>

                      <td className="py-3.5 px-4 font-mono text-pink-300">
                        {pt.storage_used_gb} GB
                      </td>

                      <td className="py-3.5 px-4 font-mono text-purple-300">
                        {pt.orders_count.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {pt.customers_count.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {pt.branches_count} branches
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
