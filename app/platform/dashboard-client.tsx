'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
 Activity,
 Building2,
 Users,
 CreditCard,
 Layers,
 ArrowUpRight,
 TrendingUp,
 AlertTriangle,
 ShieldCheck,
 CheckCircle2,
 ExternalLink,
 Sliders,
 Flag,
 HeartPulse,
 FileClock,
 Sparkles,
 RefreshCw,
 Clock,
 HardDrive,
 Check,
 AlertOctagon,
 ArrowRight,
 ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/formatters'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformDashboardOverviewAction } from '@/actions/platform-data.actions'
import { PlatformDashboardMetrics, NeedsAttentionItem } from '@/types/platform.types'
import { useI18n } from '@/i18n/context'

export default function PlatformDashboardPage() {
  const { tBilingual } = useI18n()
  const [data, setData] = useState<(PlatformDashboardMetrics & { needs_attention: NeedsAttentionItem[] }) | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d'>('30d')

 const loadData = async () => {
 setLoading(true)
 setError(null)
 try {
 const res = await getPlatformDashboardOverviewAction()
 if (res.success && res.data) {
 setData(res.data)
 } else {
 setError(res.error || 'Failed to load platform dashboard metrics.')
 }
 } catch (err: any) {
 setError(err?.message || 'A network or system error occurred while fetching platform metrics.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 loadData()
 }, [])

 if (error && !data) {
 return (
 <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center my-8 shadow-xs">
 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/30 mb-4 shadow-xs">
 <AlertOctagon className="h-7 w-7" />
 </div>
 <h2 className="text-lg font-bold text-foreground mb-1">
   {tBilingual('Could Not Load Data', 'তথ্য লোড করা যায়নি')}
 </h2>
 <p className="max-w-md text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
 {error}
 </p>
 <div className="flex flex-wrap items-center justify-center gap-3">
 <Button
 onClick={loadData}
 className="h-9 px-4 gap-2 bg-primary hover:bg-primary text-primary-foreground font-semibold cursor-pointer text-xs min-h-9"
 >
 <RefreshCw className="h-3.5 w-3.5" />
 <span>{tBilingual('Retry', 'আবার চেষ্টা করুন')}</span>
 </Button>
 <Button
 asChild
 variant="outline"
 className="h-9 px-4 border-border bg-card text-foreground hover:bg-muted text-xs min-h-9"
 >
 <Link href="/platform/tenants">
 <Building2 className="h-3.5 w-3.5 mr-1.5" />
 <span>{tBilingual('Clients', 'ক্লায়েন্ট')}</span>
 </Link>
 </Button>
 </div>
 </div>
 )
 }

 if (loading || !data) {
 return (
 <div className="space-y-6 animate-pulse">
 <div className="h-10 w-72 bg-muted rounded-xl" />
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
 ))}
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
 {[1, 2, 3, 4, 5, 6].map((i) => (
 <div key={i} className="h-24 bg-card border border-border rounded-2xl" />
 ))}
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-8">
 {/* 5.1 HEADER */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-6">
 <div>
 <div className="flex items-center gap-2 text-xs sm:text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
 {tBilingual('Control Center', 'কন্ট্রোল সেন্টার')}
 </div>
 <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5 sm:gap-3">
 <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
 <span>{tBilingual('Overview', 'সারসংক্ষেপ')}</span>
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">
 {tBilingual('Clients, plans, and system status.', 'ক্লায়েন্ট, প্ল্যান ও সিস্টেম অবস্থা।')}
 </p>
 </div>

 <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full md:w-auto">
 {/* Date Range Selector */}
 <div className="flex items-center rounded-xl bg-card border border-border p-0.5 text-xs shrink-0">
 {[
   { id: 'today', en: 'Today', bn: 'আজ' },
   { id: '7d', en: '7 Days', bn: '৭ দিন' },
   { id: '30d', en: '30 Days', bn: '৩০ দিন' },
   { id: '90d', en: '90 Days', bn: '৯০ দিন' },
 ].map((r) => (
 <button
 key={r.id}
 type="button"
 onClick={() => setDateRange(r.id as any)}
 className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition-colors cursor-pointer text-xs sm:text-xs ${
 dateRange === r.id ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 {tBilingual(r.en, r.bn)}
 </button>
 ))}
 </div>

 <Button
 size="sm"
 variant="outline"
 onClick={loadData}
 className="border-border bg-card text-foreground hover:bg-muted hover:text-foreground text-xs h-8 shrink-0 min-h-9"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 {tBilingual('Refresh', 'রিফ্রেশ')}
 </Button>

 <Link
 href="/platform/tenants"
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all shrink-0 min-h-9"
 >
 <Building2 className="h-3.5 w-3.5" />
 <span>{tBilingual('Clients', 'ক্লায়েন্ট')}</span>
 </Link>
 </div>
 </div>

 {/* 5.1b ZERO-CLIENT ONBOARDING GUIDANCE BANNER */}
 {data.total_companies === 0 && (
 <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 sm:p-6 shadow-xs">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1.5">
 <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
 <Sparkles className="h-3 w-3 text-warning" />
 {tBilingual('Ready to Start', 'শুরু করতে প্রস্তুত')}
 </div>
 <h3 className="text-base sm:text-lg font-bold text-foreground">
 {tBilingual('No Clients Yet', 'এখনও কোনো ক্লায়েন্ট নেই')}
 </h3>
 <p className="text-xs text-foreground max-w-xl leading-relaxed">
 {tBilingual('Add your first client to start using the system.', 'সিস্টেম শুরু করতে প্রথম ক্লায়েন্ট যুক্ত করুন।')}
 </p>
 </div>
 <div className="flex items-center gap-2.5 shrink-0">
 <Link
 href="/platform/tenants"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer min-h-9"
 >
 <Building2 className="h-4 w-4" />
 <span>{tBilingual('Add Client', 'ক্লায়েন্ট যোগ করুন')}</span>
 </Link>
 </div>
 </div>
 </div>
 )}

 {/* 5.2 NEEDS ATTENTION */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
 {tBilingual('Needs Attention', 'জরুরি নজর')}
 </h2>
 {data.needs_attention.length > 0 ? (
 <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
 {data.needs_attention.length} {tBilingual('Urgent', 'জরুরি')}
 </span>
 ) : (
 <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success-surface text-success border border-success/30">
 0 {tBilingual('Issues', 'সমস্যা')}
 </span>
 )}
 </div>
 <span className="text-xs text-muted-foreground font-medium">
 {tBilingual('Most urgent first', 'জরুরি বিষয় আগে')}
 </span>
 </div>

 {data.needs_attention.length === 0 ? (
 <div className="p-4 rounded-2xl bg-success-surface border border-success/30 text-success flex items-center gap-3 text-xs">
 <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
 <div>
 <div className="font-bold">{tBilingual('Everything is normal.', 'সব কিছু ঠিক চলছে।')}</div>
 <div className="text-success/80 text-xs">{tBilingual('All clients and services are running well.', 'সব ক্লায়েন্ট ও সেবা ভালো চলছে।')}</div>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
 {data.needs_attention.map((item) => {
 const isCrit = item.severity === 'critical'
 const isWarn = item.severity === 'warning'

 return (
 <div
 key={item.id}
 className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
 isCrit
 ? 'bg-destructive/10 border-destructive/30 shadow-xs'
 : isWarn
 ? 'bg-warning-surface border-warning/30'
 : 'bg-primary/10 border-primary/20'
 }`}
 >
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <span
 className={`text-xs tabular-nums font-bold uppercase px-2 py-0.5 rounded-md border ${
 isCrit
 ? 'bg-destructive/10 text-destructive border-destructive/30'
 : isWarn
 ? 'bg-warning-surface text-warning border-warning/30'
 : 'bg-primary/20 text-primary border-primary/20'
 }`}
 >
 {item.severity === 'critical'
 ? tBilingual('Urgent', 'জরুরি')
 : item.severity === 'warning'
 ? tBilingual('Warning', 'সতর্কতা')
 : tBilingual('Notice', 'নোটিশ')}
 </span>
 <span className="text-xs text-muted-foreground tabular-nums">{item.timestamp}</span>
 </div>

 <div className="font-bold text-sm text-foreground">{item.title}</div>
 {(item.tenant_name || item.system_name) && (
 <div className="text-xs font-semibold text-muted-foreground">
 {item.tenant_name ? `${tBilingual('Client', 'ক্লায়েন্ট')}: ${item.tenant_name}` : `${tBilingual('System', 'সিস্টেম')}: ${item.system_name}`}
 </div>
 )}
 <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
 </div>

 <Link
 href={item.action_href}
 className={`inline-flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
 isCrit
 ? 'bg-destructive hover:bg-destructive text-foreground shadow-xs'
 : isWarn
 ? 'bg-warning hover:bg-warning text-destructive-foreground shadow-xs'
 : 'bg-primary hover:bg-primary text-primary-foreground'
 }`}
 >
 <span>{item.recommended_action}</span>
 <ArrowRight className="h-3.5 w-3.5 ml-1" />
 </Link>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* 5.3 AUTHORITATIVE BUSINESS KPIS (7 REQUIRED SAAS METRICS) */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
 {tBilingual('Executive KPI Metrics', 'কার্যনির্বাহী কেপিআই মেট্রিক্স')}
 </h2>
 <span className="text-xs text-muted-foreground font-mono">
 {tBilingual('Click any KPI to filter list', 'তালিকা ফিল্টার করতে ক্লিক করুন')}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
 {/* 1. MRR */}
 <Link
 href="/platform/subscriptions?status=active"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('MRR', 'মাসিক আয়')}</span>
 <TrendingUp className="h-3.5 w-3.5 text-success group-hover:scale-110 transition-transform" />
 </div>
 <div className="text-xl font-black text-foreground">
 <CurrencyDisplay amount={data.revenue_mrr} />
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Sum(Active Plan Monthly Prices)">
 ƒ: Sum(Active Plan Prices)
 </span>
 </div>
 </Link>

 {/* 2. Active Tenants */}
 <Link
 href="/platform/tenants?status=active"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Active Tenants', 'সচল ক্লায়েন্ট')}</span>
 <Building2 className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
 </div>
 <div className="text-xl font-black text-foreground">
 {data.active_companies}
 <span className="text-xs font-normal text-muted-foreground ml-1">/ {data.total_companies}</span>
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Companies where is_active = true)">
 ƒ: Count(is_active = true)
 </span>
 </div>
 </Link>

 {/* 3. Trials Ending in 7 Days */}
 <Link
 href="/platform/tenants?status=trial"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Trials Ending 7d', 'ট্রায়াল শেষ (৭ দিন)')}</span>
 <Clock className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
 </div>
 <div className="text-xl font-black text-foreground">
 {data.trials_ending_in_7_days ?? 0}
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Trials where trial_ends_at is within 7 days)">
 ƒ: Count(trial_end ≤ 7d)
 </span>
 </div>
 </Link>

 {/* 4. Overdue Subscriptions */}
 <Link
 href="/platform/billing?status=past_due"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-warning/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Overdue Subs', 'বাকি সাবস্ক্রিপশন')}</span>
 <AlertTriangle className="h-3.5 w-3.5 text-warning group-hover:scale-110 transition-transform" />
 </div>
 <div className={`text-xl font-black ${data.past_due_companies > 0 ? 'text-warning' : 'text-foreground'}`}>
 {data.past_due_companies}
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Subscriptions where status = 'past_due')">
 ƒ: Count(status = past_due)
 </span>
 </div>
 </Link>

 {/* 5. Open Incidents */}
 <Link
 href="/platform/incidents"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-destructive/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Open Incidents', 'উন্মুক্ত ইনসিডেন্ট')}</span>
 <AlertOctagon className="h-3.5 w-3.5 text-destructive group-hover:scale-110 transition-transform" />
 </div>
 <div className={`text-xl font-black ${(data.open_incidents ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
 {data.open_incidents ?? 0}
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Incidents where status is not resolved)">
 ƒ: Count(status ≠ resolved)
 </span>
 </div>
 </Link>

 {/* 6. Support Backlog */}
 <Link
 href="/platform/support?status=open"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Support Backlog', 'সাপোর্ট ব্যাকলগ')}</span>
 <Users className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
 </div>
 <div className="text-xl font-black text-foreground">
 {data.support_backlog ?? 0}
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Support Conversations where status is not closed)">
 ƒ: Count(tickets ≠ closed)
 </span>
 </div>
 </Link>

 {/* 7. Failed Jobs / Webhooks */}
 <Link
 href="/platform/jobs?status=failed"
 className="group block p-3.5 rounded-2xl bg-card border border-border hover:border-destructive/50 transition-all shadow-xs"
 >
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between mb-1">
 <span>{tBilingual('Failed Jobs', 'ব্যর্থ কাজ')}</span>
 <Activity className="h-3.5 w-3.5 text-destructive group-hover:scale-110 transition-transform" />
 </div>
 <div className={`text-xl font-black ${(data.system_health_summary?.failed_jobs ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
 {data.system_health_summary?.failed_jobs ?? 0}
 </div>
 <div className="mt-2 pt-2 border-t border-border/60">
 <span className="text-xs font-mono text-muted-foreground block truncate" title="Count(Background Jobs where status = 'failed')">
 ƒ: Count(job_status = failed)
 </span>
 </div>
 </Link>
 </div>
 </div>

 {/* 5.3b TENANT GROWTH TREND CHART */}
 {data.tenant_growth && data.tenant_growth.length > 0 && (
 <Card className="bg-card border-border shadow-xs p-4 sm:p-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
 <div>
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <TrendingUp className="h-4 w-4 text-primary" />
 <span>{tBilingual('Tenant Growth Velocity', 'টেন্যান্ট বৃদ্ধির গতি')}</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 {tBilingual('Cumulative and monthly newly onboarded tenant companies over the last 6 months.', 'গত ৬ মাসে মোট ও নতুন যুক্ত হওয়া ক্লায়েন্ট প্রতিষ্ঠানের সংখ্যা।')}
 </p>
 </div>
 <div className="flex items-center gap-3 text-xs font-semibold">
 <div className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded bg-primary" />
 <span className="text-muted-foreground">{tBilingual('Total Active', 'মোট সক্রিয়')}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="h-2.5 w-2.5 rounded bg-muted-foreground/30" />
 <span className="text-muted-foreground">{tBilingual('New Signups', 'নতুন সাইনআপ')}</span>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-36 pt-4 border-t border-border">
 {(() => {
 const maxCount = Math.max(...data.tenant_growth.map((g) => g.count), 5)
 return data.tenant_growth.map((item) => {
 const totalPct = Math.round((item.count / maxCount) * 100)
 const newPct = Math.round(((item.new_tenants || 0) / maxCount) * 100)
 return (
 <div key={item.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
 <div className="text-xs font-bold text-foreground tabular-nums group-hover:text-primary transition-colors">
 {item.count}
 </div>
 <div className="w-full max-w-[42px] bg-muted rounded-t-lg h-full flex flex-col justify-end overflow-hidden p-0.5">
 <div
 style={{ height: `${totalPct}%` }}
 className="w-full bg-primary/20 rounded-t-sm flex flex-col justify-end"
 >
 <div
 style={{ height: `${newPct}%` }}
 className="w-full bg-primary rounded-t-sm min-h-1"
 />
 </div>
 </div>
 <div className="text-xs font-medium text-muted-foreground uppercase tracking-tight">
 {item.month}
 </div>
 </div>
 )
 })
 })()}
 </div>
 </Card>
 )}

 {/* 5.4 CLIENT HEALTH & 5.5 PLANS SUMMARY */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Client Health Breakdown */}
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <ShieldCheck className="h-4 w-4 text-success" />
 <span>{tBilingual('Client Health', 'ক্লায়েন্টের অবস্থা')}</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground font-medium">
 {tBilingual('Status of all clients.', 'সব ক্লায়েন্টের হালনাগাদ অবস্থা।')}
 </CardDescription>
 </div>
 <Link
 href="/platform/tenants"
 className="text-xs text-primary hover:text-primary font-semibold"
 >
 {tBilingual('View All →', 'সব দেখুন →')}
 </Link>
 </CardHeader>

 <CardContent className="p-4 space-y-3">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
 <Link
 href="/platform/tenants?health=healthy"
 className="p-3 rounded-xl bg-success-surface border border-success/30 hover:bg-success-surface transition-colors"
 >
 <div className="text-xs font-bold text-success uppercase">{tBilingual('Good', 'সুস্থ')}</div>
 <div className="text-2xl font-black text-foreground mt-1">
 {data.company_health_breakdown?.healthy ?? 0}
 </div>
 <div className="text-xs text-muted-foreground font-medium">{tBilingual('Normal', 'স্বাভাবিক')}</div>
 </Link>

 <Link
 href="/platform/tenants?health=at_risk"
 className="p-3 rounded-xl bg-warning-surface border border-warning/30 hover:bg-warning-surface transition-colors"
 >
 <div className="text-xs font-bold text-warning uppercase">{tBilingual('At Risk', 'ঝুঁকিতে')}</div>
 <div className="text-2xl font-black text-warning mt-1">
 {data.company_health_breakdown?.at_risk ?? 0}
 </div>
 <div className="text-xs text-muted-foreground font-medium">{tBilingual('Near limit', 'লিমিটের কাছে')}</div>
 </Link>

 <Link
 href="/platform/tenants?health=critical"
 className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/90 transition-colors"
 >
 <div className="text-xs font-bold text-destructive uppercase">{tBilingual('Urgent', 'জরুরি')}</div>
 <div className="text-2xl font-black text-destructive mt-1">
 {data.company_health_breakdown?.critical ?? 0}
 </div>
 <div className="text-xs text-muted-foreground font-medium">{tBilingual('Payment late', 'পেমেন্ট বাকি')}</div>
 </Link>

 <Link
 href="/platform/tenants?status=suspended"
 className="p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
 >
 <div className="text-xs font-bold text-muted-foreground uppercase">{tBilingual('Stopped', 'বন্ধ')}</div>
 <div className="text-2xl font-black text-foreground mt-1">
 {data.company_health_breakdown?.suspended ?? 0}
 </div>
 <div className="text-xs text-muted-foreground font-medium">{tBilingual('Locked', 'লক করা')}</div>
 </Link>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Based on payments, storage, and errors.', 'পেমেন্ট, মেমোরি ও ভুলের হিসাব থেকে।')}</span>
 <Link href="/platform/customer-success" className="text-primary hover:underline font-semibold shrink-0 ml-2">
 {tBilingual('Details →', 'বিস্তারিত →')}
 </Link>
 </div>
 </CardContent>
 </Card>

 {/* Subscription Summary */}
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <CreditCard className="h-4 w-4 text-primary" />
 <span>{tBilingual('Plans & Income', 'প্ল্যান ও আয়')}</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground font-medium">
 {tBilingual('Monthly income by plan.', 'প্ল্যান অনুযায়ী মাসিক আয়।')}
 </CardDescription>
 </div>
 <Link
 href="/platform/subscriptions"
 className="text-xs text-primary hover:text-primary font-semibold"
 >
 {tBilingual('All Plans →', 'সব প্ল্যান →')}
 </Link>
 </CardHeader>

 <CardContent className="p-4 space-y-3">
 <div className="space-y-2">
 {data.subscription_metrics && data.subscription_metrics.length > 0 ? (
 data.subscription_metrics.map((tier) => (
 <div
 key={tier.plan_code}
 className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs"
 >
 <div className="flex items-center gap-2.5">
 <span className="font-bold text-foreground">{tier.plan_name}</span>
 <span className="text-xs tabular-nums px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">
 {tier.plan_code}
 </span>
 </div>

 <div className="flex items-center gap-4">
 <span className="text-muted-foreground font-medium">
 {tier.active_subscribers} {tBilingual('clients', 'জন')}
 </span>
 <div className="tabular-nums font-bold text-success text-right">
 <CurrencyDisplay amount={tier.mrr_bdt} /> / {tBilingual('mo', 'মাস')}
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="p-4 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground space-y-1">
 <CreditCard className="h-6 w-6 mx-auto text-muted-foreground" />
 <p className="font-semibold text-foreground">{tBilingual('No plans yet', 'এখনও কোনো প্ল্যান নেই')}</p>
 <p className="text-xs text-muted-foreground">
 {tBilingual('Income appears when clients subscribe.', 'ক্লায়েন্ট যুক্ত হলে হিসাব দেখাবে।')}
 </p>
 </div>
 )}
 </div>

 <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-semibold">
 <span className="text-muted-foreground">{tBilingual('Total Monthly Income', 'মোট মাসিক আয়')}</span>
 <span className="text-sm tabular-nums font-black text-foreground">
 <CurrencyDisplay amount={data.revenue_mrr} />
 </span>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* 5.6 PLATFORM HEALTH TELEMETRY */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
 <HeartPulse className="h-4 w-4 text-primary" />
 <span>{tBilingual('System Health', 'সিস্টেম স্বাস্থ্য')}</span>
 </h2>
 <Link href="/platform/health" className="text-xs text-primary hover:text-primary hover:underline font-semibold">
 {tBilingual('View Details →', 'বিস্তারিত দেখুন →')}
 </Link>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
 {(data.services_health && data.services_health.length > 0 ? data.services_health : [
 { name: 'Database', key: 'db', status: 'operational' as const },
 { name: 'Cloud Storage', key: 'storage', status: 'operational' as const },
 { name: 'Background Jobs', key: 'jobs', status: 'operational' as const },
 { name: 'Notifications', key: 'notifications', status: 'standby' as const },
 { name: 'bKash Gateway', key: 'bkash', status: 'not_configured' as const },
 { name: 'WhatsApp API', key: 'whatsapp', status: 'not_configured' as const },
 { name: 'Greenweb SMS', key: 'sms', status: 'not_configured' as const },
 { name: 'NBR VAT Sync', key: 'vat', status: 'operational' as const },
 ]).map((svc) => {
 const isOp = svc.status === 'operational'
 const isDeg = svc.status === 'degraded'
 const isFail = svc.status === 'failed'
 const isStandby = svc.status === 'standby'
 const isNotConf = svc.status === 'not_configured'

 const color = isOp
 ? 'text-success'
 : isDeg
 ? 'text-warning'
 : isFail
 ? 'text-destructive'
 : isStandby
 ? 'text-primary'
 : 'text-muted-foreground'

 const dotBg = isOp
 ? 'bg-success'
 : isDeg
 ? 'bg-warning'
 : isFail
 ? 'bg-destructive/10'
 : isStandby
 ? 'bg-primary/10'
 : 'bg-muted'

 const label = isNotConf
 ? tBilingual('Off', 'বন্ধ')
 : isStandby
 ? tBilingual('Ready', 'প্রস্তুত')
 : isOp
 ? tBilingual('Running', 'চালু')
 : isDeg
 ? tBilingual('Slow', 'ধীর')
 : tBilingual('Down', 'বন্ধ')

 return (
 <div
 key={svc.name}
 className="p-2.5 rounded-xl bg-card border border-border text-center space-y-1 hover:border-border transition-colors shadow-xs"
 title={svc.notes || `${svc.name}: ${label}`}
 >
 <div className="text-xs font-bold text-foreground truncate" title={svc.name}>{svc.name}</div>
 <div className={`text-xs font-semibold flex items-center justify-center gap-1 ${color}`}>
 <span className={`h-1.5 w-1.5 rounded-full ${dotBg}`} />
 <span className="truncate">{label}</span>
 </div>
 </div>
 )
 })}
 </div>
 </div>

 {/* 5.7 RECENT PLATFORM ACTIVITY */}
 <Card className="bg-card border-border shadow-sm">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <FileClock className="h-4 w-4 text-primary" />
 <span>{tBilingual('Recent Activity', 'সাম্প্রতিক কাজ')}</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground font-medium">
 {tBilingual('Latest staff actions.', 'কর্মীদের সাম্প্রতিক কাজ।')}
 </CardDescription>
 </div>
 <Link
 href="/platform/audit"
 className="text-xs text-primary hover:text-primary font-semibold"
 >
 {tBilingual('All Activity →', 'সব কাজ →')}
 </Link>
 </CardHeader>

 <CardContent className="p-0 divide-y divide-border">
 {(data.recent_audit_logs && data.recent_audit_logs.length > 0) ? (
 data.recent_audit_logs.map((act) => (
 <div key={act.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-muted transition-colors">
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <span className="tabular-nums text-primary font-bold">{act.action}</span>
 <span className="text-muted-foreground">•</span>
 <span className="font-semibold text-foreground">{act.target_company_name || act.entity_type || tBilingual('Platform', 'প্ল্যাটফর্ম')}</span>
 </div>
 <div className="text-xs text-muted-foreground font-medium">
 {act.reason || act.details?.description || act.details?.note || (typeof act.details === 'object' && Object.keys(act.details).length > 0 ? JSON.stringify(act.details).slice(0, 80) : tBilingual('Action completed', 'কাজ সম্পন্ন'))}
 </div>
 </div>

 <div className="text-right shrink-0">
 <div className="tabular-nums text-xs text-muted-foreground font-medium">
 {formatTime(act.created_at)}
 </div>
 <div className="text-xs text-muted-foreground">{act.actor_email}</div>
 </div>
 </div>
 ))
 ) : (
 <div className="p-6 text-center text-xs text-muted-foreground">
 {tBilingual('No recent actions yet.', 'এখনও কোনো কাজ রেকর্ড হয়নি।')}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
