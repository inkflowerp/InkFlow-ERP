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
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformDashboardOverviewAction } from '@/actions/platform-data.actions'
import { PlatformDashboardMetrics, NeedsAttentionItem } from '@/types/platform.types'

export default function PlatformDashboardPage() {
  const [data, setData] = useState<(PlatformDashboardMetrics & { needs_attention: NeedsAttentionItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d'>('30d')

  const loadData = async () => {
    setLoading(true)
    const res = await getPlatformDashboardOverviewAction()
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
        <div className="h-10 w-72 bg-slate-800/80 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 5.1 HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Platform Control Center • Bangladesh SaaS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Activity className="h-7 w-7 text-indigo-400" />
            Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor tenants, subscriptions, platform health, and critical activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['today', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  dateRange === r ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Link
            href="/platform/companies"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Companies</span>
          </Link>
        </div>
      </div>

      {/* 5.2 NEEDS ATTENTION (Top Priority Section) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Needs Attention
            </h2>
            {data.needs_attention.length > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                {data.needs_attention.length} Actionable
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                0 Issues
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium">Prioritized by severity</span>
        </div>

        {data.needs_attention.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 flex items-center gap-3 text-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold">✓ Everything is operating normally.</div>
              <div className="text-emerald-400/80 text-[11px]">All tenant subscriptions are current and system health is optimal.</div>
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
                      ? 'bg-red-950/30 border-red-800/60 shadow-lg shadow-red-950/30'
                      : isWarn
                      ? 'bg-amber-950/25 border-amber-800/60'
                      : 'bg-indigo-950/25 border-indigo-800/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                          isCrit
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                    </div>

                    <div className="font-bold text-sm text-white">{item.title}</div>
                    {(item.tenant_name || item.system_name) && (
                      <div className="text-xs font-semibold text-slate-300">
                        {item.tenant_name ? `Tenant: ${item.tenant_name}` : `System: ${item.system_name}`}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.reason}</p>
                  </div>

                  <Link
                    href={item.action_href}
                    className={`inline-flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isCrit
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30'
                        : isWarn
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Core Platform Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Active Companies</span>
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{data.active_companies}</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> of {data.total_companies} total
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Monthly Recurring</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">
              <CurrencyDisplay amount={data.revenue_mrr} />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              ARR: <CurrencyDisplay amount={data.revenue_arr} />
            </div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Free Trials</span>
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{data.trial_companies}</div>
            <div className="text-[10px] text-cyan-400 mt-1 font-semibold">14-day trials</div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Past Due / Risk</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1.5">{data.past_due_companies}</div>
            <div className="text-[10px] text-amber-400 mt-1">Renewal failed</div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Orders Processed</span>
              <Layers className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{data.orders_count.toLocaleString()}</div>
            <div className="text-[10px] text-purple-400 mt-1">Live this month</div>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800 p-4">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Cloud Storage</span>
              <HardDrive className="h-3.5 w-3.5 text-pink-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1.5">
              {data.storage_used_gb > 0 ? `${data.storage_used_gb.toFixed(2)} GB` : '0 GB'}
            </div>
            <div className="text-[10px] text-pink-400 mt-1 font-semibold">
              {data.storage_total_gb > 0
                ? `${((data.storage_used_gb / data.storage_total_gb) * 100).toFixed(1)}% of ${
                    data.storage_total_gb >= 1000
                      ? `${(data.storage_total_gb / 1000).toFixed(0)} TB`
                      : `${data.storage_total_gb} GB`
                  }`
                : '0 GB allocated'}
            </div>
          </Card>
        </div>
      </div>

      {/* 5.4 COMPANY HEALTH & 5.5 SUBSCRIPTION SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Health Breakdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Company Health Breakdown</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Rule-based health monitoring across all tenants.
              </CardDescription>
            </div>
            <Link
              href="/platform/companies"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View Directory →
            </Link>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Link
                href="/platform/companies?health=healthy"
                className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900/30 transition-colors"
              >
                <div className="text-xs font-bold text-emerald-400 uppercase">Healthy</div>
                <div className="text-2xl font-black text-white mt-1">
                  {data.company_health_breakdown?.healthy ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Good standing</div>
              </Link>

              <Link
                href="/platform/companies?health=at_risk"
                className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 hover:bg-amber-900/30 transition-colors"
              >
                <div className="text-xs font-bold text-amber-400 uppercase">At Risk</div>
                <div className="text-2xl font-black text-amber-300 mt-1">
                  {data.company_health_breakdown?.at_risk ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Near limits/slow</div>
              </Link>

              <Link
                href="/platform/companies?health=critical"
                className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 hover:bg-red-900/30 transition-colors"
              >
                <div className="text-xs font-bold text-red-400 uppercase">Critical</div>
                <div className="text-2xl font-black text-red-300 mt-1">
                  {data.company_health_breakdown?.critical ?? 0}
                </div>
                <div className="text-[10px] text-slate-400">Delinquent</div>
              </Link>

              <Link
                href="/platform/companies?status=suspended"
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/60 transition-colors"
              >
                <div className="text-xs font-bold text-slate-400 uppercase">Suspended</div>
                <div className="text-2xl font-black text-white mt-1">
                  {data.company_health_breakdown?.suspended ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Access locked</div>
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Platform Health Engine evaluates subscription, storage %, recent errors, and meaningful activity.</span>
              <Link href="/platform/customer-success" className="text-indigo-400 hover:underline font-semibold shrink-0 ml-2">
                Customer Success →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Summary */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Subscription Tiers &amp; Revenue</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                SaaS revenue distribution across Bangladesh printing hubs.
              </CardDescription>
            </div>
            <Link
              href="/platform/subscriptions"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Manage Subscriptions →
            </Link>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              {data.subscription_metrics.map((tier) => (
                <div
                  key={tier.plan_code}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white">{tier.plan_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                      {tier.plan_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">{tier.active_subscribers} tenants</span>
                    <div className="font-mono font-bold text-emerald-400 text-right">
                      <CurrencyDisplay amount={tier.mrr_bdt} /> / mo
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Total Monthly Recurring (MRR)</span>
              <span className="text-sm font-mono font-black text-white">
                <CurrencyDisplay amount={data.revenue_mrr} />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5.6 PLATFORM HEALTH TELEMETRY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-pink-400" />
            <span>Platform Service Health Status</span>
          </h2>
          <Link href="/platform/health" className="text-xs text-indigo-400 hover:underline font-semibold">
            Inspect Full Telemetry →
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
              ? 'text-emerald-400'
              : isDeg
              ? 'text-amber-400'
              : isFail
              ? 'text-red-400'
              : isStandby
              ? 'text-cyan-400'
              : 'text-slate-400'

            const dotBg = isOp
              ? 'bg-emerald-400'
              : isDeg
              ? 'bg-amber-400'
              : isFail
              ? 'bg-red-400'
              : isStandby
              ? 'bg-cyan-400'
              : 'bg-slate-500'

            const label = isNotConf
              ? 'Not Configured'
              : isStandby
              ? 'Standby'
              : svc.status.charAt(0).toUpperCase() + svc.status.slice(1)

            return (
              <div
                key={svc.name}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition-colors"
                title={svc.notes || `${svc.name}: ${label}`}
              >
                <div className="text-[11px] font-bold text-slate-300 truncate" title={svc.name}>{svc.name}</div>
                <div className={`text-[10px] font-semibold flex items-center justify-center gap-1 ${color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dotBg}`} />
                  <span className="truncate">{label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5.7 RECENT PLATFORM ACTIVITY */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <FileClock className="h-4 w-4 text-cyan-400" />
              <span>Recent Privileged Platform Activity</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Immutable audit ledger of recent administrative operations.
            </CardDescription>
          </div>
          <Link
            href="/platform/audit"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Full Audit Log →
          </Link>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800">
          {(data.recent_audit_logs && data.recent_audit_logs.length > 0) ? (
            data.recent_audit_logs.map((act) => (
              <div key={act.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold">{act.action}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-semibold text-white">{act.target_company_name || act.entity_type || 'Platform'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {act.reason || act.details?.description || act.details?.note || (typeof act.details === 'object' && Object.keys(act.details).length > 0 ? JSON.stringify(act.details).slice(0, 80) : 'Administrative action executed')}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-[11px] text-slate-400">
                    {new Date(act.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                  <div className="text-[10px] text-slate-500">{act.actor_email}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No recent administrative actions recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
