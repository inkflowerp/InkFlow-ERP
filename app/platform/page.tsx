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
 <div className="flex items-center gap-2 text-2xs sm:text-xs font-bold text-primary uppercase tracking-wider mb-1">
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
 className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition-colors cursor-pointer text-2xs sm:text-xs ${
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
 <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-2xs font-bold uppercase tracking-wider border border-primary/20">
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
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
 {data.needs_attention.length} {tBilingual('Urgent', 'জরুরি')}
 </span>
 ) : (
 <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-success-surface text-success border border-success/30">
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
 <div className="text-success/80 text-2xs">{tBilingual('All clients and services are running well.', 'সব ক্লায়েন্ট ও সেবা ভালো চলছে।')}</div>
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
 className={`text-2xs tabular-nums font-bold uppercase px-2 py-0.5 rounded-md border ${
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
 <span className="text-2xs text-muted-foreground tabular-nums">{item.timestamp}</span>
 </div>

 <div className="font-bold text-sm text-foreground">{item.title}</div>
 {(item.tenant_name || item.system_name) && (
 <div className="text-xs font-semibold text-muted-foreground">
 {item.tenant_name ? `${tBilingual('Client', 'ক্লায়েন্ট')}: ${item.tenant_name}` : `${tBilingual('System', 'সিস্টেম')}: ${item.system_name}`}
 </div>
 )}
 <p className="text-2xs text-muted-foreground leading-relaxed">{item.reason}</p>
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

 {/* 5.3 CORE PLATFORM METRICS */}
 <div className="space-y-3">
 <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
 {tBilingual('Key Numbers', 'মূল হিসাব')}
 </h2>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Active Clients', 'সচল ক্লায়েন্ট')}</span>
 <Building2 className="h-3.5 w-3.5 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5">{data.active_companies}</div>
 <div className="text-2xs text-success mt-1 font-semibold flex items-center gap-0.5">
 <ArrowUpRight className="h-3 w-3" /> {tBilingual(`of ${data.total_companies} total`, `মোট ${data.total_companies} এর মধ্যে`)}
 </div>
 </Card>

 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Monthly Income', 'মাসিক আয়')}</span>
 <TrendingUp className="h-3.5 w-3.5 text-success" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5">
 <CurrencyDisplay amount={data.revenue_mrr} />
 </div>
 <div className="text-2xs text-muted-foreground mt-1 font-medium">
 {tBilingual('Year:', 'বছর:')} <CurrencyDisplay amount={data.revenue_arr} />
 </div>
 </Card>

 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Free Trials', 'ফ্রি ট্রায়াল')}</span>
 <Clock className="h-3.5 w-3.5 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5">{data.trial_companies}</div>
 <div className="text-2xs text-primary mt-1 font-semibold">{tBilingual('Running', 'চলমান')}</div>
 </Card>

 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Late Payments', 'বাকি পেমেন্ট')}</span>
 <AlertTriangle className="h-3.5 w-3.5 text-warning" />
 </div>
 <div className="text-2xl font-black text-warning mt-1.5">{data.past_due_companies}</div>
 <div className="text-2xs text-warning mt-1 font-medium">{tBilingual('Action needed', 'পদক্ষেপ প্রয়োজন')}</div>
 </Card>

 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Orders Done', 'মোট অর্ডার')}</span>
 <Layers className="h-3.5 w-3.5 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5">{data.orders_count.toLocaleString()}</div>
 <div className="text-2xs text-primary mt-1 font-semibold">{tBilingual('This month', 'এই মাসে')}</div>
 </Card>

 <Card className="bg-card border-border p-4 shadow-sm">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>{tBilingual('Storage Used', 'ব্যবহৃত মেমোরি')}</span>
 <HardDrive className="h-3.5 w-3.5 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5">
 {data.storage_used_gb >= 1
 ? `${data.storage_used_gb.toFixed(2)} GB`
 : `${data.storage_used_mb || (data.storage_used_gb * 1024).toFixed(1)} MB`}
 </div>
 <div className="text-2xs text-primary mt-1 font-semibold">
 {data.storage_total_gb > 0
 ? `${((data.storage_used_gb / data.storage_total_gb) * 100).toFixed(1)}% ${tBilingual('used', 'ব্যবহৃত')}`
 : tBilingual('Unlimited', 'সীমাহীন')}
 </div>
 </Card>
 </div>
 </div>

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
 <div className="text-2xs text-muted-foreground font-medium">{tBilingual('Normal', 'স্বাভাবিক')}</div>
 </Link>

 <Link
 href="/platform/tenants?health=at_risk"
 className="p-3 rounded-xl bg-warning-surface border border-warning/30 hover:bg-warning-surface transition-colors"
 >
 <div className="text-xs font-bold text-warning uppercase">{tBilingual('At Risk', 'ঝুঁকিতে')}</div>
 <div className="text-2xl font-black text-warning mt-1">
 {data.company_health_breakdown?.at_risk ?? 0}
 </div>
 <div className="text-2xs text-muted-foreground font-medium">{tBilingual('Near limit', 'লিমিটের কাছে')}</div>
 </Link>

 <Link
 href="/platform/tenants?health=critical"
 className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/90 transition-colors"
 >
 <div className="text-xs font-bold text-destructive uppercase">{tBilingual('Urgent', 'জরুরি')}</div>
 <div className="text-2xl font-black text-destructive mt-1">
 {data.company_health_breakdown?.critical ?? 0}
 </div>
 <div className="text-2xs text-muted-foreground font-medium">{tBilingual('Payment late', 'পেমেন্ট বাকি')}</div>
 </Link>

 <Link
 href="/platform/tenants?status=suspended"
 className="p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
 >
 <div className="text-xs font-bold text-muted-foreground uppercase">{tBilingual('Stopped', 'বন্ধ')}</div>
 <div className="text-2xl font-black text-foreground mt-1">
 {data.company_health_breakdown?.suspended ?? 0}
 </div>
 <div className="text-2xs text-muted-foreground font-medium">{tBilingual('Locked', 'লক করা')}</div>
 </Link>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border text-2xs text-muted-foreground flex items-center justify-between">
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
 <span className="text-2xs tabular-nums px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">
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
 <p className="text-2xs text-muted-foreground">
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
 <div className="text-2xs font-bold text-foreground truncate" title={svc.name}>{svc.name}</div>
 <div className={`text-2xs font-semibold flex items-center justify-center gap-1 ${color}`}>
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
 <div className="text-2xs text-muted-foreground font-medium">
 {act.reason || act.details?.description || act.details?.note || (typeof act.details === 'object' && Object.keys(act.details).length > 0 ? JSON.stringify(act.details).slice(0, 80) : tBilingual('Action completed', 'কাজ সম্পন্ন'))}
 </div>
 </div>

 <div className="text-right shrink-0">
 <div className="tabular-nums text-2xs text-muted-foreground font-medium">
 {formatTime(act.created_at)}
 </div>
 <div className="text-2xs text-muted-foreground">{act.actor_email}</div>
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
