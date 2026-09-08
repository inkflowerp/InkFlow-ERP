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

export default function CustomerSuccessPage() {
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
        <div className="h-10 w-72 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Adoption, Retention &amp; Churn Prevention
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="h-7 w-7 text-amber-400" />
            Customer Success &amp; Lifecycle
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor printing tenant onboarding, identify churn risks before cancellation, and guide trial conversions.
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

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Active Trials</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{data.trials_ending_soon.length}</div>
          <div className="text-[11px] text-cyan-400 mt-1">In 14-day evaluation window</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Inactive (&gt;7 Days)</span>
            <UserX className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">{data.inactive_tenants.length}</div>
          <div className="text-[11px] text-amber-400 mt-1">No orders or invoices logged</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>At-Risk Accounts</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">{data.at_risk_tenants.length}</div>
          <div className="text-[11px] text-red-400 mt-1">Billing or storage alerts</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>High-Growth Accounts</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{data.high_growth_tenants.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">&gt;20% monthly order surge</div>
        </Card>
      </div>

      {/* 1. Trial Ending Soon Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-base text-white font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>Free Evaluation Trials ({data.trials_ending_soon.length})</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Tenants evaluating PrintERP. Check feature adoption and assist conversion to paid plans.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800">
          {data.trials_ending_soon.map(({ company, trial_day, total_days, expires_in_days, features_used, last_meaningful_activity }) => (
            <div key={company.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-800/30 transition-colors">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/platform/companies/${company.id}`} className="font-bold text-white hover:text-indigo-400 text-sm">
                    {company.name}
                  </Link>
                  <span className="font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                    Day {trial_day} / {total_days}
                  </span>
                </div>

                <div className="text-slate-400 flex items-center gap-2 flex-wrap text-[11px]">
                  <span>Owner: <strong className="text-slate-200">{company.owner_name}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong className="text-emerald-400 font-mono">{company.owner_phone}</strong></span>
                  <span>•</span>
                  <span>Orders: <strong className="text-white font-mono">{company.orders_this_month}</strong></span>
                  <span>•</span>
                  <span>Storage: <strong className="text-white font-mono">{company.storage_used_gb} GB</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] pt-1">
                  <span className="text-slate-500">Features Adopted:</span>
                  {features_used.map((f) => (
                    <span key={f} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right mr-2">
                  <div className="font-bold text-amber-300">Expires in {expires_in_days} days</div>
                  <div className="text-[10px] text-slate-500 font-mono">Last active: {company.last_activity}</div>
                </div>

                <Link
                  href={`/platform/companies/${company.id}`}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Open Company 360 →
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 2. Inactive Tenants Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-base text-white font-bold flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-400" />
            <span>Inactive Tenants (No Meaningful Activity for 7+ Days)</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Monitoring mechanism for churn detection. Does NOT automatically suspend accounts.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800 text-xs">
          {data.inactive_tenants.map(({ company, days_inactive, last_meaningful_activity }) => (
            <div key={company.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link href={`/platform/companies/${company.id}`} className="font-bold text-white text-sm hover:text-indigo-400">
                    {company.name}
                  </Link>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                    {company.plan}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Owner: {company.owner_name} ({company.owner_phone}) • {company.hub}
                </div>
                <div className="text-[11px] text-amber-400">
                  Last meaningful operation: {last_meaningful_activity}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <div className="font-bold text-red-400 text-sm">{days_inactive} Days</div>
                  <div className="text-[10px] text-slate-500">Inactive</div>
                </div>

                <Link
                  href={`/platform/companies/${company.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
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
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span>At-Risk Accounts ({data.at_risk_tenants.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800 text-xs">
            {data.at_risk_tenants.map(({ company, risk_score, reasons }) => (
              <div key={company.id} className="p-3.5 space-y-1 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <Link href={`/platform/companies/${company.id}`} className="font-bold text-white hover:text-indigo-300">
                    {company.name}
                  </Link>
                  <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
                    Risk {risk_score}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  {reasons.map((r, i) => (
                    <div key={i} className="text-amber-300/90">• {r}</div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* High Growth Accounts */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>High-Growth Accounts ({data.high_growth_tenants.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-800 text-xs">
            {data.high_growth_tenants.map(({ company, growth_rate_pct, order_volume }) => (
              <div key={company.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div>
                  <Link href={`/platform/companies/${company.id}`} className="font-bold text-white hover:text-emerald-300">
                    {company.name}
                  </Link>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {order_volume.toLocaleString()} orders logged this month • {company.plan.toUpperCase()}
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">
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
