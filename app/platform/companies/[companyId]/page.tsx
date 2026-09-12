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
        <div className="h-6 w-48 bg-slate-800 rounded-md" />
        <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Tenants Directory</span>
        </Link>

        {/* Notification */}
        {notification && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Company 360 Header Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white">{company.name}</h1>
              <span className="text-xs text-slate-400 font-medium">({company.name_bn})</span>
              <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {company.plan}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  company.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : company.status === 'trial'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {company.status}
              </span>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {company.hub}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                {company.owner_phone}
              </span>
              <span>•</span>
              <span className="font-mono text-indigo-400">{company.slug}.printerp.com.bd</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setSupportModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 h-9"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              <span>Open Support Mode</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPlanModalOpen(true)}
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-9"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              <span>Change Plan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Users</div>
          <div className="text-lg font-black text-white mt-0.5">
            {company.users_count} <span className="text-xs font-normal text-slate-500">/ {company.users_limit}</span>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Branches</div>
          <div className="text-lg font-black text-white mt-0.5">
            {company.branches_count} <span className="text-xs font-normal text-slate-500">/ {company.branches_limit}</span>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Customers</div>
          <div className="text-lg font-black text-white mt-0.5">{usage.customers_count}</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Monthly Orders</div>
          <div className="text-lg font-black text-white mt-0.5">{usage.orders_this_month}</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Storage Used</div>
          <div className="text-lg font-black text-white mt-0.5">
            {company.storage_used_gb.toFixed(1)} <span className="text-xs font-normal text-slate-500">GB</span>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Monthly Fee</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5">
            <CurrencyDisplay amount={company.monthly_fee} />
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Onboarding</div>
          <div className="text-lg font-black text-indigo-400 mt-0.5">{onboarding.overall_progress_pct}%</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-3 text-center">
          <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
            <span>Health</span>
            <button onClick={() => setShowHealthWhy(true)} className="text-slate-500 hover:text-indigo-400" title="Why?">
              <HelpCircle className="h-3 w-3" />
            </button>
          </div>
          <div className={`text-xs font-bold uppercase mt-1 ${isCritical ? 'text-red-400' : isAtRisk ? 'text-amber-400' : 'text-emerald-400'}`}>
            {health.status.replace('_', ' ')}
          </div>
        </Card>
      </div>

      {/* Onboarding Progress Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
              <span>Tenant Onboarding Progress ({onboarding.overall_progress_pct}% Complete)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Verified against live database records and operational activity.
            </CardDescription>
          </div>
          <div className="w-32 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all"
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
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.is_completed ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />
                  )}
                </div>
                <div>
                  <div className={`font-semibold ${step.is_completed ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 10 Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-xs pb-1">
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
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
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
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm text-white font-bold">Organization Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Legal Company Name:</span>
                <span className="font-semibold text-white">{company.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Bengali Name:</span>
                <span className="font-semibold text-white">{company.name_bn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Tenant Slug:</span>
                <span className="font-mono text-indigo-400">{company.slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Primary Printing Hub:</span>
                <span className="font-semibold text-white">{company.hub}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Division / District:</span>
                <span className="font-semibold text-white">{company.division} / {company.district}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Account Created:</span>
                <span className="font-mono text-slate-300">{formatDate(company.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm text-white font-bold">Owner &amp; Billing Contact</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Owner Name:</span>
                <span className="font-semibold text-white">{company.owner_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-mono text-indigo-300">{company.owner_email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-mono text-emerald-400">{company.owner_phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Last Meaningful Activity:</span>
                <span className="font-semibold text-white">{company.last_meaningful_activity.action}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Activity Timestamp:</span>
                <span className="font-mono text-slate-400">{company.last_activity}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold">
              Staff Users ({data.users.length} / {company.users_limit})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">MFA</th>
                  <th className="py-3 px-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-bold text-white">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.mfa_enabled ? (
                        <span className="text-emerald-400 font-bold">Enabled</span>
                      ) : (
                        <span className="text-slate-500">Disabled</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{u.last_login_at || 'Never'}</td>
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
            <Card key={br.id} className="bg-slate-900 border-slate-800 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{br.name}</div>
                {br.is_main && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Main Press Hub
                  </span>
                )}
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>{br.address}</span>
              </div>
              <div className="text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="font-mono text-slate-300">{br.phone}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 4: Usage & Limits */}
      {activeTab === 'usage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-300 flex items-center justify-between">
              <span>User Accounts</span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{usage.users_count} / {usage.users_limit}</div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (usage.users_count / usage.users_limit) * 100)}%` }} />
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-300 flex items-center justify-between">
              <span>Cloud Storage</span>
              <HardDrive className="h-4 w-4 text-pink-400" />
            </div>
            <div className="text-2xl font-black text-white">{usage.storage_used_gb.toFixed(1)} GB / {usage.storage_limit_gb} GB</div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-pink-500 h-full" style={{ width: `${Math.min(100, (usage.storage_used_gb / usage.storage_limit_gb) * 100)}%` }} />
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-300 flex items-center justify-between">
              <span>Orders this Month</span>
              <Layers className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{usage.orders_this_month} / {usage.orders_limit}</div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (usage.orders_this_month / usage.orders_limit) * 100)}%` }} />
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Subscription */}
      {activeTab === 'subscription' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold">Subscription &amp; Invoicing Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Plan Tier:</div>
                <div className="font-bold text-white text-base capitalize">{subscription.plan_name}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Monthly Billing Rate:</div>
                <div className="font-bold text-emerald-400 text-base">
                  <CurrencyDisplay amount={subscription.rate_bdt} /> / mo
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Renewal Date:</div>
                <div className="font-mono text-white font-bold">{formatDate(subscription.current_period_end)}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Payment Method:</div>
                <div className="font-semibold text-white">{subscription.payment_method || 'bKash Merchant'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Features */}
      {activeTab === 'features' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold">Feature Flags &amp; Tenant Overrides</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800 text-xs">
            {data.features.map((f) => (
              <div key={f.flag_id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{f.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{f.key}</div>
                  {f.notes && <div className="text-[10px] text-indigo-400 mt-0.5">Note: {f.notes}</div>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.is_enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  {f.is_enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tab 7: Activity */}
      {activeTab === 'activity' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold">Meaningful Tenant Operations Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800 text-xs">
            {data.activity.map((a) => (
              <div key={a.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{a.description}</div>
                  <div className="text-[11px] text-slate-400">By {a.actor_email}</div>
                </div>
                <span className="font-mono text-slate-400">{a.created_at}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-4 text-center">
            <div className="text-xs text-slate-400">Active Devices / Sessions</div>
            <div className="text-2xl font-black text-white mt-1">{data.security.active_sessions_count}</div>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4 text-center">
            <div className="text-xs text-slate-400">Staff MFA Coverage</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{data.security.mfa_coverage_pct}%</div>
          </Card>
          <Card className="bg-slate-900 border-slate-800 p-4 text-center">
            <div className="text-xs text-slate-400">Failed Logins (7 Days)</div>
            <div className="text-2xl font-black text-white mt-1">{data.security.failed_logins_last_7d}</div>
          </Card>
        </div>
      )}

      {/* Tab 9: Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.integrations.map((it) => (
            <Card key={it.service} className="bg-slate-900 border-slate-800 p-4 space-y-1.5 text-xs">
              <div className="font-bold text-white">{it.name}</div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="uppercase">{it.status}</span>
              </div>
              <div className="text-[10px] text-slate-500">Last event: {it.last_event_at || 'Recently'}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 10: Support Sessions */}
      {activeTab === 'support' && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold">Platform Support Mode History</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800 text-xs">
            {data.support_history.map((s) => (
              <div key={s.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{s.reason}</div>
                  <div className="text-[11px] text-slate-400">Officer: {s.platform_user_email}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-slate-300">{formatDate(s.started_at)}</div>
                  <div className="text-[10px] text-slate-500">{s.duration_minutes} mins duration</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* "Why?" Health Transparency Modal */}
      {showHealthWhy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-indigo-400" />
                <span>Tenant Health Breakdown: {health.status.toUpperCase()}</span>
              </div>
              <button onClick={() => setShowHealthWhy(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Overall Health Score:</span>
                <span className="font-bold font-mono text-lg text-white">{health.score} / 100</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase">Evaluated Factors:</div>
                {health.factors.map((f, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      f.status === 'critical'
                        ? 'bg-red-950/30 border-red-800/60 text-red-200'
                        : f.status === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    }`}
                  >
                    <span className="mt-0.5 font-bold">•</span>
                    <div>
                      <div className="font-bold">{f.label}</div>
                      <div className="text-[11px] opacity-90">{f.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button size="sm" onClick={() => setShowHealthWhy(false)} className="bg-indigo-600 text-white text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Support Mode Dialog */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Enter Support Mode: {company.name}</span>
              </div>
              <button onClick={() => setSupportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200">
                You are about to access this tenant console as an authorized platform technician. All actions will be stamped in audit logs.
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Investigation Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  placeholder="e.g. Assisting owner with Mushak 6.3 VAT rounding calibration..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSupportModalOpen(false)} className="border-slate-700 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!supportReason.trim() || isStartingSupport}
                onClick={handleStartSupport}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                {isStartingSupport ? 'Entering...' : 'Authorize Support Mode'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Dialog */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Change Plan: {company.name}</span>
              </div>
              <button onClick={() => setPlanModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target Plan</label>
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as PlatformPlanCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                >
                  <option value="starter">Starter Press (৳1,999/mo)</option>
                  <option value="business">Business Signage (৳4,999/mo)</option>
                  <option value="enterprise">Enterprise Factory (৳9,999/mo)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="Reason for changing plan tier..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setPlanModalOpen(false)} className="border-slate-700 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!planReason.trim() || isUpdatingPlan}
                onClick={handleChangePlan}
                className="bg-indigo-600 text-white font-bold text-xs"
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
