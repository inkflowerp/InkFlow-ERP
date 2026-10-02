'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 Zap,
 Building2,
 Clock,
 AlertTriangle,
 TrendingUp,
 TrendingDown,
 UserX,
 CheckCircle2,
 ArrowRight,
 RefreshCw,
 Sparkles,
 ExternalLink,
 Shield,
 Phone,
 Mail,
 Calendar,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformCustomerSuccessMetricsAction } from '@/actions/platform-data.actions'
import { CustomerSuccessData } from '@/types/platform.types'

import { useI18n } from '@/lib/i18n'

export default function CustomerSuccessPage() {
  const { tBilingual } = useI18n()
 const [data, setData] = useState<CustomerSuccessData | null>(null)
 const [loading, setLoading] = useState(true)

 const loadData = async () => {
 setLoading(true)
 const res = await getPlatformCustomerSuccessMetricsAction()
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
 <div className="h-10 w-72 bg-muted rounded-xl" />
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-32 bg-card border border-border rounded-2xl" />
 ))}
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-8">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-warning uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-warning" />
 Adoption, Retention &amp; Churn Prevention
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Zap className="h-7 w-7 text-warning" />
 Customer Success &amp; Lifecycle
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Monitor printing tenant onboarding, identify churn risks before cancellation, and guide trial conversions.
 </p>
 </div>

 <Button
 size="sm"
 variant="outline"
 onClick={loadData}
 className="border-border bg-card text-muted-foreground hover:bg-muted text-xs h-9"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Refresh
 </Button>
 </div>

 {/* Summary KPI Highlights */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-card border-border p-4">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Active Trials</span>
 <Clock className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1">{data.trials_ending_soon.length}</div>
 <div className="text-2xs text-primary mt-1">In trial evaluation window</div>
 </Card>

 <Card className="bg-card border-border p-4">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Inactive (&gt;7 Days)</span>
 <UserX className="h-4 w-4 text-warning" />
 </div>
 <div className="text-2xl font-black text-warning mt-1">{data.inactive_tenants.length}</div>
 <div className="text-2xs text-warning mt-1">No orders or invoices logged</div>
 </Card>

 <Card className="bg-card border-border p-4">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>At-Risk Accounts</span>
 <AlertTriangle className="h-4 w-4 text-destructive" />
 </div>
 <div className="text-2xl font-black text-destructive mt-1">{data.at_risk_tenants.length}</div>
 <div className="text-2xs text-destructive mt-1">Billing or storage alerts</div>
 </Card>

 <Card className="bg-card border-border p-4">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>High-Growth Accounts</span>
 <TrendingUp className="h-4 w-4 text-success" />
 </div>
 <div className="text-2xl font-black text-success mt-1">{data.high_growth_tenants.length}</div>
 <div className="text-2xs text-success mt-1">&gt;20% monthly order surge</div>
 </Card>
 </div>

 {/* 1. Trial Ending Soon Section */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <Clock className="h-4 w-4 text-primary" />
 <span>Free Evaluation Trials ({data.trials_ending_soon.length})</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Tenants evaluating PrintERP. Check feature adoption and assist conversion to paid plans.
 </CardDescription>
 </CardHeader>

 <CardContent className="p-0 divide-y divide-border">
 {data.trials_ending_soon.map(({ company, trial_day, total_days, expires_in_days, features_used, last_meaningful_activity }) => (
 <div key={company.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-muted transition-colors">
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2">
 <Link href={`/platform/companies/${company.id}`} className="font-bold text-foreground hover:text-primary text-sm">
 {company.name}
 </Link>
 <span className="tabular-nums text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-2xs font-bold">
 Day {trial_day} / {total_days}
 </span>
 </div>

 <div className="text-muted-foreground flex items-center gap-2 flex-wrap text-2xs">
 <span>Owner: <strong className="text-foreground">{company.owner_name}</strong></span>
 <span>•</span>
 <span>Phone: <strong className="text-success tabular-nums">{company.owner_phone}</strong></span>
 <span>•</span>
 <span>Orders: <strong className="text-foreground tabular-nums">{company.orders_this_month}</strong></span>
 <span>•</span>
 <span>Storage: <strong className="text-foreground tabular-nums">{company.storage_used_gb} GB</strong></span>
 </div>

 <div className="flex items-center gap-1.5 text-2xs pt-1">
 <span className="text-muted-foreground">Features Adopted:</span>
 {features_used.map((f) => (
 <span key={f} className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
 ✓ {f}
 </span>
 ))}
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <div className="text-right mr-2">
 <div className="font-bold text-warning">Expires in {expires_in_days} days</div>
 <div className="text-2xs text-muted-foreground tabular-nums">Last active: {company.last_activity}</div>
 </div>

 <Link
 href={`/platform/companies/${company.id}`}
 className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
 >
 Open Company 360 →
 </Link>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>

 {/* 2. Inactive Tenants Section */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <UserX className="h-4 w-4 text-warning" />
 <span>{tBilingual('Inactive Clients (7+ Days)', 'নিষ্ক্রিয় ক্লায়েন্ট (৭+ দিন)')}</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Monitoring mechanism for churn detection. Does NOT automatically suspend accounts.
 </CardDescription>
 </CardHeader>

 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.inactive_tenants.map(({ company, days_inactive, last_meaningful_activity }) => (
 <div key={company.id} className="p-4 flex items-center justify-between hover:bg-muted transition-colors">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <Link href={`/platform/companies/${company.id}`} className="font-bold text-foreground text-sm hover:text-primary">
 {company.name}
 </Link>
 <span className="capitalize px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums text-2xs">
 {company.plan}
 </span>
 </div>
 <div className="text-muted-foreground text-2xs">
 Owner: {company.owner_name} ({company.owner_phone}) • {company.hub}
 </div>
 <div className="text-2xs text-warning">
 Last meaningful operation: {last_meaningful_activity}
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="text-right tabular-nums">
 <div className="font-bold text-destructive text-sm">{days_inactive} Days</div>
 <div className="text-2xs text-muted-foreground">Inactive</div>
 </div>

 <Link
 href={`/platform/companies/${company.id}`}
 className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted text-foreground font-semibold text-xs border border-border"
 >
 Inspect →
 </Link>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>

 {/* 3. At Risk & High Growth Split */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* At Risk Accounts */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-destructive" />
 <span>{tBilingual('At-Risk Clients', 'ঝুঁকিতে থাকা ক্লায়েন্ট')} ({data.at_risk_tenants.length})</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.at_risk_tenants.map(({ company, risk_score, reasons }) => (
 <div key={company.id} className="p-3.5 space-y-1 hover:bg-muted transition-colors">
 <div className="flex items-center justify-between">
 <Link href={`/platform/companies/${company.id}`} className="font-bold text-foreground hover:text-primary">
 {company.name}
 </Link>
 <span className="text-2xs tabular-nums font-bold text-destructive bg-destructive/10 border border-destructive/30 px-2 py-0.5 rounded">
 Risk {risk_score}%
 </span>
 </div>
 <div className="text-2xs text-muted-foreground space-y-0.5">
 {reasons.map((r, i) => (
 <div key={i} className="text-warning/90">• {r}</div>
 ))}
 </div>
 </div>
 ))}
 </CardContent>
 </Card>

 {/* High Growth Accounts */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold flex items-center gap-2">
 <TrendingUp className="h-4 w-4 text-success" />
 <span>{tBilingual('Fast Growing Clients', 'দ্রুত বর্ধনশীল ক্লায়েন্ট')} ({data.high_growth_tenants.length})</span>
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.high_growth_tenants.map(({ company, growth_rate_pct, order_volume }) => (
 <div key={company.id} className="p-3.5 flex items-center justify-between hover:bg-muted transition-colors">
 <div>
 <Link href={`/platform/companies/${company.id}`} className="font-bold text-foreground hover:text-success">
 {company.name}
 </Link>
 <div className="text-2xs text-muted-foreground mt-0.5">
 {order_volume.toLocaleString()} orders logged this month • {company.plan.toUpperCase()}
 </div>
 </div>
 <span className="tabular-nums font-bold text-success text-sm">
 +{growth_rate_pct}%
 </span>
 </div>
 ))}
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
