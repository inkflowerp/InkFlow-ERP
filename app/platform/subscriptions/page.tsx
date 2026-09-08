'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Building2,
  Sliders,
  DollarSign,
  RefreshCw,
  X,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { getPlatformCompaniesAction } from '@/actions/platform-data.actions'
import { PlatformTenantCompany, PlatformPlanCode, PlatformCompanyStatus } from '@/types/platform.types'
import { changeCompanyPlanAction, updateCompanyStatusAction } from '@/actions/platform.actions'

export default function PlatformSubscriptionsPage() {
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Edit Subscription Dialog
  const [editingCompany, setEditingCompany] = useState<PlatformTenantCompany | null>(null)
  const [targetPlan, setTargetPlan] = useState<PlatformPlanCode>('business')
  const [targetStatus, setTargetStatus] = useState<PlatformCompanyStatus>('active')
  const [planReason, setPlanReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Notifications
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    const res = await getPlatformCompaniesAction()
    if (res.success && res.data) {
      setCompanies(Array.isArray(res.data) ? res.data : (res.data?.companies || []))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCompany) return
    setIsSaving(true)

    // Apply plan change if changed
    if (editingCompany.plan !== targetPlan) {
      await changeCompanyPlanAction(editingCompany.id, targetPlan, planReason || 'Subscription governance update')
    }

    // Apply status change if changed
    if (editingCompany.status !== targetStatus) {
      await updateCompanyStatusAction(editingCompany.id, targetStatus, planReason || 'Status update')
    }

    showNotification(`Subscription settings updated for "${editingCompany.name}".`)
    setEditingCompany(null)
    setPlanReason('')
    setIsSaving(false)
    loadData()
  }

  // Calculations
  const activeSubs = companies.filter((c) => c.status === 'active')
  const totalMrr = activeSubs.reduce((acc, c) => acc + c.monthly_fee, 0)
  const totalArr = totalMrr * 12
  const pastDueCount = companies.filter((c) => c.status === 'past_due').length
  const suspendedCount = companies.filter((c) => c.status === 'suspended').length
  const trialCount = companies.filter((c) => c.status === 'trial').length

  const filtered = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            SaaS Subscriptions &amp; Recurring Revenue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-emerald-400" />
            Subscription Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Oversee tenant billing plans, MRR revenue metrics, expiry alerts, and quota overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/platform/billing"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span>Billing Reconciliation</span>
          </Link>

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

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Monthly Recurring (MRR)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            <CurrencyDisplay amount={totalMrr} />
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ARR: <CurrencyDisplay amount={totalArr} />
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Active Paid Tenants</span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{activeSubs.length}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">
            {companies.length} total registered
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Free Trials Active</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{trialCount}</div>
          <div className="text-[11px] text-cyan-400 mt-0.5">14-day evaluation</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Attention Needed</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {pastDueCount + suspendedCount}
          </div>
          <div className="text-[11px] text-amber-400 mt-0.5">
            {pastDueCount} Past Due • {suspendedCount} Suspended
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Subscriptions', count: companies.length },
            { id: 'active', label: 'Active', count: activeSubs.length },
            { id: 'trial', label: 'Trial', count: trialCount },
            { id: 'past_due', label: 'Past Due', count: pastDueCount },
            { id: 'suspended', label: 'Suspended', count: suspendedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-slate-950 border-slate-800 text-white"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tenant Company</th>
                <th className="py-3 px-4">Plan &amp; Interval</th>
                <th className="py-3 px-4">Rate (BDT)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Usage Limits</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/platform/companies/${c.id}`} className="font-bold text-white hover:text-indigo-400 text-sm">
                      {c.name}
                    </Link>
                    <div className="text-[11px] font-mono text-indigo-400">{c.slug}.printerp.com.bd</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {c.plan}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        ({c.billing_interval})
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-white">
                    <CurrencyDisplay amount={c.monthly_fee} />
                    <span className="text-[10px] text-slate-400 font-normal"> /mo</span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : c.status === 'trial'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : c.status === 'past_due'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-300">
                    <div>{c.users_count}/{c.users_limit} users • {c.branches_count}/{c.branches_limit} branches</div>
                    <div className="text-[10px] text-slate-500">{c.storage_used_gb} GB / {c.storage_limit_gb} GB storage</div>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-400">
                    {c.last_activity}
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCompany(c)
                        setTargetPlan(c.plan)
                        setTargetStatus(c.status)
                      }}
                      className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      <Sliders className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Subscription Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                <span>Subscription Settings: {editingCompany.name}</span>
              </div>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Plan Tier</label>
                <select
                  value={targetPlan}
                  onChange={(e) => setTargetPlan(e.target.value as PlatformPlanCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white capitalize font-semibold"
                >
                  <option value="starter">Starter Plan (৳1,999/mo)</option>
                  <option value="business">Business Plan (৳4,999/mo)</option>
                  <option value="enterprise">Enterprise Plan (৳9,999/mo)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Subscription State</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as PlatformCompanyStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white capitalize font-semibold"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  placeholder="Audit justification for modification..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCompany(null)}
                  className="border-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
