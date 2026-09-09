'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  CreditCard,
  Check,
  Zap,
  Save,
  CheckCircle2,
  AlertCircle,
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
  Search,
  ChevronRight,
  ChevronDown,
  Trash2,
  Archive,
  RotateCcw,
  ExternalLink,
  Shield,
  HelpCircle,
  TrendingUp,
  Tag,
  Boxes,
  FileSpreadsheet,
  AlertTriangle,
  FolderLock,
  Lock,
  Unlock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
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
import {
  getPlatformPlansAction,
  getPlatformCompaniesAction,
} from '@/actions/platform-data.actions'
import {
  savePlanAction,
  archivePlanAction,
  reactivatePlanAction,
  deletePlanAction,
} from '@/actions/platform.actions'
import { PlatformTenantCompany } from '@/types/platform.types'

const ALL_FEATURES = Object.keys(FEATURE_METADATA) as FeatureCode[]

// Group features by functional domain for rich categorized UI
const FEATURE_CATEGORIES = [
  {
    id: 'sales',
    label: 'Sales, POS & Quotations',
    label_bn: 'সেলস, পিওএস ও কোটেশন',
    color: 'blue',
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'] as FeatureCode[],
  },
  {
    id: 'production',
    label: 'Production, Inventory & Kanban',
    label_bn: 'প্রোডাকশন, ইনভেন্টরি ও কানবান',
    color: 'amber',
    features: ['multi_department', 'inventory', 'inventory_rolls', 'production', 'production_kanban'] as FeatureCode[],
  },
  {
    id: 'management',
    label: 'Management, HR & Job Costing',
    label_bn: 'ম্যানেজমেন্ট, এইচআর ও জব কস্টিং',
    color: 'purple',
    features: ['reports', 'reports_analytics', 'hr', 'hr_payroll', 'job_costing'] as FeatureCode[],
  },
  {
    id: 'advanced',
    label: 'Advanced Enterprise, Automation & SLAs',
    label_bn: 'অ্যাডভান্সড এন্টারপ্রাইজ ও অটোমেশন',
    color: 'emerald',
    features: [
      'whatsapp_notifications',
      'multi_branch',
      'advanced_analytics',
      'advanced_permissions',
      'custom_workflows',
      'api_access',
      'priority_support',
    ] as FeatureCode[],
  },
]

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>(DEFAULT_PLANS)
  const [companies, setCompanies] = useState<PlatformTenantCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'trial' | 'paid' | 'matrix'>('all')

  // Modals state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanRecord | null>(null)
  const [editingLimitsPlan, setEditingLimitsPlan] = useState<SubscriptionPlanRecord | null>(null)
  const [editingTrialModalOpen, setEditingTrialModalOpen] = useState(false)
  const [editingTrialPlan, setEditingTrialPlan] = useState<SubscriptionPlanRecord>(DEFAULT_TRIAL_PLAN)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archive' | 'reactivate' | 'delete'
    plan: SubscriptionPlanRecord
  } | null>(null)

  // New Plan Initial State
  const initialNewPlanState: CreatePlanInput = {
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
  }
  const [newPlan, setNewPlan] = useState<CreatePlanInput>(initialNewPlanState)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Load plans & tenant company distribution
  const loadData = async () => {
    setLoading(true)
    try {
      const [plansRes, compRes] = await Promise.all([
        getPlatformPlansAction(),
        getPlatformCompaniesAction(),
      ])

      if (plansRes.success && plansRes.data && plansRes.data.length > 0) {
        const hasTrial = plansRes.data.some((p) => p.code === 'trial')
        if (!hasTrial) {
          setPlans([DEFAULT_TRIAL_PLAN, ...plansRes.data])
        } else {
          setPlans(plansRes.data)
        }
      } else {
        setPlans(DEFAULT_PLANS)
      }

      if (compRes.success && compRes.data) {
        setCompanies(Array.isArray(compRes.data) ? compRes.data : (compRes.data as any)?.companies || [])
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading subscription plans', 'error')
      setPlans(DEFAULT_PLANS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Derived plan states
  const trialPlan = useMemo(() => {
    return plans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
  }, [plans])

  const paidPlans = useMemo(() => {
    return plans.filter((p) => p.code !== 'trial')
  }, [plans])

  // Count active subscribers per plan code
  const subscriberCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    companies.forEach((comp) => {
      const planCode = comp.plan || (comp.status === 'trial' ? 'trial' : 'starter')
      counts[planCode] = (counts[planCode] || 0) + 1
    })
    return counts
  }, [companies])

  // Filtered plans based on search
  const filteredPaidPlans = useMemo(() => {
    if (!searchQuery.trim()) return paidPlans
    const q = searchQuery.toLowerCase()
    return paidPlans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    )
  }, [paidPlans, searchQuery])

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const activePaid = paidPlans.filter((p) => p.is_active)
    const minPaidPrice = activePaid.length > 0 ? Math.min(...activePaid.map((p) => p.price_monthly)) : 0
    const maxPaidPrice = activePaid.length > 0 ? Math.max(...activePaid.map((p) => p.price_monthly)) : 0
    const totalTenants = companies.length
    const trialTenants = subscriberCounts['trial'] || companies.filter((c) => c.status === 'trial').length
    const paidTenants = totalTenants - trialTenants

    return {
      activePlansCount: plans.filter((p) => p.is_active).length,
      trialDays: trialPlan.trial_days || 14,
      minPrice: minPaidPrice,
      maxPrice: maxPaidPrice,
      totalTenants,
      trialTenants,
      paidTenants,
    }
  }, [plans, paidPlans, trialPlan, companies, subscriberCounts])

  // Preset Applicator for Create / Edit Plan
  const applyPresetToPlan = (
    target: 'new' | 'edit',
    preset: 'starter' | 'business' | 'enterprise' | 'all' | 'clear'
  ) => {
    let features: FeatureCode[] = []
    if (preset === 'starter') {
      features = ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan']
    } else if (preset === 'business') {
      features = [
        'basic_sales',
        'basic_customers',
        'quotation_pdf',
        'delivery_challan',
        'multi_department',
        'inventory',
        'inventory_rolls',
        'production',
        'production_kanban',
        'reports',
        'reports_analytics',
        'hr',
        'hr_payroll',
        'job_costing',
        'whatsapp_notifications',
      ]
    } else if (preset === 'enterprise' || preset === 'all') {
      features = [...ALL_FEATURES]
    } else {
      features = []
    }

    if (target === 'new') {
      setNewPlan((prev) => ({ ...prev, features }))
    } else if (target === 'edit' && editingPlan) {
      setEditingPlan({ ...editingPlan, features })
    }
  }

  // Handle Free Trial Modal Open
  const handleOpenTrialEditor = () => {
    setEditingTrialPlan({ ...trialPlan })
    setEditingTrialModalOpen(true)
  }

  // Save Free Trial Plan
  const handleSaveTrialPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    try {
      const res = await savePlanAction({
        ...editingTrialPlan,
        code: 'trial',
        price_monthly: 0,
        price_yearly: 0,
        is_active: true,
      })

      if (res.success && res.data) {
        const savedData: SubscriptionPlanRecord = res.data
        const updated = plans.map((p) => (p.code === 'trial' ? savedData : p))
        setPlans(updated)
        setEditingTrialModalOpen(false)
        showToast(`Free Trial Plan (${savedData.trial_days || 14} days) configuration saved!`, 'success')
      } else {
        showToast(res.error || 'Failed to update trial plan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save trial plan', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Full Edit Modal Open for Paid/Custom Plan
  const handleOpenEditPlan = (plan: SubscriptionPlanRecord) => {
    setEditingPlan({ ...plan })
  }

  // Save Full Paid/Custom Plan
  const handleSavePaidPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return
    setIsProcessing(true)

    try {
      const res = await savePlanAction(editingPlan)
      if (res.success && res.data) {
        const savedData: SubscriptionPlanRecord = res.data
        const updated = plans.map((p) => (p.id === savedData.id || p.code === savedData.code ? savedData : p))
        setPlans(updated)
        setEditingPlan(null)
        showToast(`Plan "${savedData.name}" updated successfully!`, 'success')
      } else {
        showToast(res.error || 'Failed to update plan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving plan', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Save Quick Resource Limits
  const handleSaveQuickLimits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLimitsPlan) return
    setIsProcessing(true)

    try {
      const res = await savePlanAction(editingLimitsPlan)
      if (res.success && res.data) {
        const savedData: SubscriptionPlanRecord = res.data
        const updated = plans.map((p) => (p.id === savedData.id ? savedData : p))
        setPlans(updated)
        setEditingLimitsPlan(null)
        showToast(`Resource limits updated for "${savedData.name}".`, 'success')
      } else {
        showToast(res.error || 'Failed to update limits', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating limits', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Create New Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlan.name.trim() || !newPlan.code.trim()) {
      showToast('Plan name and unique code are required.', 'error')
      return
    }

    const cleanCode = newPlan.code.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
    if (plans.some((p) => p.code.toLowerCase() === cleanCode)) {
      showToast(`Plan with code "${cleanCode}" already exists.`, 'error')
      return
    }

    setIsProcessing(true)
    try {
      const res = await savePlanAction({
        ...newPlan,
        code: cleanCode as PlanCode,
        sort_order: plans.length + 1,
        is_active: true,
      })

      if (res.success && res.data) {
        setPlans([...plans, res.data])
        setIsCreateOpen(false)
        setNewPlan(initialNewPlanState)
        showToast(`New plan "${res.data.name}" created successfully!`, 'success')
      } else {
        showToast(res.error || 'Failed to create plan', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating plan', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Execute Confirmed Archive / Reactivate / Delete Action
  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction) return
    const { type, plan } = confirmAction
    setIsProcessing(true)

    try {
      if (type === 'archive') {
        const res = await archivePlanAction(plan.id)
        if (res.success) {
          setPlans(plans.map((p) => (p.id === plan.id ? { ...p, is_active: false } : p)))
          showToast(`Plan "${plan.name}" has been archived.`, 'success')
        } else {
          showToast(res.error || 'Failed to archive plan', 'error')
        }
      } else if (type === 'reactivate') {
        const res = await reactivatePlanAction(plan.id)
        if (res.success) {
          setPlans(plans.map((p) => (p.id === plan.id ? { ...p, is_active: true } : p)))
          showToast(`Plan "${plan.name}" has been reactivated!`, 'success')
        } else {
          showToast(res.error || 'Failed to reactivate plan', 'error')
        }
      } else if (type === 'delete') {
        const res = await deletePlanAction(plan.id)
        if (res.success) {
          setPlans(plans.filter((p) => p.id !== plan.id))
          showToast(`Plan "${plan.name}" has been deleted.`, 'success')
        } else {
          showToast(res.error || 'Failed to delete plan', 'error')
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error')
    } finally {
      setIsProcessing(false)
      setConfirmAction(null)
    }
  }

  // Feature Toggle inside Matrix View
  const handleToggleMatrixFeature = async (plan: SubscriptionPlanRecord, feature: FeatureCode) => {
    const hasFeature = plan.features.includes(feature)
    const updatedFeatures = hasFeature
      ? plan.features.filter((f) => f !== feature)
      : [...plan.features, feature]

    const updatedPlan: SubscriptionPlanRecord = { ...plan, features: updatedFeatures }
    const updatedPlans = plans.map((p) => (p.id === plan.id ? updatedPlan : p))
    setPlans(updatedPlans)

    try {
      const res = await savePlanAction(updatedPlan)
      if (res.success) {
        showToast(
          `Module "${FEATURE_METADATA[feature]?.name || feature}" ${hasFeature ? 'removed from' : 'unlocked in'} ${plan.name}`,
          'info'
        )
      } else {
        // Rollback
        setPlans(plans)
        showToast(res.error || 'Failed to update feature gating', 'error')
      }
    } catch {
      setPlans(plans)
      showToast('Failed to synchronize feature update', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            SaaS Architecture &amp; Resource Quotas
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-indigo-400" />
            Plan Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage subscription tiers, Free Trial parameters, BDT rates, 6 configurable quotas, and module access matrix.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenTrialEditor}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 shadow-lg shadow-amber-950/40"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Configure Free Trial
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setNewPlan(initialNewPlanState)
              setIsCreateOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 shadow-lg shadow-indigo-950/40"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create New Plan
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in-0 shadow-lg ${
            notification.type === 'error'
              ? 'bg-rose-950/80 border border-rose-800 text-rose-200'
              : notification.type === 'info'
              ? 'bg-blue-950/80 border border-blue-800 text-blue-200'
              : 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : notification.type === 'info' ? (
              <Info className="h-4 w-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 2. TELEMETRY & STATS SUMMARY TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active SaaS Tiers</div>
            <div className="text-2xl font-black text-white">{telemetry.activePlansCount} Plans</div>
            <div className="text-[11px] text-indigo-400">Total {plans.length} configured</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Free Trial Window</div>
            <div className="text-2xl font-black text-amber-400">{telemetry.trialDays} Days</div>
            <div className="text-[11px] text-amber-300/70">Full module access evaluation</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Commercial Pricing Range</div>
            <div className="text-xl font-black text-emerald-400">
              <CurrencyDisplay amount={telemetry.minPrice} /> - <CurrencyDisplay amount={telemetry.maxPrice} />
            </div>
            <div className="text-[11px] text-emerald-300/70">Monthly BDT / tier</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tenant Distribution</div>
            <div className="text-2xl font-black text-white">{telemetry.totalTenants} Tenants</div>
            <div className="text-[11px] text-slate-400">
              {telemetry.trialTenants} Trial · {telemetry.paidTenants} Commercial
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Building2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            All Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('trial')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'trial'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                : 'text-amber-400/70 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Free Trial ({trialPlan.trial_days || 14}d)
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'paid'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Commercial Tiers ({paidPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-purple-600 text-white shadow'
                : 'text-purple-400/80 hover:text-purple-300 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Comparison Matrix
          </button>
        </div>

        {activeTab !== 'trial' && activeTab !== 'matrix' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
        )}
      </div>

      {/* 4. FREE TRIAL PLAN HERO CARD */}
      {(activeTab === 'all' || activeTab === 'trial') && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl pointer-events-none -z-10" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-900/40 pb-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Free Evaluation Tier
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-amber-200 border border-amber-500/20">
                  {trialPlan.trial_days || 14} Days Duration
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ৳0 / Evaluation
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {subscriberCounts['trial'] || 0} Active Evaluations
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
                <span>{trialPlan.name}</span>
                {trialPlan.name_bn && (
                  <span className="text-xs text-amber-300/80 font-medium">({trialPlan.name_bn})</span>
                )}
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{trialPlan.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleOpenTrialEditor}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 shadow-md flex items-center gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Edit Trial Plan &amp; Quotas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            {/* Limit summary: Users & Branches */}
            <div className="rounded-xl bg-slate-950/90 p-4 border border-amber-900/40 space-y-2.5 shadow-inner">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-400" />
                User &amp; Branch Quota
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max User Seats:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.max_users} seats
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Branches:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.max_branches} branch
                </strong>
              </div>
            </div>

            {/* Limit summary: Storage & Orders */}
            <div className="rounded-xl bg-slate-950/90 p-4 border border-amber-900/40 space-y-2.5 shadow-inner">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-amber-400" />
                Volume &amp; Storage
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Cloud Storage:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.storage_gb} GB
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Monthly Orders:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.monthly_orders.toLocaleString()} orders
                </strong>
              </div>
            </div>

            {/* Limit summary: Customers & Products */}
            <div className="rounded-xl bg-slate-950/90 p-4 border border-amber-900/40 space-y-2.5 shadow-inner">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-amber-400" />
                Directory Limits
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Customers:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.max_customers.toLocaleString()}
                </strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Max Products:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {trialPlan.max_products.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Feature Access Summary */}
            <div className="rounded-xl bg-slate-950/90 p-4 border border-amber-900/40 space-y-2.5 shadow-inner flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Trial Modules
                  </span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded font-bold">
                    {trialPlan.features.length} / {ALL_FEATURES.length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  {trialPlan.features.length === ALL_FEATURES.length
                    ? 'All ERP modules fully unlocked during evaluation.'
                    : `${trialPlan.features.length} modules unlocked for trial evaluation.`}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenTrialEditor}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-2 cursor-pointer"
              >
                Configure Gating Matrix <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. COMMERCIAL PAID PLANS GRID */}
      {(activeTab === 'all' || activeTab === 'paid') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-400" />
              <span>Commercial Paid Subscription Tiers ({filteredPaidPlans.length})</span>
            </div>

            {paidPlans.some((p) => !p.is_active) && (
              <span className="text-[11px] text-slate-500">
                Includes {paidPlans.filter((p) => !p.is_active).length} archived plan(s)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaidPlans.map((plan) => {
              const isArchived = !plan.is_active
              const subscriberCount = subscriberCounts[plan.code] || 0
              const yearlySavings = plan.price_monthly * 12 - plan.price_yearly

              return (
                <Card
                  key={plan.id}
                  className={`bg-slate-900 border-slate-800 flex flex-col justify-between shadow-xl transition-all duration-200 ${
                    isArchived ? 'opacity-65 border-dashed border-slate-700' : 'hover:border-slate-700'
                  }`}
                >
                  <CardHeader className="border-b border-slate-800/80 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                          <span>{plan.name}</span>
                        </CardTitle>
                        {plan.name_bn && (
                          <div className="text-xs text-indigo-300 font-medium">{plan.name_bn}</div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                          {plan.code}
                        </span>
                        {isArchived ? (
                          <Badge variant="outline" className="text-[9px] bg-slate-800 text-slate-400 border-slate-700">
                            Archived
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardDescription className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {plan.description || 'No description provided.'}
                    </CardDescription>

                    {/* Pricing Display */}
                    <div className="pt-3.5 space-y-1">
                      <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1">
                        <CurrencyDisplay amount={plan.price_monthly} />
                        <span className="text-xs text-slate-400 font-normal"> / month</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>or <strong className="text-white"><CurrencyDisplay amount={plan.price_yearly} /></strong> / year</span>
                        {yearlySavings > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                            Save <CurrencyDisplay amount={yearlySavings} />
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4 flex-1">
                    {/* 6 Configurable Limits Grid */}
                    <div className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                          Resource Limits
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingLimitsPlan(plan)}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Quick Edit
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-400" /> Users:</span>
                          <strong className="text-white font-mono">{plan.max_users}</strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" /> Branches:</span>
                          <strong className="text-white font-mono">{plan.max_branches}</strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span className="flex items-center gap-1"><HardDrive className="h-3 w-3 text-slate-400" /> Storage:</span>
                          <strong className="text-white font-mono">{plan.storage_gb} GB</strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-slate-400" /> Orders:</span>
                          <strong className="text-white font-mono">{plan.monthly_orders.toLocaleString()}</strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span>Customers:</span>
                          <strong className="text-white font-mono">{plan.max_customers.toLocaleString()}</strong>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/60">
                          <span>Products:</span>
                          <strong className="text-white font-mono">{plan.max_products.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Features summary badge */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span>Modules Enabled</span>
                        <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/60 font-semibold">
                          {plan.features.length} / {ALL_FEATURES.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                        {plan.features.slice(0, 6).map((f) => (
                          <span
                            key={f}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {FEATURE_METADATA[f]?.name || f}
                          </span>
                        ))}
                        {plan.features.length > 6 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900 font-bold">
                            +{plan.features.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subscriber count */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>Subscribed Tenants:</span>
                      <strong className="text-white font-medium">
                        {subscriberCount} {subscriberCount === 1 ? 'tenant' : 'tenants'}
                      </strong>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-800/80 pt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEditPlan(plan)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 flex-1"
                    >
                      <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                      Edit Plan &amp; Features
                    </Button>

                    {isArchived ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmAction({ type: 'reactivate', plan })}
                        className="border-emerald-800 text-emerald-400 hover:bg-emerald-950/40 text-xs h-8"
                        title="Reactivate Plan"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmAction({ type: 'archive', plan })}
                        className="border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800 text-xs h-8"
                        title="Archive Plan"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {!['starter', 'business', 'enterprise', 'trial'].includes(plan.code.toLowerCase()) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmAction({ type: 'delete', plan })}
                        className="border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs h-8"
                        title="Delete Custom Plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* 6. COMPARISON MATRIX TAB VIEW */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-purple-400" />
              <span>Full Tier Entitlement &amp; Quotas Comparison Matrix</span>
            </div>
            <span className="text-xs text-slate-400">Click any checkmark to toggle module access for that plan.</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80">
                  <th className="p-4 font-bold text-slate-300 min-w-[240px] sticky left-0 bg-slate-950 z-10">
                    Feature / Quota / Module
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="p-4 text-center min-w-[150px]">
                      <div className="font-bold text-white text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {p.code === 'trial' ? (
                          <span className="text-amber-400 font-bold">Free Evaluation ({p.trial_days || 14}d)</span>
                        ) : (
                          <span>
                            <CurrencyDisplay amount={p.price_monthly} /> / mo
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <button
                          onClick={() => (p.code === 'trial' ? handleOpenTrialEditor() : handleOpenEditPlan(p))}
                          className="text-[10px] text-indigo-400 hover:underline font-semibold"
                        >
                          Edit Tier →
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. RESOURCE LIMITS SECTION */}
                <tr className="bg-slate-950/40 font-bold text-slate-300">
                  <td colSpan={plans.length + 1} className="p-3 pl-4 text-xs uppercase tracking-wider text-indigo-400">
                    1. Configurable Resource Limits
                  </td>
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-indigo-400" /> Max User Accounts
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.max_users}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-indigo-400" /> Max Branches &amp; Hubs
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.max_branches}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    <HardDrive className="h-3.5 w-3.5 text-indigo-400" /> Cloud Media Storage
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.storage_gb} GB
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-400" /> Monthly Orders Quota
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.monthly_orders.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    Directory: Max Customers
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.max_customers.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 pl-4 font-medium text-slate-300 sticky left-0 bg-slate-900 z-10 flex items-center gap-2">
                    Directory: Max Products
                  </td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 text-center font-mono font-bold text-slate-200">
                      {p.max_products.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 2. CATEGORIZED FEATURES */}
                {FEATURE_CATEGORIES.map((cat) => (
                  <React.Fragment key={cat.id}>
                    <tr className="bg-slate-950/40 font-bold text-slate-300">
                      <td colSpan={plans.length + 1} className="p-3 pl-4 text-xs uppercase tracking-wider text-indigo-400">
                        2.{cat.id} {cat.label} ({cat.label_bn})
                      </td>
                    </tr>
                    {cat.features.map((feat) => {
                      const meta = FEATURE_METADATA[feat]
                      return (
                        <tr key={feat} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 pl-4 sticky left-0 bg-slate-900 z-10">
                            <div className="font-semibold text-slate-200">{meta?.name || feat}</div>
                            <div className="text-[10px] text-slate-400">{meta?.description}</div>
                          </td>
                          {plans.map((p) => {
                            const isIncluded = p.features.includes(feat)
                            return (
                              <td key={p.id} className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMatrixFeature(p, feat)}
                                  className={`p-1.5 rounded-lg inline-flex items-center justify-center transition-all ${
                                    isIncluded
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-slate-800/40 text-slate-600 hover:text-slate-400 hover:bg-slate-800'
                                  }`}
                                  title={`Click to ${isIncluded ? 'remove from' : 'enable in'} ${p.name}`}
                                >
                                  {isIncluded ? (
                                    <Check className="h-4 w-4 stroke-[3]" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. EDIT TRIAL PLAN MODAL */}
      {editingTrialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Configure Free Trial Plan</h3>
                  <p className="text-xs text-slate-400">
                    Set evaluation duration, 6 resource quotas, and accessible modules for new tenant evaluations.
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
                    value={editingTrialPlan.name_bn || ''}
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
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
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
                      onClick={() => setEditingTrialPlan({ ...editingTrialPlan, features: [...ALL_FEATURES] })}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTrialPlan({
                          ...editingTrialPlan,
                          features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
                        })
                      }
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Reset to Basic
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
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
                          onChange={() => {
                            const updated = isEnabled
                              ? editingTrialPlan.features.filter((f) => f !== feat)
                              : [...editingTrialPlan.features, feat]
                            setEditingTrialPlan({ ...editingTrialPlan, features: updated })
                          }}
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
                  <span>Duration syncs with platform tenant onboarding defaults automatically.</span>
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
                    disabled={isProcessing}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  >
                    {isProcessing ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                    Save Trial Plan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. EDIT PAID / CUSTOM PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Edit Plan: {editingPlan.name}</h3>
                  <p className="text-xs text-slate-400">
                    Configure BDT pricing, resource quotas, and module access permissions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaidPlan} className="space-y-4 text-xs">
              {/* Names & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (English)</Label>
                  <Input
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (বাংলা)</Label>
                  <Input
                    value={editingPlan.name_bn || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name_bn: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 font-semibold">Plan Code</Label>
                  <Input
                    disabled
                    value={editingPlan.code}
                    className="bg-slate-950/60 border-slate-800 text-slate-400 mt-1 h-9 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-slate-300 font-semibold">Description</Label>
                <Input
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white mt-1 h-9"
                />
              </div>

              {/* Pricing in BDT */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-indigo-400" />
                    Commercial BDT Pricing
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingPlan({
                        ...editingPlan,
                        price_yearly: editingPlan.price_monthly * 10,
                      })
                    }
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Auto-apply 2 Months Free (10x Monthly)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-[11px]">Monthly Rate (৳ BDT)</Label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={editingPlan.price_monthly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Yearly Rate (৳ BDT)</Label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={editingPlan.price_yearly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-9 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 6 Configurable Resource Limits */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  Resource Limits &amp; Quotas
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Users</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.max_users}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_users: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Branches</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.max_branches}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_branches: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Storage (GB)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.storage_gb}
                      onChange={(e) => setEditingPlan({ ...editingPlan, storage_gb: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Monthly Orders</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.monthly_orders}
                      onChange={(e) => setEditingPlan({ ...editingPlan, monthly_orders: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Customers</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.max_customers}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_customers: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Products</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPlan.max_products}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_products: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Access Matrix */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                    Feature Access Gating ({editingPlan.features.length} / {ALL_FEATURES.length} Enabled)
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('edit', 'all')}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('edit', 'starter')}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Starter Preset
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('edit', 'business')}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Business Preset
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('edit', 'clear')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {ALL_FEATURES.map((feat) => {
                    const meta = FEATURE_METADATA[feat]
                    const isEnabled = editingPlan.features.includes(feat)
                    return (
                      <label
                        key={feat}
                        className={`flex items-center justify-between p-2 rounded-lg text-[11px] cursor-pointer transition-colors ${
                          isEnabled
                            ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-900/40'
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
                          onChange={() => {
                            const updated = isEnabled
                              ? editingPlan.features.filter((f) => f !== feat)
                              : [...editingPlan.features, feat]
                            setEditingPlan({ ...editingPlan, features: updated })
                          }}
                          className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Status & Sort Order */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="plan-active-check"
                    checked={editingPlan.is_active}
                    onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <Label htmlFor="plan-active-check" className="text-slate-300 font-semibold cursor-pointer">
                    Active Plan (Available for tenant subscriptions)
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-slate-400 text-[11px]">Sort Order</Label>
                  <Input
                    type="number"
                    value={editingPlan.sort_order}
                    onChange={(e) => setEditingPlan({ ...editingPlan, sort_order: Number(e.target.value) })}
                    className="w-16 h-8 text-xs bg-slate-900 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPlan(null)}
                  className="border-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isProcessing ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. QUICK EDIT LIMITS MODAL */}
      {editingLimitsPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Edit Resource Limits: {editingLimitsPlan.name}</span>
              </div>
              <button onClick={() => setEditingLimitsPlan(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLimits} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Max Users</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.max_users}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_users: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Branches</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.max_branches}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_branches: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Cloud Storage (GB)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.storage_gb}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, storage_gb: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Monthly Orders</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.monthly_orders}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, monthly_orders: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Customers</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.max_customers}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_customers: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Max Products</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingLimitsPlan.max_products}
                    onChange={(e) => setEditingLimitsPlan({ ...editingLimitsPlan, max_products: Number(e.target.value) })}
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingLimitsPlan(null)}
                  className="border-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isProcessing ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save Limits
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. CREATE NEW PLAN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Create New SaaS Plan</h3>
                  <p className="text-xs text-slate-400">
                    Define custom tiers, limits, BDT pricing, and module entitlements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              {/* Plan Code & Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Code (Unique Identifier)</Label>
                  <Input
                    required
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') as PlanCode })}
                    placeholder="e.g. agency, pro"
                    className="bg-slate-950 border-slate-700 text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (English)</Label>
                  <Input
                    required
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Agency Plan"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 font-semibold">Plan Name (বাংলা)</Label>
                  <Input
                    value={newPlan.name_bn || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, name_bn: e.target.value })}
                    placeholder="এজেন্সি প্ল্যান"
                    className="bg-slate-950 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-slate-300 font-semibold">Description</Label>
                <Input
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Tailored for printing agencies and production hubs."
                  className="bg-slate-950 border-slate-700 text-white mt-1"
                />
              </div>

              {/* Pricing in BDT */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-indigo-400" />
                    Commercial BDT Pricing
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPlan({
                        ...newPlan,
                        price_yearly: newPlan.price_monthly * 10,
                      })
                    }
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Auto 2 Months Free (10x Monthly)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-[11px]">Monthly Rate (৳ BDT)</Label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={newPlan.price_monthly}
                      onChange={(e) => {
                        const m = Number(e.target.value)
                        setNewPlan({ ...newPlan, price_monthly: m, price_yearly: m * 10 })
                      }}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Yearly Rate (৳ BDT)</Label>
                    <Input
                      type="number"
                      required
                      min={0}
                      value={newPlan.price_yearly}
                      onChange={(e) => setNewPlan({ ...newPlan, price_yearly: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-9 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 6 Configurable Resource Limits */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  Resource Limits &amp; Quotas
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Users</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.max_users}
                      onChange={(e) => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Branches</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.max_branches}
                      onChange={(e) => setNewPlan({ ...newPlan, max_branches: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Storage (GB)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.storage_gb}
                      onChange={(e) => setNewPlan({ ...newPlan, storage_gb: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Monthly Orders</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.monthly_orders}
                      onChange={(e) => setNewPlan({ ...newPlan, monthly_orders: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Customers</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.max_customers}
                      onChange={(e) => setNewPlan({ ...newPlan, max_customers: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px]">Max Products</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newPlan.max_products}
                      onChange={(e) => setNewPlan({ ...newPlan, max_products: Number(e.target.value) })}
                      className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Access Matrix */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                    Feature Access Gating ({newPlan.features.length} / {ALL_FEATURES.length} Enabled)
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('new', 'all')}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('new', 'starter')}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Starter Preset
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('new', 'business')}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-300"
                    >
                      Business Preset
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => applyPresetToPlan('new', 'clear')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {ALL_FEATURES.map((feat) => {
                    const meta = FEATURE_METADATA[feat]
                    const isEnabled = newPlan.features.includes(feat)
                    return (
                      <label
                        key={feat}
                        className={`flex items-center justify-between p-2 rounded-lg text-[11px] cursor-pointer transition-colors ${
                          isEnabled
                            ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-900/40'
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
                          onChange={() => {
                            const updated = isEnabled
                              ? newPlan.features.filter((f) => f !== feat)
                              : [...newPlan.features, feat]
                            setNewPlan({ ...newPlan, features: updated })
                          }}
                          className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isProcessing ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                  Create Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. CONFIRMATION DIALOG (ARCHIVE / REACTIVATE / DELETE) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : confirmAction.type === 'archive'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {confirmAction.type === 'delete' ? (
                  <Trash2 className="h-5 w-5" />
                ) : confirmAction.type === 'archive' ? (
                  <Archive className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white text-base capitalize">
                  {confirmAction.type} Plan: {confirmAction.plan.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {confirmAction.type === 'delete'
                    ? 'This will permanently remove this custom tier. This action cannot be undone.'
                    : confirmAction.type === 'archive'
                    ? 'Archiving hides this plan from new signups. Existing tenants will remain on this plan.'
                    : 'Reactivating makes this plan available again for all new tenant signups.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction(null)}
                className="border-slate-700 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isProcessing}
                onClick={handleExecuteConfirmedAction}
                className={`text-white font-bold text-xs ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : confirmAction.type === 'archive'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isProcessing ? (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                Confirm {confirmAction.type.charAt(0).toUpperCase() + confirmAction.type.slice(1)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
