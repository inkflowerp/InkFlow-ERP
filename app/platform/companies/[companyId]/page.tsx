'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
 Building2,
 Users,
 Store,
 Gauge,
 CreditCard,
 Flag,
 Activity,
 Shield,
 Layers,
 HeartHandshake,
 ArrowLeft,
 CheckCircle2,
 AlertTriangle,
 ExternalLink,
 Phone,
 Mail,
 MapPin,
 Calendar,
 Clock,
 HardDrive,
 Check,
 X,
 HelpCircle,
 Download,
 Ban,
 Sparkles,
 DollarSign,
 Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { useI18n } from '@/lib/i18n'
import { formatDate } from '@/lib/formatters'
import { getPlatformCompany360Action } from '@/actions/platform-data.actions'
import { Company360Data, PlatformPlanCode, PlatformCompanyStatus } from '@/types/platform.types'
import {
 startTenantSupportSessionAction,
 changeCompanyPlanAction,
 updateCompanyStatusAction,
 exportTenantDataAction,
} from '@/actions/platform.actions'

export default function Company360Page() {
  const { tBilingual } = useI18n()
 const params = useParams()
 const router = useRouter()
 const companyId = String(params.companyId)

 const [data, setData] = useState<Company360Data | null>(null)
 const [activeTab, setActiveTab] = useState<
 'overview' | 'users' | 'branches' | 'usage' | 'subscription' | 'features' | 'activity' | 'security' | 'integrations' | 'support'
 >('overview')
 const [loading, setLoading] = useState(true)
 const [showHealthWhy, setShowHealthWhy] = useState(false)

 // Support Mode Modal State
 const [supportModalOpen, setSupportModalOpen] = useState(false)
 const [supportReason, setSupportReason] = useState('')
 const [isStartingSupport, setIsStartingSupport] = useState(false)

 // Plan Modal State
 const [planModalOpen, setPlanModalOpen] = useState(false)
 const [targetPlan, setTargetPlan] = useState<PlatformPlanCode>('business')
 const [planReason, setPlanReason] = useState('')
 const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)

 // Notifications
 const [notification, setNotification] = useState<string | null>(null)

 const showNotification = (msg: string) => {
 setNotification(msg)
 setTimeout(() => setNotification(null), 3500)
 }

 const loadData = async () => {
 setLoading(true)
 const res = await getPlatformCompany360Action(companyId)
 if (res.success && res.data) {
 setData(res.data)
 setTargetPlan(res.data.company.plan)
 }
 setLoading(false)
 }

 useEffect(() => {
 loadData()
 }, [companyId])

 const handleStartSupport = async () => {
 if (!data || !supportReason.trim()) return
 setIsStartingSupport(true)
 const res = await startTenantSupportSessionAction(
 data.company.id,
 data.company.slug,
 data.company.name,
 supportReason
 )
 if (res.success && res.redirectUrl) {
 window.location.href = res.redirectUrl
 } else {
 showNotification('Failed to start support session')
 setIsStartingSupport(false)
 }
 }

 const handleChangePlan = async () => {
 if (!data || !planReason.trim()) return
 setIsUpdatingPlan(true)
 const res = await changeCompanyPlanAction(data.company.id, targetPlan, planReason)
 if (res.success) {
 showNotification(`Plan updated to ${targetPlan.toUpperCase()}`)
 setPlanModalOpen(false)
 setPlanReason('')
 loadData()
 }
 setIsUpdatingPlan(false)
 }

 if (loading || !data) {
 return (
 <div className="space-y-6 animate-pulse">
 <div className="h-6 w-48 bg-muted rounded-md" />
 <div className="h-24 bg-card border border-border rounded-2xl" />
 <div className="grid grid-cols-4 gap-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
 ))}
 </div>
 </div>
 )
 }

 const { company, onboarding, health, usage, subscription } = data
 const isHealthy = health.status === 'healthy'
 const isAtRisk = health.status === 'at_risk'
 const isCritical = health.status === 'critical'

 return (
 <div className="space-y-6">
 {/* Breadcrumb & Header */}
 <div className="space-y-4">
 <Link
 href="/platform/tenants"
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
 >
 <ArrowLeft className="h-3.5 w-3.5" />
 <span>{tBilingual('Back to Clients', 'ক্লায়েন্টে ফিরে যান')}</span>
 </Link>

 {/* Notification */}
 {notification && (
 <div className="p-3 bg-success-surface border border-success/30 text-success rounded-xl text-xs font-bold flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 text-success" />
 <span>{notification}</span>
 </div>
 )}

 {/* Company 360 Header Card */}
 <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2.5 flex-wrap">
 <h1 className="text-2xl font-black text-foreground">{company.name}</h1>
 <span className="text-xs text-muted-foreground font-medium">({company.name_bn})</span>
 <span className="text-2xs tabular-nums uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 {company.plan}
 </span>
 <span
 className={`text-2xs font-bold uppercase px-2 py-0.5 rounded-full border ${
 company.status === 'active'
 ? 'bg-success-surface text-success border-success/30'
 : company.status === 'trial'
 ? 'bg-primary/10 text-primary border-primary/20'
 : 'bg-warning-surface text-warning border-warning/30'
 }`}
 >
 {company.status}
 </span>
 </div>

 <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
 <span className="flex items-center gap-1">
 <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
 {company.hub}
 </span>
 <span>•</span>
 <span className="flex items-center gap-1">
 <Phone className="h-3.5 w-3.5 text-muted-foreground" />
 {company.owner_phone}
 </span>
 <span>•</span>
 <span className="tabular-nums text-primary">{company.slug}.printerp.com.bd</span>
 </div>
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 <Button
 size="sm"
 onClick={() => setSupportModalOpen(true)}
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs shadow-xs h-9"
 >
 <Shield className="h-3.5 w-3.5 mr-1.5" />
 <span>Open Support Mode</span>
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => setPlanModalOpen(true)}
 className="border-border text-foreground hover:bg-muted text-xs h-9"
 >
 <CreditCard className="h-3.5 w-3.5 mr-1.5 text-primary" />
 <span>Change Plan</span>
 </Button>
 </div>
 </div>
 </div>

 {/* KPI Overview Summary Bar */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Users', 'ইউজার')}</div>
 <div className="text-lg font-black text-foreground mt-0.5">
 {company.users_count} <span className="text-xs font-normal text-muted-foreground">/ {company.users_limit}</span>
 </div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Branches', 'শাখা')}</div>
 <div className="text-lg font-black text-foreground mt-0.5">
 {company.branches_count} <span className="text-xs font-normal text-muted-foreground">/ {company.branches_limit}</span>
 </div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Customers', 'কাস্টমার')}</div>
 <div className="text-lg font-black text-foreground mt-0.5">{usage.customers_count}</div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Monthly Orders', 'মাসিক অর্ডার')}</div>
 <div className="text-lg font-black text-foreground mt-0.5">{usage.orders_this_month}</div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Storage', 'মেমোরি')}</div>
 <div className="text-lg font-black text-foreground mt-0.5">
 {company.storage_used_gb.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">GB</span>
 </div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Monthly Fee', 'মাসিক ফি')}</div>
 <div className="text-lg font-black text-success mt-0.5">
 <CurrencyDisplay amount={company.monthly_fee} />
 </div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground">{tBilingual('Setup', 'সেটআপ')}</div>
 <div className="text-lg font-black text-primary mt-0.5">{onboarding.overall_progress_pct}%</div>
 </Card>

 <Card className="bg-card border-border p-3 text-center">
 <div className="text-2xs font-semibold text-muted-foreground flex items-center justify-center gap-1">
 <span>{tBilingual('Health', 'অবস্থা')}</span>
 <button onClick={() => setShowHealthWhy(true)} className="text-muted-foreground hover:text-primary" title="Why?">
 <HelpCircle className="h-3 w-3" />
 </button>
 </div>
 <div className={`text-xs font-bold uppercase mt-1 ${isCritical ? 'text-destructive' : isAtRisk ? 'text-warning' : 'text-success'}`}>
 {health.status.replace('_', ' ')}
 </div>
 </Card>
 </div>

 {/* Onboarding Progress Card */}
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-sm text-foreground font-bold flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 text-primary" />
 <span>{tBilingual('Setup Progress', 'সেটআপ অগ্রগতি')} ({onboarding.overall_progress_pct}%)</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 {tBilingual('System setup checklist for this client.', 'এই ক্লায়েন্টের সিস্টেম সেটআপ তালিকা।')}
 </CardDescription>
 </div>
 <div className="w-32 bg-card rounded-full h-2 overflow-hidden border border-border">
 <div
 className="bg-card h-full rounded-full transition-all"
 style={{ width: `${onboarding.overall_progress_pct}%` }}
 />
 </div>
 </CardHeader>

 <CardContent className="p-4">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
 {onboarding.steps.map((step) => (
 <div
 key={step.id}
 className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
 step.is_completed
 ? 'bg-success-surface border-success/30 text-muted-foreground'
 : 'bg-card border-border text-muted-foreground'
 }`}
 >
 <div className="mt-0.5 shrink-0">
 {step.is_completed ? (
 <Check className="h-3.5 w-3.5 text-success" />
 ) : (
 <div className="h-3.5 w-3.5 rounded-full border border-border" />
 )}
 </div>
 <div>
 <div className={`font-semibold ${step.is_completed ? 'text-foreground' : 'text-muted-foreground'}`}>
 {step.title}
 </div>
 <div className="text-2xs text-muted-foreground line-clamp-1">{step.description}</div>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>

 {/* 10 Navigation Tabs */}
 <div className="border-b border-border flex items-center gap-1 overflow-x-auto text-xs pb-1">
 {[
 { id: 'overview', label: 'Overview', icon: Building2 },
 { id: 'users', label: 'Users', icon: Users, count: data.users.length },
 { id: 'branches', label: 'Branches', icon: Store, count: data.branches.length },
 { id: 'usage', label: 'Usage & Limits', icon: Gauge },
 { id: 'subscription', label: 'Subscription', icon: CreditCard },
 { id: 'features', label: 'Feature Overrides', icon: Flag, count: data.features.filter((f) => f.is_tenant_override).length },
 { id: 'activity', label: 'Activity Timeline', icon: Activity },
 { id: 'security', label: 'Security', icon: Shield },
 { id: 'integrations', label: 'Integrations', icon: Layers },
 { id: 'support', label: 'Support Sessions', icon: HeartHandshake, count: data.support_history.length },
 ].map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id

 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id as any)}
 className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
 isActive
 ? 'bg-primary text-foreground shadow-xs'
 : 'text-muted-foreground hover:text-primary-foreground hover:bg-muted'
 }`}
 >
 <Icon className="h-3.5 w-3.5" />
 <span>{tab.label}</span>
 {tab.count !== undefined && tab.count > 0 && (
 <span className="text-2xs px-1.5 py-0.2 rounded-full bg-background/80 tabular-nums">
 {tab.count}
 </span>
 )}
 </button>
 )
 })}
 </div>

 {/* Tab 1: Overview */}
 {activeTab === 'overview' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">Organization Profile</CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-2.5 text-xs text-muted-foreground">
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Legal Company Name:</span>
 <span className="font-semibold text-foreground">{company.name}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Bengali Name:</span>
 <span className="font-semibold text-foreground">{company.name_bn}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">{tBilingual('Web Address:', 'ওয়েব ঠিকানা:')}</span>
 <span className="tabular-nums text-primary">{company.slug}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Primary Printing Hub:</span>
 <span className="font-semibold text-foreground">{company.hub}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Division / District:</span>
 <span className="font-semibold text-foreground">{company.division} / {company.district}</span>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-muted-foreground">Account Created:</span>
 <span className="tabular-nums text-muted-foreground">{formatDate(company.created_at)}</span>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">Owner &amp; Billing Contact</CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-2.5 text-xs text-muted-foreground">
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Owner Name:</span>
 <span className="font-semibold text-foreground">{company.owner_name}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Email Address:</span>
 <span className="tabular-nums text-primary">{company.owner_email}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Mobile Number:</span>
 <span className="tabular-nums text-success">{company.owner_phone}</span>
 </div>
 <div className="flex justify-between py-1 border-b border-border">
 <span className="text-muted-foreground">Last Meaningful Activity:</span>
 <span className="font-semibold text-foreground">{company.last_meaningful_activity.action}</span>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-muted-foreground">Activity Timestamp:</span>
 <span className="tabular-nums text-muted-foreground">{company.last_activity}</span>
 </div>
 </CardContent>
 </Card>
 </div>
 )}

 {/* Tab 2: Users */}
 {activeTab === 'users' && (
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">
 Staff Users ({data.users.length} / {company.users_limit})
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold uppercase text-2xs border-b border-border">
 <tr>
 <th className="py-3 px-4">User Name</th>
 <th className="py-3 px-4">Email</th>
 <th className="py-3 px-4">Role</th>
 <th className="py-3 px-4">MFA</th>
 <th className="py-3 px-4">Last Login</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {data.users.map((u) => (
 <tr key={u.id}>
 <td className="py-3 px-4 font-bold text-foreground">{u.full_name}</td>
 <td className="py-3 px-4 tabular-nums text-muted-foreground">{u.email}</td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/20">
 {u.role}
 </span>
 </td>
 <td className="py-3 px-4">
 {u.mfa_enabled ? (
 <span className="text-success font-bold">Enabled</span>
 ) : (
 <span className="text-muted-foreground">Disabled</span>
 )}
 </td>
 <td className="py-3 px-4 tabular-nums text-muted-foreground">{u.last_login_at || 'Never'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </CardContent>
 </Card>
 )}

 {/* Tab 3: Branches */}
 {activeTab === 'branches' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {data.branches.map((br) => (
 <Card key={br.id} className="bg-card border-border p-4 space-y-2 text-xs">
 <div className="flex items-center justify-between">
 <div className="font-bold text-foreground text-sm">{br.name}</div>
 {br.is_main && (
 <span className="text-2xs uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 Main Press Hub
 </span>
 )}
 </div>
 <div className="text-muted-foreground flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
 <span>{br.address}</span>
 </div>
 <div className="text-muted-foreground flex items-center gap-1.5">
 <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
 <span className="tabular-nums text-muted-foreground">{br.phone}</span>
 </div>
 </Card>
 ))}
 </div>
 )}

 {/* Tab 4: Usage & Limits */}
 {activeTab === 'usage' && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="bg-card border-border p-4 space-y-2 text-xs">
 <div className="font-bold text-muted-foreground flex items-center justify-between">
 <span>User Accounts</span>
 <Users className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground">{usage.users_count} / {usage.users_limit}</div>
 <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
 <div className="bg-primary h-full" style={{ width: `${Math.min(100, (usage.users_count / usage.users_limit) * 100)}%` }} />
 </div>
 </Card>

 <Card className="bg-card border-border p-4 space-y-2 text-xs">
 <div className="font-bold text-muted-foreground flex items-center justify-between">
 <span>Cloud Storage</span>
 <HardDrive className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground">{usage.storage_used_gb.toFixed(1)} GB / {usage.storage_limit_gb} GB</div>
 <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
 <div className="bg-primary h-full" style={{ width: `${Math.min(100, (usage.storage_used_gb / usage.storage_limit_gb) * 100)}%` }} />
 </div>
 </Card>

 <Card className="bg-card border-border p-4 space-y-2 text-xs">
 <div className="font-bold text-muted-foreground flex items-center justify-between">
 <span>Orders this Month</span>
 <Layers className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground">{usage.orders_this_month} / {usage.orders_limit}</div>
 <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
 <div className="bg-primary h-full" style={{ width: `${Math.min(100, (usage.orders_this_month / usage.orders_limit) * 100)}%` }} />
 </div>
 </Card>
 </div>
 )}

 {/* Tab 5: Subscription */}
 {activeTab === 'subscription' && (
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">Subscription &amp; Invoicing Details</CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-3 text-xs">
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 rounded-xl bg-card border border-border">
 <div className="text-muted-foreground">Plan Tier:</div>
 <div className="font-bold text-foreground text-base capitalize">{subscription.plan_name}</div>
 </div>
 <div className="p-3 rounded-xl bg-card border border-border">
 <div className="text-muted-foreground">Monthly Billing Rate:</div>
 <div className="font-bold text-success text-base">
 <CurrencyDisplay amount={subscription.rate_bdt} /> / mo
 </div>
 </div>
 <div className="p-3 rounded-xl bg-card border border-border">
 <div className="text-muted-foreground">Renewal Date:</div>
 <div className="tabular-nums text-foreground font-bold">{formatDate(subscription.current_period_end)}</div>
 </div>
 <div className="p-3 rounded-xl bg-card border border-border">
 <div className="text-muted-foreground">Payment Method:</div>
 <div className="font-semibold text-foreground">{subscription.payment_method || 'bKash Merchant'}</div>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Tab 6: Features */}
 {activeTab === 'features' && (
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">{tBilingual('Feature Settings', 'ফিচার সেটিংস')}</CardTitle>
 </CardHeader>
 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.features.map((f) => (
 <div key={f.flag_id} className="p-3.5 flex items-center justify-between">
 <div>
 <div className="font-bold text-foreground">{f.name}</div>
 <div className="text-2xs text-muted-foreground tabular-nums">{f.key}</div>
 {f.notes && <div className="text-2xs text-primary mt-0.5">Note: {f.notes}</div>}
 </div>
 <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${f.is_enabled ? 'bg-success-surface text-success' : 'bg-muted text-muted-foreground'}`}>
 {f.is_enabled ? 'ACTIVE' : 'DISABLED'}
 </span>
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {/* Tab 7: Activity */}
 {activeTab === 'activity' && (
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">{tBilingual('Activity History', 'কাজের ইতিহাস')}</CardTitle>
 </CardHeader>
 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.activity.map((a) => (
 <div key={a.id} className="p-3.5 flex items-center justify-between">
 <div>
 <div className="font-bold text-foreground">{a.description}</div>
 <div className="text-2xs text-muted-foreground">By {a.actor_email}</div>
 </div>
 <span className="tabular-nums text-muted-foreground">{a.created_at}</span>
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {/* Tab 8: Security */}
 {activeTab === 'security' && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="bg-card border-border p-4 text-center">
 <div className="text-xs text-muted-foreground">Active Devices / Sessions</div>
 <div className="text-2xl font-black text-foreground mt-1">{data.security.active_sessions_count}</div>
 </Card>
 <Card className="bg-card border-border p-4 text-center">
 <div className="text-xs text-muted-foreground">Staff MFA Coverage</div>
 <div className="text-2xl font-black text-success mt-1">{data.security.mfa_coverage_pct}%</div>
 </Card>
 <Card className="bg-card border-border p-4 text-center">
 <div className="text-xs text-muted-foreground">Failed Logins (7 Days)</div>
 <div className="text-2xl font-black text-foreground mt-1">{data.security.failed_logins_last_7d}</div>
 </Card>
 </div>
 )}

 {/* Tab 9: Integrations */}
 {activeTab === 'integrations' && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {data.integrations.map((it) => (
 <Card key={it.service} className="bg-card border-border p-4 space-y-1.5 text-xs">
 <div className="font-bold text-foreground">{it.name}</div>
 <div className="text-2xs text-success font-semibold flex items-center gap-1">
 <span className="h-1.5 w-1.5 rounded-full bg-success" />
 <span className="uppercase">{it.status}</span>
 </div>
 <div className="text-2xs text-muted-foreground">Last event: {it.last_event_at || 'Recently'}</div>
 </Card>
 ))}
 </div>
 )}

 {/* Tab 10: Support Sessions */}
 {activeTab === 'support' && (
 <Card className="bg-card border-border">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm text-foreground font-bold">Platform Support Mode History</CardTitle>
 </CardHeader>
 <CardContent className="p-0 divide-y divide-border text-xs">
 {data.support_history.map((s) => (
 <div key={s.id} className="p-3.5 flex items-center justify-between">
 <div>
 <div className="font-bold text-foreground">{s.reason}</div>
 <div className="text-2xs text-muted-foreground">Officer: {s.platform_user_email}</div>
 </div>
 <div className="text-right">
 <div className="tabular-nums text-muted-foreground">{formatDate(s.started_at)}</div>
 <div className="text-2xs text-muted-foreground">{s.duration_minutes} mins duration</div>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {/* "Why?" Health Transparency Modal */}
 {showHealthWhy && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4 animate-in zoom-in-95">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <HeartHandshake className="h-4 w-4 text-primary" />
 <span>{tBilingual('Client Health:', 'ক্লায়েন্ট স্বাস্থ্য:')} {health.status.toUpperCase()}</span>
 </div>
 <button onClick={() => setShowHealthWhy(false)} className="text-muted-foreground hover:text-foreground">
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-2 text-xs">
 <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
 <span className="text-muted-foreground">Overall Health Score:</span>
 <span className="font-bold tabular-nums text-lg text-foreground">{health.score} / 100</span>
 </div>

 <div className="space-y-1.5 pt-2">
 <div className="text-2xs font-bold text-muted-foreground uppercase">Evaluated Factors:</div>
 {health.factors.map((f, i) => (
 <div
 key={i}
 className={`p-2.5 rounded-xl border flex items-start gap-2 ${
 f.status === 'critical'
 ? 'bg-destructive/10 border-destructive/30 text-destructive'
 : f.status === 'warning'
 ? 'bg-warning-surface border-warning/30 text-warning'
 : 'bg-success-surface border-success/30 text-success'
 }`}
 >
 <span className="mt-0.5 font-bold">•</span>
 <div>
 <div className="font-bold">{f.label}</div>
 <div className="text-2xs opacity-90">{f.description}</div>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="flex justify-end pt-3 border-t border-border">
 <Button size="sm" onClick={() => setShowHealthWhy(false)} className="bg-primary text-primary-foreground text-xs">
 Close
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Support Mode Dialog */}
 {supportModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4 animate-in zoom-in-95">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <Shield className="h-4 w-4 text-warning" />
 <span>Enter Support Mode: {company.name}</span>
 </div>
 <button onClick={() => setSupportModalOpen(false)} className="text-muted-foreground hover:text-foreground">
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <div className="p-3 rounded-xl bg-warning-surface border border-warning/30 text-warning">
 {tBilingual('You are entering the client account to help them. All actions are recorded.', 'সাহায্য করার জন্য আপনি ক্লায়েন্ট অ্যাকাউন্টে ঢুকছেন। সব কাজ রেকর্ড হবে।')}
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Investigation Reason *</label>
 <textarea
 required
 rows={2}
 value={supportReason}
 onChange={(e) => setSupportReason(e.target.value)}
 placeholder="e.g. Assisting owner with Mushak 6.3 VAT rounding calibration..."
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground text-xs"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <Button variant="outline" size="sm" onClick={() => setSupportModalOpen(false)} className="border-border text-xs">
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={!supportReason.trim() || isStartingSupport}
 onClick={handleStartSupport}
 className="bg-warning hover:bg-warning text-foreground font-bold text-xs"
 >
 {isStartingSupport ? 'Entering...' : 'Authorize Support Mode'}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Change Plan Dialog */}
 {planModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card backdrop-blur-sm">
 <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xs p-5 space-y-4 animate-in zoom-in-95">
 <div className="flex items-center justify-between border-b border-border pb-3">
 <div className="font-bold text-foreground text-sm flex items-center gap-2">
 <CreditCard className="h-4 w-4 text-primary" />
 <span>Change Plan: {company.name}</span>
 </div>
 <button onClick={() => setPlanModalOpen(false)} className="text-muted-foreground hover:text-foreground">
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="space-y-3 text-xs">
 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Target Plan</label>
 <select
 value={targetPlan}
 onChange={(e) => setTargetPlan(e.target.value as PlatformPlanCode)}
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground font-semibold"
 >
 <option value="starter">Starter Press (৳1,999/mo)</option>
 <option value="business">Business Signage (৳4,999/mo)</option>
 <option value="enterprise">Enterprise Factory (৳9,999/mo)</option>
 </select>
 </div>

 <div>
 <label className="text-muted-foreground font-semibold block mb-1">Reason *</label>
 <textarea
 required
 rows={2}
 value={planReason}
 onChange={(e) => setPlanReason(e.target.value)}
 placeholder="Reason for changing plan tier..."
 className="w-full bg-card border border-border rounded-xl p-2.5 text-foreground text-xs"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-3 border-t border-border">
 <Button variant="outline" size="sm" onClick={() => setPlanModalOpen(false)} className="border-border text-xs">
 Cancel
 </Button>
 <Button
 size="sm"
 disabled={!planReason.trim() || isUpdatingPlan}
 onClick={handleChangePlan}
 className="bg-primary text-primary-foreground font-bold text-xs"
 >
 {isUpdatingPlan ? 'Updating...' : 'Confirm Plan Change'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
