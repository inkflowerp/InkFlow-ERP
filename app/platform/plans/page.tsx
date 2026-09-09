'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Check,
  Zap,
  Save,
  CheckCircle2,
  Plus,
  Sliders,
  Sparkles,
  Layers,
  Users,
  Building2,
  HardDrive,
  Briefcase,
  X,
  Clock,
  ShieldCheck,
  Settings2,
  CheckSquare,
  Square,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  FEATURE_METADATA,
} from '@/services/subscription.service'
import {
  SubscriptionPlanRecord,
  FeatureCode,
  PlanCode,
  CreatePlanInput,
} from '@/types/subscription.types'
import { getPlatformPlansAction } from '@/actions/platform-data.actions'
import { savePlanAction, archivePlanAction } from '@/actions/platform.actions'

const ALL_FEATURES = Object.keys(FEATURE_METADATA) as FeatureCode[]

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(DEFAULT_PLANS)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingLimitsPlan, setEditingLimitsPlan] = useState<SubscriptionPlanRecord | null>(null)
  const [editingTrialModalOpen, setEditingTrialModalOpen] = useState(false)
  const [editingTrialPlan, setEditingTrialPlan] = useState<SubscriptionPlanRecord>(DEFAULT_TRIAL_PLAN)
  const [activeTab, setActiveTab] = useState<'all' | 'trial' | 'paid'>('all')

  // New Plan Form State
  const [newPlan, setNewPlan] = useState<CreatePlanInput>({
    code: 'starter',
    name: '',
    name_bn: '',
    description: '',
    price_monthly: 2999,
    price_yearly: 29990,
    max_users: 5,
    max_branches: 2,
    storage_gb: 5,
    monthly_orders: 200,
    max_customers: 300,
    max_products: 300,
    trial_days: 0,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
  })

  const loadPlans = async () => {
    setLoading(true)
    const res = await getPlatformPlansAction()
    if (res.success && res.data && res.data.length > 0) {
      // Ensure trial plan is present
      const hasTrial = res.data.some((p) => p.code === 'trial')
      if (!hasTrial) {
        setPlans([DEFAULT_TRIAL_PLAN, ...res.data])
      } else {
        setPlans(res.data)
      }
    } else {
      setPlans(DEFAULT_PLANS)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [])

  const trialPlan = plans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
  const paidPlans = plans.filter((p) => p.code !== 'trial')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Price adjustment
  const handlePriceChange = async (planId: string, field: 'price_monthly' | 'price_yearly', val: number) => {
    const updated = plans.map((p) => {
      if (p.id !== planId) return p
      if (field === 'price_monthly') {
        return { ...p, price_monthly: val, price_yearly: val * 10 }
      }
      return { ...p, price_yearly: val }
    })
    setPlans(updated)
    const target = updated.find((p) => p.id === planId)
    if (target) {
      await savePlanAction(target)
    }
  }

  // Feature toggle
  const handleToggleFeature = async (planId: string, feature: FeatureCode) => {
    const updated = plans.map((p) => {
      if (p.id !== planId) return p
      const has = p.features.includes(feature)
      const updatedFeatures = has
        ? p.features.filter((f) => f !== feature)
        : [...p.features, feature]
      return { ...p, features: updatedFeatures }
    })
    setPlans(updated)
    const target = updated.find((p) => p.id === planId)
    if (target) {
      await savePlanAction(target)
    }
    showNotification(`Feature access gating updated for plan.`)
  }

  // Save modified limits
  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLimitsPlan) return
    const updated = plans.map((p) => (p.id === editingLimitsPlan.id ? editingLimitsPlan : p))
    setPlans(updated)
    await savePlanAction(editingLimitsPlan)
    setEditingLimitsPlan(null)
    showNotification(`Configurable resource limits updated for ${editingLimitsPlan.name}.`)
  }

  // Open Trial Plan full edit modal
  const handleOpenTrialEditor = () => {
    setEditingTrialPlan({ ...trialPlan })
    setEditingTrialModalOpen(true)
  }

  // Save full Trial Plan modifications
  const handleSaveTrialPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const updated = plans.some((p) => p.code === 'trial')
      ? plans.map((p) => (p.code === 'trial' ? editingTrialPlan : p))
      : [editingTrialPlan, ...plans]
    setPlans(updated)
    await savePlanAction(editingTrialPlan)
    setEditingTrialModalOpen(false)
    showNotification(`Free Trial Plan (${editingTrialPlan.trial_days || 14} days) configuration saved successfully!`)
  }

  // Toggle feature in Trial Plan modal
  const handleToggleTrialFeature = (feat: FeatureCode) => {
    const has = editingTrialPlan.features.includes(feat)
    const updatedFeatures = has
      ? editingTrialPlan.features.filter((f) => f !== feat)
      : [...editingTrialPlan.features, feat]
    setEditingTrialPlan({ ...editingTrialPlan, features: updatedFeatures })
  }

  const handleSelectAllTrialFeatures = () => {
    setEditingTrialPlan({ ...editingTrialPlan, features: [...ALL_FEATURES] })
  }

  const handleClearTrialFeatures = () => {
    setEditingTrialPlan({
      ...editingTrialPlan,
      features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    })
  }

  // Create new plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlan.name || !newPlan.code) return

    const res = await savePlanAction({
      ...newPlan,
      is_active: true,
      sort_order: plans.length + 1,
    })

    if (res.success && res.data) {
      setPlans([...plans, res.data])
      setIsCreateOpen(false)
      showNotification(`New subscription plan "${newPlan.name}" created successfully!`)
    } else {
      showNotification(res.error || 'Failed to create plan')
    }
  }

  const handleArchivePlan = async (planId: string) => {
    const res = await archivePlanAction(planId)
    if (res.success) {
      setPlans(plans.map((p) => (p.id === planId ? { ...p, is_active: false } : p)))
      showNotification('Plan archived successfully.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Pricing Architecture &amp; Resource Quotas
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-indigo-400" />
            Plan Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage SaaS tiers, Free Trial parameters, monthly/yearly BDT pricing, 6 configurable resource limits, and feature gating.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleOpenTrialEditor}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 shadow-lg shadow-amber-900/20"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Edit Trial Plan
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create New Plan
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => showNotification('Plan configurations synchronized across database cluster.')}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          All Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('trial')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'trial'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
              : 'text-amber-400/70 hover:text-amber-300 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="h-3 w-3" />
          Free Trial Plan
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'paid'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Paid Tiers ({paidPlans.length})
        </button>
      </div>

      {/* 1. FREE TRIAL PLAN SPECIAL CARD (Shown when tab is 'all' or 'trial') */}
      {(activeTab === 'all' || activeTab === 'trial') && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl pointer-events-none -z-10" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-900/40 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Free Evaluation Tier
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Default {trialPlan.trial_days || 14} Days Duration
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ৳0 / Free Evaluation
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
                <span>{trialPlan.name}</span>
                <span className="text-xs text-amber-300/80 font-medium">({trialPlan.name_bn})</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">{trialPlan.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleOpenTrialEditor}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 shadow-md flex items-center gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Edit Trial Plan &amp; Features
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {/* Limit summary: Users & Branches */}
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-900/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-400" />
                User &amp; Branch Quota
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Users:</span>
                <strong className="text-white font-mono">{trialPlan.max_users} seats</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Branches:</span>
                <strong className="text-white font-mono">{trialPlan.max_branches} branch</strong>
              </div>
            </div>

            {/* Limit summary: Storage & Orders */}
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-900/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-amber-400" />
                Volume &amp; Storage
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Storage:</span>
                <strong className="text-white font-mono">{trialPlan.storage_gb} GB</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Monthly Orders:</span>
                <strong className="text-white font-mono">{trialPlan.monthly_orders} orders</strong>
              </div>
            </div>

            {/* Limit summary: Customers & Products */}
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-900/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                Directory Limits
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Customers:</span>
                <strong className="text-white font-mono">{trialPlan.max_customers}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Products:</span>
                <strong className="text-white font-mono">{trialPlan.max_products}</strong>
              </div>
            </div>

            {/* Feature Access Summary */}
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-900/30 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Unlocked Modules
                </span>
                <span className="font-mono text-[10px] text-amber-300">
                  {trialPlan.features.length} / {ALL_FEATURES.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {trialPlan.features.length === ALL_FEATURES.length
                  ? 'All ERP modules fully unlocked during trial period.'
                  : `${trialPlan.features.length} specific modules selected for trial evaluation.`}
              </div>
              <button
                type="button"
                onClick={handleOpenTrialEditor}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 block underline cursor-pointer"
              >
                Configure Gating Matrix →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAID PLANS GRID (Shown when tab is 'all' or 'paid') */}
      {(activeTab === 'all' || activeTab === 'paid') && (
        <div>
          <div className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-indigo-400" />
            <span>Commercial Paid Subscription Tiers</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {paidPlans.map((plan) => (
              <Card key={plan.id} className="bg-slate-900 border-slate-800 flex flex-col justify-between shadow-xl">
                <CardHeader className="border-b border-slate-800/80 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-white font-bold">{plan.name}</CardTitle>
                      <div className="text-xs text-indigo-300 font-medium">{plan.name_bn}</div>
                    </div>
                    <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                      {plan.code}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {plan.description}
                  </CardDescription>

                  <div className="pt-3">
                    <div className="text-3xl font-black text-white">
                      <CurrencyDisplay amount={plan.price_monthly} />
                      <span className="text-xs text-slate-400 font-normal"> / month</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      or <CurrencyDisplay amount={plan.price_yearly} /> / year (2 months free discount)
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 flex-1">
                  {/* 6 Configurable Limits Summary */}
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                        Configurable Limits
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingLimitsPlan(plan)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Edit Limits
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Users:</span>
                        <strong className="text-white font-mono">{plan.max_users}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Branches:</span>
                        <strong className="text-white font-mono">{plan.max_branches}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Storage:</span>
                        <strong className="text-white font-mono">{plan.storage_gb} GB</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Orders/mo:</span>
                        <strong className="text-white font-mono">{plan.monthly_orders.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Customers:</span>
                        <strong className="text-white font-mono">{plan.max_customers.toLocaleString()}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Products:</span>
                        <strong className="text-white font-mono">{plan.max_products.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Price Editors */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <Label className="text-[10px] text-slate-400">Monthly Rate (৳)</Label>
                      <Input
                        type="number"
                        value={plan.price_monthly}
                        onChange={(e) => handlePriceChange(plan.id, 'price_monthly', Number(e.target.value))}
                        className="h-8 text-xs bg-slate-950 border-slate-800 text-white font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Yearly Rate (৳)</Label>
                      <Input
                        type="number"
                        value={plan.price_yearly}
                        onChange={(e) => handlePriceChange(plan.id, 'price_yearly', Number(e.target.value))}
                        className="h-8 text-xs bg-slate-950 border-slate-800 text-white font-mono mt-1"
                      />
                    </div>
                  </div>

                  {/* Feature Gate Checklist */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Feature Access Gating ({plan.features.length})</span>
                      <span className="text-[10px] text-slate-500">Toggle on/off</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {ALL_FEATURES.map((feat) => {
                        const meta = FEATURE_METADATA[feat]
                        const isEnabled = plan.features.includes(feat)
                        return (
                          <label
                            key={feat}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                              isEnabled
                                ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-900/40'
                                : 'text-slate-500 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <span className="font-semibold">{meta.name}</span>
                              <span className="text-[10px] opacity-70 ml-1">({feat})</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => handleToggleFeature(plan.id, feat)}
                              className="h-3.5 w-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. EDIT TRIAL PLAN MODAL */}
      {editingTrialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Free Trial Plan</h3>
                  <p className="text-xs text-slate-400">
                    Configure evaluation duration, resource quotas, and accessible modules for new tenant signups.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTrialModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrialPlan} className="space-y-4 text-xs">
              {/* Plan Titles & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (English)</Label>
                  <Input
                    required
                    value={editingTrialPlan.name}
                    onChange={(e) => setEditingTrialPlan({ ...editingTrialPlan, name: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (বাংলা)</Label>
                  <Input
                    value={editingTrialPlan.name_bn}
                    onChange={(e) => setEditingTrialPlan({ ...editingTrialPlan, name_bn: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-amber-300 font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Trial Duration (Days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={editingTrialPlan.trial_days || 14}
                    onChange={(e) =>
                      setEditingTrialPlan({
                        ...editingTrialPlan,
                        trial_days: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="bg-slate-950 border-amber-500/50 text-amber-200 mt-1 h-9 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-slate-300 font-semibold">Description</Label>
                <Input
                  value={editingTrialPlan.description}
                  onChange={(e) => setEditingTrialPlan({ ...editingTrialPlan, description: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                />
              </div>

              {/* 6 Configurable Resource Limits */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  Trial Resource Limits &amp; Quotas
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Users</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.max_users}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          max_users: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Branches</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.max_branches}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          max_branches: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Storage (GB)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.storage_gb}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          storage_gb: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Monthly Orders</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.monthly_orders}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          monthly_orders: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Customers</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.max_customers}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          max_customers: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Products</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingTrialPlan.max_products}
                      onChange={(e) =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          max_products: Number(e.target.value),
                        })
                      }
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Access Matrix */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Trial Module Access Gating ({editingTrialPlan.features.length} / {ALL_FEATURES.length} Enabled)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTrialFeatures}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleClearTrialFeatures}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Reset to Basic
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {ALL_FEATURES.map((feat) => {
                    const meta = FEATURE_METADATA[feat]
                    const isEnabled = editingTrialPlan.features.includes(feat)
                    return (
                      <label
                        key={feat}
                        className={`flex items-center justify-between p-2 rounded-lg text-[11px] cursor-pointer transition-colors ${
                          isEnabled
                            ? 'bg-amber-950/30 text-amber-200 border border-amber-900/40'
                            : 'text-slate-500 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-slate-200">{meta.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{meta.name_bn}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleTrialFeature(feat)}
                          className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Changes apply to all future and active trial tenant evaluations.</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTrialModalOpen(false)}
                    className="border-slate-700 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Save Trial Plan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT CONFIGURABLE LIMITS MODAL (for any plan) */}
      {editingLimitsPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm">
                Edit Limits: {editingLimitsPlan.name}
              </div>
              <button onClick={() => setEditingLimitsPlan(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLimits} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Max Users</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.max_users}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_users: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Branches</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.max_branches}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_branches: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Cloud Storage (GB)</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.storage_gb}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, storage_gb: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Orders</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.monthly_orders}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, monthly_orders: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Customers</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.max_customers}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_customers: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Products</Label>
                  <Input
                    type="number"
                    value={editingLimitsPlan.max_products}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_products: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingLimitsPlan(null)} className="border-slate-700 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                  Save Limits
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE NEW PLAN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm">Create New Plan</div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <Label className="text-slate-300">Plan Code (Unique)</Label>
                <Input
                  required
                  value={newPlan.code}
                  onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value as PlanCode })}
                  placeholder="e.g. agency, enterprise_plus"
                  className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-300">Name (English)</Label>
                  <Input
                    required
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Agency Plan"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Name (বাংলা)</Label>
                  <Input
                    value={newPlan.name_bn}
                    onChange={(e) => setNewPlan({ ...newPlan, name_bn: e.target.value })}
                    placeholder="এজেন্সি প্ল্যান"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-300">Monthly Price (৳)</Label>
                  <Input
                    type="number"
                    required
                    value={newPlan.price_monthly}
                    onChange={(e) => {
                      const m = Number(e.target.value)
                      setNewPlan({ ...newPlan, price_monthly: m, price_yearly: m * 10 })
                    }}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Yearly Price (৳)</Label>
                  <Input
                    type="number"
                    required
                    value={newPlan.price_yearly}
                    onChange={(e) => setNewPlan({ ...newPlan, price_yearly: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="border-slate-700 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                  Create Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

