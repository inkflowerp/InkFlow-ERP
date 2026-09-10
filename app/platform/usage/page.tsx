'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
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
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Download,
  Search,
  X,
  Filter,
  ArrowUpDown,
  Sparkles,
  ShieldAlert,
  Boxes,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPlatformUsageTrendsAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
  UsageTrendsData,
  PlatformTenantCompany,
  CompanyQuotaRankingItem,
} from '@/types/platform.types'

export default function PlatformUsagePage() {
  const [data, setData] = useState<UsageTrendsData | null>(null)
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all')
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [loading, setLoading] = useState(true)

  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState<'rankings' | 'timeline'>('rankings')
  const [search, setSearch] = useState('')
  const [healthFilter, setHealthFilter] = useState<'all' | 'critical' | 'warning' | 'normal' | 'custom'>('all')
  const [sortBy, setSortBy] = useState<'utilization' | 'users' | 'storage' | 'orders' | 'name'>('utilization')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Notification Toast
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [usageRes, compRes] = await Promise.all([
        getPlatformUsageTrendsAction(selectedCompanyId === 'all' ? undefined : selectedCompanyId, period),
        getPlatformCompaniesAction({ pageSize: 100 }),
      ])
      if (usageRes.success && usageRes.data) {
        setData(usageRes.data)
      } else {
        showToast(usageRes.error || 'Failed to load usage telemetry', 'error')
      }
      if (compRes.success && compRes.data) {
        setCompanies(Array.isArray(compRes.data) ? compRes.data : compRes.data?.companies || [])
      }
    } catch (err: any) {
      showToast(err?.message || 'Error communicating with server', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCompanyId, period])

  // Filtered & Sorted Tenant Quota Rankings
  const filteredRankings = useMemo(() => {
    if (!data?.rankings) return []

    let list = data.rankings.filter((item) => {
      // Search filter
      const matchesSearch =
        search === '' ||
        item.company_name.toLowerCase().includes(search.toLowerCase()) ||
        item.company_slug.toLowerCase().includes(search.toLowerCase()) ||
        item.plan_code.toLowerCase().includes(search.toLowerCase()) ||
        (item.owner_email && item.owner_email.toLowerCase().includes(search.toLowerCase()))

      // Health filter
      let matchesHealth = true
      if (healthFilter === 'critical') matchesHealth = item.quota_status === 'critical' || item.quota_status === 'exceeded'
      else if (healthFilter === 'warning') matchesHealth = item.quota_status === 'warning'
      else if (healthFilter === 'normal') matchesHealth = item.quota_status === 'normal'
      else if (healthFilter === 'custom') matchesHealth = item.has_custom_limits

      return matchesSearch && matchesHealth
    })

    // Sort
    list.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'utilization') comparison = a.max_utilization_pct - b.max_utilization_pct
      else if (sortBy === 'users') comparison = a.users_count - b.users_count
      else if (sortBy === 'storage') comparison = a.storage_used_gb - b.storage_used_gb
      else if (sortBy === 'orders') comparison = a.orders_this_month - b.orders_this_month
      else if (sortBy === 'name') comparison = a.company_name.localeCompare(b.company_name)

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return list
  }, [data, search, healthFilter, sortBy, sortOrder])

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.rankings || data.rankings.length === 0) {
      showToast('No usage ranking data to export', 'error')
      return
    }

    const headers = [
      'Company Name',
      'Slug',
      'Plan Code',
      'Users Count',
      'Users Limit',
      'User Util %',
      'Storage GB',
      'Storage Limit GB',
      'Storage Util %',
      'Monthly Orders',
      'Orders Limit',
      'Orders Util %',
      'Branches Count',
      'Branches Limit',
      'Customers Count',
      'Max Util %',
      'Quota Status',
      'Has Custom Limits',
    ]

    const rows = data.rankings.map((r) => [
      `"${r.company_name.replace(/"/g, '""')}"`,
      `"${r.company_slug}"`,
      `"${r.plan_code}"`,
      r.users_count,
      r.users_limit,
      r.user_utilization_pct,
      r.storage_used_gb,
      r.storage_limit_gb,
      r.storage_utilization_pct,
      r.orders_this_month,
      r.orders_limit,
      r.order_utilization_pct,
      r.branches_count,
      r.branches_limit,
      r.customers_count,
      r.max_utilization_pct,
      `"${r.quota_status.toUpperCase()}"`,
      r.has_custom_limits ? 'YES' : 'NO',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `printerp_usage_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Exported usage & quota report to CSV.')
  }

  const summary = data?.summary

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Resource Telemetry &amp; Quota Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Gauge className="h-7 w-7 text-cyan-400" />
            Usage &amp; Limits Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor real-time user seating, cloud storage allocation, monthly order throughput, and capacity alerts across all tenant presses.
          </p>
        </div>

        {/* Top Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent border-none text-xs text-white font-bold focus:outline-hidden cursor-pointer max-w-[180px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">Platform-wide (All Tenants)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['7d', '30d', '90d', '12m'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  period === p ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in border ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200 shadow-lg'
              : 'bg-red-950/90 border-red-700 text-red-200 shadow-lg'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Executive Capacity & Usage Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Staff Seating (Users) */}
          <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Staff Seating Utilization</span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              <span>{summary.total_users}</span>
              <span className="text-xs font-normal text-slate-400">/ {summary.users_capacity} seats</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  summary.users_utilization_pct >= 90
                    ? 'bg-red-500'
                    : summary.users_utilization_pct >= 75
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(summary.users_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-indigo-300 mt-1.5 flex items-center justify-between">
              <span>{summary.users_utilization_pct}% capacity assigned</span>
              <span className="text-slate-400 font-mono text-[10px]">{summary.total_branches} Branches</span>
            </div>
          </Card>

          {/* Storage Consumed */}
          <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Cloud Storage Allocated</span>
              <HardDrive className="h-4 w-4 text-pink-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              <span>{summary.total_storage_gb} GB</span>
              <span className="text-xs font-normal text-slate-400">/ {summary.storage_capacity_gb} GB</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  summary.storage_utilization_pct >= 90
                    ? 'bg-red-500'
                    : summary.storage_utilization_pct >= 75
                    ? 'bg-amber-500'
                    : 'bg-pink-500'
                }`}
                style={{ width: `${Math.min(summary.storage_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-pink-300 mt-1.5 flex items-center justify-between">
              <span>{summary.storage_utilization_pct}% disk used</span>
              <span className="text-slate-400 font-mono text-[10px]">PDF Proofs &amp; Artwork</span>
            </div>
          </Card>

          {/* Monthly Orders Throughput */}
          <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Orders Handled This Month</span>
              <Layers className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              <span>{summary.total_orders_this_month.toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-400">/ {summary.orders_capacity.toLocaleString()} cap</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  summary.orders_utilization_pct >= 90
                    ? 'bg-red-500'
                    : summary.orders_utilization_pct >= 75
                    ? 'bg-amber-500'
                    : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(summary.orders_utilization_pct, 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-purple-300 mt-1.5 flex items-center justify-between">
              <span>{summary.orders_utilization_pct}% monthly volume</span>
              <span className="text-slate-400 font-mono text-[10px]">{summary.total_customers} Customers</span>
            </div>
          </Card>

          {/* Quota Health Monitor */}
          <Card className="bg-slate-900 border-slate-800 p-4 relative overflow-hidden">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Tenant Quota Health</span>
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              <span className={summary.critical_tenants_count > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {summary.critical_tenants_count + summary.high_utilization_tenants_count}
              </span>
              <span className="text-xs font-normal text-slate-400">tenants need attention</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-3 flex items-center gap-2">
              <span className="text-red-400 font-bold">{summary.critical_tenants_count} Critical (&ge;90%)</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{summary.high_utilization_tenants_count} Warning (&ge;80%)</span>
            </div>
          </Card>
        </div>
      )}

      {/* Main Tab Bar & Search / Health Filters */}
      <div className="space-y-3 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('rankings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rankings'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>Tenant Quota Rankings ({data?.rankings?.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Timeline Snapshots ({period.toUpperCase()})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search by company name, slug, plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Health Status Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] mr-1">Quota Health:</span>
            {[
              { id: 'all', label: 'All Tenants' },
              { id: 'critical', label: 'Critical / Exceeded (≥90%)', count: summary?.critical_tenants_count },
              { id: 'warning', label: 'Warning (≥80%)', count: summary?.high_utilization_tenants_count },
              { id: 'normal', label: 'Normal (<80%)', count: summary?.healthy_tenants_count },
              { id: 'custom', label: 'Custom Overrides' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setHealthFilter(chip.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  healthFilter === chip.id
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{chip.label}</span>
                {chip.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      healthFilter === chip.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {chip.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs"
            >
              <option value="utilization">Highest Utilization %</option>
              <option value="users">Staff Users Count</option>
              <option value="storage">Storage Used (GB)</option>
              <option value="orders">Monthly Orders</option>
              <option value="name">Company Name (A-Z)</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title={`Toggle sort order (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TENANT QUOTA RANKINGS & CAPACITY MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'rankings' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tenant Company</th>
                  <th className="py-3 px-4">Plan &amp; Quota Tier</th>
                  <th className="py-3 px-4">Staff Seats</th>
                  <th className="py-3 px-4">Cloud Storage</th>
                  <th className="py-3 px-4">Monthly Orders</th>
                  <th className="py-3 px-4">Quota Health</th>
                  <th className="py-3 px-4 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                      <span>Aggregating real-time resource telemetry across tenants...</span>
                    </td>
                  </tr>
                ) : filteredRankings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Gauge className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                      <p className="font-semibold text-slate-400">No tenant companies match your filter.</p>
                      <p className="text-xs mt-1">Try switching health filters or search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRankings.map((r) => {
                    return (
                      <tr key={r.company_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Company Info */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/platform/companies/${r.company_id}`}
                            className="font-bold text-white hover:text-cyan-400 text-sm flex items-center gap-1.5"
                          >
                            <span>{r.company_name}</span>
                            <ExternalLink className="h-3 w-3 text-slate-500 opacity-60 hover:opacity-100" />
                          </Link>
                          <div className="text-[11px] font-mono text-cyan-400">
                            {r.company_slug}.printerp.com.bd
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {r.owner_phone} • {r.branches_count} of {r.branches_limit} branches
                          </div>
                        </td>

                        {/* Plan Tier */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold border ${
                                r.plan_code === 'enterprise'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : r.plan_code === 'business'
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  : r.plan_code === 'starter'
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              }`}
                            >
                              {r.plan_name}
                            </span>
                            {r.has_custom_limits && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Overrides
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {r.customers_count} registered customers
                          </div>
                        </td>

                        {/* Users Gauge */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span><strong className="text-white">{r.users_count}</strong>/{r.users_limit}</span>
                              <span className={`text-[10px] font-mono ${r.user_utilization_pct >= 90 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                {r.user_utilization_pct}%
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.user_utilization_pct >= 90
                                    ? 'bg-red-500'
                                    : r.user_utilization_pct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(r.user_utilization_pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Storage Gauge */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span><strong className="text-white">{r.storage_used_gb}</strong>/{r.storage_limit_gb} GB</span>
                              <span className={`text-[10px] font-mono ${r.storage_utilization_pct >= 90 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                {r.storage_utilization_pct}%
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.storage_utilization_pct >= 90
                                    ? 'bg-red-500'
                                    : r.storage_utilization_pct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-pink-500'
                                }`}
                                style={{ width: `${Math.min(r.storage_utilization_pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Monthly Orders Gauge */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span><strong className="text-white">{r.orders_this_month}</strong>/{r.orders_limit}</span>
                              <span className={`text-[10px] font-mono ${r.order_utilization_pct >= 90 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                {r.order_utilization_pct}%
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.order_utilization_pct >= 90
                                    ? 'bg-red-500'
                                    : r.order_utilization_pct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.min(r.order_utilization_pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Quota Health Status */}
                        <td className="py-3 px-4">
                          {r.quota_status === 'exceeded' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-red-950/90 text-red-200 border border-red-700 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                              <span>{r.max_utilization_pct}% EXCEEDED</span>
                            </span>
                          ) : r.quota_status === 'critical' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-800/80 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                              <span>{r.max_utilization_pct}% CRITICAL</span>
                            </span>
                          ) : r.quota_status === 'warning' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/80 shadow-sm">
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              <span>{r.max_utilization_pct}% WARNING</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>{r.max_utilization_pct}% NORMAL</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/platform/subscriptions`}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-700 shadow-sm transition-colors cursor-pointer"
                            title="Adjust plan limits or custom overrides on Subscriptions page"
                          >
                            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Adjust Quotas</span>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORICAL USAGE TIMELINE TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-white font-bold">
                Historical Telemetry Points ({period.toUpperCase()})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Audited daily/weekly snapshot logs from PostgreSQL cluster database.
              </CardDescription>
            </div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              AUDITED SNAPSHOTS
            </span>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Snapshot Date</th>
                  <th className="py-3 px-4">Active Staff Seats</th>
                  <th className="py-3 px-4">Storage Used</th>
                  <th className="py-3 px-4">Monthly Orders Handled</th>
                  <th className="py-3 px-4">Customer Directory Base</th>
                  <th className="py-3 px-4">Active Branches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {data?.points.map((pt, i) => (
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
                      {pt.orders_count.toLocaleString()} orders
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {pt.customers_count.toLocaleString()} customers
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
      )}
    </div>
  )
}
