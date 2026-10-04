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
import { useI18n } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { getPlatformUsageTrendsAction, getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import {
 UsageTrendsData,
 PlatformTenantCompany,
 CompanyQuotaRankingItem,
} from '@/types/platform.types'

export default function PlatformUsagePage() {
  const { tBilingual } = useI18n()
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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-primary/10 animate-pulse" />
 Resource Telemetry &amp; Quota Intelligence
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Gauge className="h-7 w-7 text-primary" />
 Usage &amp; Limits Telemetry
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Monitor real-time user seating, cloud storage allocation, monthly order throughput, and capacity alerts across all tenant presses.
 </p>
 </div>

 {/* Top Header Controls */}
 <div className="flex flex-wrap items-center gap-2.5">
 {/* Company Filter */}
 <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1 text-xs">
 <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
 <select
 value={selectedCompanyId}
 onChange={(e) => setSelectedCompanyId(e.target.value)}
 className="bg-transparent border-none text-xs text-foreground font-bold focus:outline-hidden cursor-pointer max-w-44 truncate"
 >
 <option value="all" className="bg-card text-foreground">{tBilingual('All Clients', 'সব ক্লায়েন্ট')}</option>
 {companies.map((c) => (
 <option key={c.id} value={c.id} className="bg-card text-foreground">
 {c.name}
 </option>
 ))}
 </select>
 </div>

 {/* Period Selector */}
 <div className="flex items-center rounded-xl bg-card border border-border p-0.5 text-xs">
 {(['7d', '30d', '90d', '12m'] as const).map((p) => (
 <button
 key={p}
 type="button"
 onClick={() => setPeriod(p)}
 className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
 period === p ? 'bg-primary text-foreground shadow-xs' : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 {p}
 </button>
 ))}
 </div>

 <button
 type="button"
 onClick={handleExportCSV}
 className="px-3 py-2 rounded-xl bg-card hover:bg-muted text-foreground hover:text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 h-9 transition-colors cursor-pointer"
 >
 <Download className="h-3.5 w-3.5 text-primary" />
 <span>Export CSV</span>
 </button>

 <button
 type="button"
 onClick={loadData}
 disabled={loading}
 className="h-9 w-9 p-0 rounded-xl bg-card hover:bg-muted text-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
 title="Refresh"
 aria-label="Refresh"
 >
 <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {/* Toast Notification */}
 {notification && (
 <div
 className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in border ${
 notification.type === 'success'
 ? 'bg-success-surface border-success/30 text-success shadow-xs'
 : 'bg-destructive/10 border-destructive/30 text-destructive shadow-xs'
 }`}
 >
 <div className="flex items-center gap-2">
 {notification.type === 'success' ? (
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 ) : (
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 )}
 <span>{notification.text}</span>
 </div>
 <button
 onClick={() => setNotification(null)}
 className="text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 )}

 {/* Executive Capacity & Usage Metric Cards */}
 {summary && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Staff Seating (Users) */}
 <Card className="bg-card border-border p-4 relative overflow-hidden">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Staff Seating Utilization</span>
 <Users className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-2">
 <span>{summary.total_users}</span>
 <span className="text-xs font-normal text-muted-foreground">/ {summary.users_capacity} seats</span>
 </div>
 {/* Progress bar */}
 <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
 <div
 className={`h-full rounded-full ${
 summary.users_utilization_pct >= 90
 ? 'bg-destructive'
 : summary.users_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(summary.users_utilization_pct, 100)}%` }}
 />
 </div>
 <div className="text-xs text-primary mt-1.5 flex items-center justify-between">
 <span>{summary.users_utilization_pct}% capacity assigned</span>
 <span className="text-muted-foreground tabular-nums text-xs">{summary.total_branches} Branches</span>
 </div>
 </Card>

 {/* Storage Consumed */}
 <Card className="bg-card border-border p-4 relative overflow-hidden">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Cloud Storage Allocated</span>
 <HardDrive className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-2">
 <span>{summary.total_storage_gb} GB</span>
 <span className="text-xs font-normal text-muted-foreground">/ {summary.storage_capacity_gb} GB</span>
 </div>
 {/* Progress bar */}
 <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
 <div
 className={`h-full rounded-full ${
 summary.storage_utilization_pct >= 90
 ? 'bg-destructive'
 : summary.storage_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(summary.storage_utilization_pct, 100)}%` }}
 />
 </div>
 <div className="text-xs text-primary mt-1.5 flex items-center justify-between">
 <span>{summary.storage_utilization_pct}% disk used</span>
 <span className="text-muted-foreground tabular-nums text-xs">PDF Proofs &amp; Artwork</span>
 </div>
 </Card>

 {/* Monthly Orders Throughput */}
 <Card className="bg-card border-border p-4 relative overflow-hidden">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Orders Handled This Month</span>
 <Layers className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-2">
 <span>{summary.total_orders_this_month.toLocaleString()}</span>
 <span className="text-xs font-normal text-muted-foreground">/ {summary.orders_capacity.toLocaleString()} cap</span>
 </div>
 {/* Progress bar */}
 <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
 <div
 className={`h-full rounded-full ${
 summary.orders_utilization_pct >= 90
 ? 'bg-destructive'
 : summary.orders_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(summary.orders_utilization_pct, 100)}%` }}
 />
 </div>
 <div className="text-xs text-primary mt-1.5 flex items-center justify-between">
 <span>{summary.orders_utilization_pct}% monthly volume</span>
 <span className="text-muted-foreground tabular-nums text-xs">{summary.total_customers} Customers</span>
 </div>
 </Card>

 {/* Quota Health Monitor */}
 <Card className="bg-card border-border p-4 relative overflow-hidden">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Client Limits', 'ক্লায়েন্ট লিমিট')}</span>
 <ShieldAlert className="h-4 w-4 text-warning" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1 flex items-baseline gap-2">
 <span className={summary.critical_tenants_count > 0 ? 'text-destructive' : 'text-success'}>
 {summary.critical_tenants_count + summary.high_utilization_tenants_count}
 </span>
 <span className="text-xs font-normal text-muted-foreground">{tBilingual('clients near limit', 'জন ক্লায়েন্টের লিমিট শেষ প্রায়')}</span>
 </div>
 <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
 <span className="text-destructive font-bold">{summary.critical_tenants_count} Critical (&ge;90%)</span>
 <span>•</span>
 <span className="text-warning font-bold">{summary.high_utilization_tenants_count} Warning (&ge;80%)</span>
 </div>
 </Card>
 </div>
 )}

 {/* Main Tab Bar & Search / Health Filters */}
 <div className="space-y-3 bg-card p-3.5 rounded-2xl border border-border">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
 {/* Main Tabs */}
 <div className="flex items-center p-1 bg-card border border-border rounded-xl shrink-0">
 <button
 type="button"
 onClick={() => setActiveTab('rankings')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab === 'rankings'
 ? 'bg-primary text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 <Gauge className="h-3.5 w-3.5" />
 <span>{tBilingual('Clients by Usage', 'ব্যবহারের তালিকা')} ({data?.rankings?.length || 0})</span>
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('timeline')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab === 'timeline'
 ? 'bg-primary text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 <Calendar className="h-3.5 w-3.5" />
 <span>Timeline Snapshots ({period.toUpperCase()})</span>
 </button>
 </div>

 {/* Search Box */}
 <div className="relative w-full lg:w-80">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 placeholder="Search by company name, slug, plan..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-8 h-8 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/20"
 />
 {search && (
 <button
 onClick={() => setSearch('')}
 className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Secondary Filter Row */}
 <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border text-xs">
 {/* Health Status Chips */}
 <div className="flex flex-wrap items-center gap-1.5">
 <span className="text-muted-foreground text-xs mr-1">{tBilingual('Status:', 'অবস্থা:')}</span>
 {[
 { id: 'all', label: tBilingual('All Clients', 'সব ক্লায়েন্ট') },
 { id: 'critical', label: tBilingual('Urgent (≥90%)', 'জরুরি (≥৯০%)'), count: summary?.critical_tenants_count },
 { id: 'warning', label: tBilingual('Warning (≥80%)', 'সতর্কতা (≥৮০%)'), count: summary?.high_utilization_tenants_count },
 { id: 'normal', label: tBilingual('Normal (<80%)', 'স্বাভাবিক (<৮০%)'), count: summary?.healthy_tenants_count },
 { id: 'custom', label: 'Custom Overrides' },
 ].map((chip) => (
 <button
 key={chip.id}
 type="button"
 onClick={() => setHealthFilter(chip.id as any)}
 className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
 healthFilter === chip.id
 ? 'bg-primary text-foreground shadow-xs'
 : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
 }`}
 >
 <span>{chip.label}</span>
 {chip.count !== undefined && (
 <span
 className={`text-xs px-1.5 py-0.2 rounded-full tabular-nums ${
 healthFilter === chip.id ? 'bg-card/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
 }`}
 >
 {chip.count}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* Sort Control */}
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <span>Sort by:</span>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as any)}
 className="bg-card border border-border rounded-lg px-2.5 py-1 text-foreground text-xs"
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
 className="h-7 w-7 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
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
 <Card className="bg-card border-border overflow-hidden shadow-xs">
 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold uppercase text-xs border-b border-border">
 <tr>
 <th className="py-3 px-4">{tBilingual('Client', 'ক্লায়েন্ট')}</th>
 <th className="py-3 px-4">{tBilingual('Plan', 'প্ল্যান')}</th>
 <th className="py-3 px-4">Staff Seats</th>
 <th className="py-3 px-4">Cloud Storage</th>
 <th className="py-3 px-4">Monthly Orders</th>
 <th className="py-3 px-4">{tBilingual('Status', 'অবস্থা')}</th>
 <th className="py-3 px-4 text-right">Governance Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {loading ? (
 <tr>
 <td colSpan={7} className="py-12 text-center text-muted-foreground">
 <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
 <span>Aggregating real-time resource telemetry across tenants...</span>
 </td>
 </tr>
 ) : filteredRankings.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-12 text-center text-muted-foreground">
 <Gauge className="h-8 w-8 mx-auto mb-2 text-foreground" />
 <p className="font-semibold text-muted-foreground">No tenant companies match your filter.</p>
 <p className="text-xs mt-1">Try switching health filters or search criteria.</p>
 </td>
 </tr>
 ) : (
 filteredRankings.map((r) => {
 return (
 <tr key={r.company_id} className="hover:bg-muted transition-colors">
 {/* Company Info */}
 <td className="py-3 px-4">
 <Link
 href={`/platform/companies/${r.company_id}`}
 className="font-bold text-foreground hover:text-primary text-sm flex items-center gap-1.5"
 >
 <span>{r.company_name}</span>
 <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60 hover:opacity-100" />
 </Link>
 <div className="text-xs tabular-nums text-primary">
 {r.company_slug}.printerp.com.bd
 </div>
 <div className="text-xs text-muted-foreground mt-0.5">
 {r.owner_phone} • {r.branches_count} of {r.branches_limit} branches
 </div>
 </td>

 {/* Plan Tier */}
 <td className="py-3 px-4">
 <div className="flex flex-wrap items-center gap-1.5">
 <span
 className={`capitalize px-2 py-0.5 rounded text-xs font-bold border ${
 r.plan_code === 'enterprise'
 ? 'bg-success/10 text-success border-success/30'
 : r.plan_code === 'business'
 ? 'bg-primary/10 text-primary border-primary/20'
 : r.plan_code === 'starter'
 ? 'bg-primary/10 text-primary border-primary/20'
 : 'bg-primary/10 text-primary border-primary/20'
 }`}
 >
 {r.plan_name}
 </span>
 {r.has_custom_limits && (
 <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-warning/10 text-warning border border-warning/30">
 Overrides
 </span>
 )}
 </div>
 <div className="text-xs text-muted-foreground mt-1">
 {r.customers_count} registered customers
 </div>
 </td>

 {/* Users Gauge */}
 <td className="py-3 px-4">
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span><strong className="text-foreground">{r.users_count}</strong>/{r.users_limit}</span>
 <span className={`text-xs tabular-nums ${r.user_utilization_pct >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
 {r.user_utilization_pct}%
 </span>
 </div>
 <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${
 r.user_utilization_pct >= 90
 ? 'bg-destructive'
 : r.user_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(r.user_utilization_pct, 100)}%` }}
 />
 </div>
 </div>
 </td>

 {/* Storage Gauge */}
 <td className="py-3 px-4">
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span><strong className="text-foreground">{r.storage_used_gb}</strong>/{r.storage_limit_gb} GB</span>
 <span className={`text-xs tabular-nums ${r.storage_utilization_pct >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
 {r.storage_utilization_pct}%
 </span>
 </div>
 <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${
 r.storage_utilization_pct >= 90
 ? 'bg-destructive'
 : r.storage_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(r.storage_utilization_pct, 100)}%` }}
 />
 </div>
 </div>
 </td>

 {/* Monthly Orders Gauge */}
 <td className="py-3 px-4">
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span><strong className="text-foreground">{r.orders_this_month}</strong>/{r.orders_limit}</span>
 <span className={`text-xs tabular-nums ${r.order_utilization_pct >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
 {r.order_utilization_pct}%
 </span>
 </div>
 <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${
 r.order_utilization_pct >= 90
 ? 'bg-destructive'
 : r.order_utilization_pct >= 75
 ? 'bg-warning'
 : 'bg-primary'
 }`}
 style={{ width: `${Math.min(r.order_utilization_pct, 100)}%` }}
 />
 </div>
 </div>
 </td>

 {/* Quota Health Status */}
 <td className="py-3 px-4">
 {r.quota_status === 'exceeded' ? (
 <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 shadow-sm">
 <AlertTriangle className="h-3 w-3 text-destructive" />
 <span>{r.max_utilization_pct}% EXCEEDED</span>
 </span>
 ) : r.quota_status === 'critical' ? (
 <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 shadow-sm">
 <AlertTriangle className="h-3 w-3 text-destructive" />
 <span>{r.max_utilization_pct}% CRITICAL</span>
 </span>
 ) : r.quota_status === 'warning' ? (
 <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-warning-surface text-warning border border-warning/30 shadow-sm">
 <AlertTriangle className="h-3 w-3 text-warning" />
 <span>{r.max_utilization_pct}% WARNING</span>
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-muted text-success border border-border">
 <CheckCircle2 className="h-3 w-3 text-success" />
 <span>{r.max_utilization_pct}% NORMAL</span>
 </span>
 )}
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <Link
 href={`/platform/subscriptions`}
 className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted text-foreground hover:text-foreground border border-border shadow-sm transition-colors cursor-pointer"
 title="Adjust plan limits or custom overrides on Subscriptions page"
 >
 <Sliders className="h-3.5 w-3.5 text-primary" />
 <span>{tBilingual('Change Limits', 'লিমিট বদলান')}</span>
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
 <Card className="bg-card border-border overflow-hidden shadow-xs">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base text-foreground font-bold">
 Historical Telemetry Points ({period.toUpperCase()})
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Audited daily/weekly snapshot logs from PostgreSQL cluster database.
 </CardDescription>
 </div>
 <span className="text-xs tabular-nums uppercase px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
 AUDITED SNAPSHOTS
 </span>
 </CardHeader>

 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold uppercase text-xs border-b border-border">
 <tr>
 <th className="py-3 px-4">Snapshot Date</th>
 <th className="py-3 px-4">Active Staff Seats</th>
 <th className="py-3 px-4">Storage Used</th>
 <th className="py-3 px-4">Monthly Orders Handled</th>
 <th className="py-3 px-4">Customer Directory Base</th>
 <th className="py-3 px-4">Active Branches</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {data?.points.map((pt, i) => (
 <tr key={i} className="hover:bg-muted transition-colors">
 <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
 <Calendar className="h-3.5 w-3.5 text-primary" />
 <span>{pt.date}</span>
 </td>

 <td className="py-3.5 px-4 tabular-nums font-bold text-primary">
 {pt.users_count} users
 </td>

 <td className="py-3.5 px-4 tabular-nums text-primary">
 {pt.storage_used_gb} GB
 </td>

 <td className="py-3.5 px-4 tabular-nums text-primary">
 {pt.orders_count.toLocaleString()} orders
 </td>

 <td className="py-3.5 px-4 tabular-nums text-muted-foreground">
 {pt.customers_count.toLocaleString()} customers
 </td>

 <td className="py-3.5 px-4 tabular-nums text-muted-foreground">
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
