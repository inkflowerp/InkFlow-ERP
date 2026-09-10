'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sliders,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  Info,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Lock,
  Search,
  Users,
  Briefcase,
  Printer,
  Package,
  UserCheck,
  Shield,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { getPlatformRBACTemplatesAction } from '@/actions/platform-data.actions'
import { updateRBACTemplatePermissionAction } from '@/actions/platform.actions'
import { PlatformRBACTemplate, PermissionActionKey } from '@/types/platform.types'

const ACTIONS: { key: PermissionActionKey; label: string; color: string; desc: string }[] = [
  { key: 'view', label: 'View', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', desc: 'Read & search data' },
  { key: 'create', label: 'Create', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: 'Add new records' },
  { key: 'edit', label: 'Edit', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: 'Modify existing records' },
  { key: 'delete', label: 'Delete', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: 'Permanent removal' },
  { key: 'approve', label: 'Approve', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30', desc: 'Authorize & certify' },
  { key: 'full_control', label: 'Full Control', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', desc: 'Master admin overrides' },
]

interface ResourceMeta {
  label: string
  name_bn: string
  category: 'commercial' | 'production' | 'procurement' | 'hr' | 'governance'
  desc: string
  icon: any
}

const RESOURCE_CAT_LABELS: Record<string, string> = {
  all: 'All Modules (14)',
  commercial: 'Commercial & Sales (5)',
  production: 'Production Floor (2)',
  procurement: 'Stock & Vendors (3)',
  hr: 'HR & Personnel (2)',
  governance: 'Governance & Config (2)',
}

const RESOURCE_LABELS: Record<string, ResourceMeta> = {
  customer: {
    label: 'Customer Directory',
    name_bn: 'কাস্টমার ডিরেক্টরি',
    category: 'commercial',
    desc: 'Customer accounts, credit limits, bKash/bank ledgers, and contact directory',
    icon: Users,
  },
  quotation: {
    label: 'Estimates & Quotations',
    name_bn: 'কোটেশন ও দর প্রস্তাব',
    category: 'commercial',
    desc: 'Paper cost estimators, machine markup, profit margins, and formal PDF quotes',
    icon: FileSpreadsheet,
  },
  order: {
    label: 'Job Orders & Booking',
    name_bn: 'জব অর্ডার ও বুকিং',
    category: 'commercial',
    desc: 'Order ticketing, printing specs, artwork attachments, and prepress proofing queue',
    icon: Briefcase,
  },
  invoice: {
    label: 'Invoices & Billing',
    name_bn: 'ইনভয়েস ও বিলিং',
    category: 'commercial',
    desc: 'Sales invoices, Mushak 6.3 VAT tax challans, and POS counter thermal receipts',
    icon: Layers,
  },
  payment: {
    label: 'Payments & Collections',
    name_bn: 'পেমেন্ট ও কালেকশন',
    category: 'commercial',
    desc: 'bKash, Nagad, cash counter, bank EFTN deposits, and bad debt write-offs',
    icon: CheckCircle2,
  },
  production: {
    label: 'Production Floor',
    name_bn: 'প্রোডাকশন ফ্লোর',
    category: 'production',
    desc: 'Offset & digital press runs, finishing, binding, cutting, and operator schedules',
    icon: Printer,
  },
  delivery: {
    label: 'Delivery & Challans',
    name_bn: 'ডেলিভারি ও চালান',
    category: 'production',
    desc: 'Official delivery gatepass, vehicle dispatch, driver tracking, and site handovers',
    icon: Package,
  },
  inventory: {
    label: 'Material Inventory',
    name_bn: 'কাঁচামাল ও ইনভেন্টরি',
    category: 'procurement',
    desc: 'Paper sheets/reams, vinyl rolls, ink cartridges, plates, and low-stock alerts',
    icon: Package,
  },
  purchase: {
    label: 'Stock Purchases',
    name_bn: 'পারচেজ ও ক্রয়',
    category: 'procurement',
    desc: 'Supplier purchase orders, material GRN intake, and vendor bill accounting',
    icon: Briefcase,
  },
  supplier: {
    label: 'Supplier Accounts',
    name_bn: 'সাপ্লায়ার একাউন্টস',
    category: 'procurement',
    desc: 'Paper merchant directory (Naya Bazar, Arambagh, Banglabazar) & balance ledger',
    icon: Building2,
  },
  hr: {
    label: 'HR & Personnel',
    name_bn: 'এইচআর ও কর্মী',
    category: 'hr',
    desc: 'Staff directory, biometric attendance logs, press shift rosters, and leave requests',
    icon: UserCheck,
  },
  payroll: {
    label: 'Salary & Payroll',
    name_bn: 'বেতন ও পে-রোল',
    category: 'hr',
    desc: 'Monthly press worker salaries, hourly overtime, and advance loan deductions',
    icon: FileSpreadsheet,
  },
  reports: {
    label: 'Reports & Analytics',
    name_bn: 'রিপোর্ট ও অ্যানালিটিক্স',
    category: 'governance',
    desc: 'Executive P&L statements, sales breakdowns, substrate wastage audit, and NBR VAT reports',
    icon: ShieldCheck,
  },
  settings: {
    label: 'Company Settings',
    name_bn: 'কোম্পানি সেটিংস',
    category: 'governance',
    desc: 'Challan sequence numbering, VAT registration rates, branches, and fiscal years',
    icon: Sliders,
  },
}

export default function PlatformPermissionsPage() {
  const [templates, setTemplates] = useState<PlatformRBACTemplate[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('sales_manager')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await getPlatformRBACTemplatesAction()
      if (res.success && res.data) {
        setTemplates(res.data)
      } else {
        showNotification(res.error || 'Failed to load RBAC templates from database.', 'error')
      }
    } catch {
      showNotification('Network error loading templates.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.slug === selectedSlug) || templates[0]
  }, [templates, selectedSlug])

  // Count active permissions for a template
  const getActivePermsCount = (tmpl?: PlatformRBACTemplate) => {
    if (!tmpl?.permissions) return 0
    return Object.values(tmpl.permissions).reduce((acc, curr) => {
      return acc + Object.values(curr || {}).filter(Boolean).length
    }, 0)
  }

  const totalPossiblePerms = Object.keys(RESOURCE_LABELS).length * ACTIONS.length // 14 * 6 = 84

  const handleToggle = async (resource: string, action: PermissionActionKey) => {
    if (!currentTemplate) return

    const currentVal = currentTemplate.permissions[resource]?.[action] || false
    const newVal = !currentVal

    // Optimistic UI update
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.slug !== currentTemplate.slug) return t
        const updatedPerms = { ...t.permissions }
        if (!updatedPerms[resource]) {
          updatedPerms[resource] = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            approve: false,
            full_control: false,
          }
        }
        updatedPerms[resource] = {
          ...updatedPerms[resource],
          [action]: newVal,
        }
        return { ...t, permissions: updatedPerms }
      })
    )

    // Call server action
    try {
      const res = await updateRBACTemplatePermissionAction(currentTemplate.slug, resource, action, newVal)
      if (!res.success) {
        showNotification(res.error || 'Failed to update permission.', 'error')
      }
    } catch {
      showNotification('Failed to sync permission update.', 'error')
    }
  }

  const handleGrantAllForResource = async (resource: string, grant: boolean) => {
    if (!currentTemplate) return

    setTemplates((prev) =>
      prev.map((t) => {
        if (t.slug !== currentTemplate.slug) return t
        const updatedPerms = { ...t.permissions }
        updatedPerms[resource] = {
          view: grant,
          create: grant,
          edit: grant,
          delete: grant,
          approve: grant,
          full_control: grant,
        }
        return { ...t, permissions: updatedPerms }
      })
    )

    for (const a of ACTIONS) {
      await updateRBACTemplatePermissionAction(currentTemplate.slug, resource, a.key, grant)
    }

    showNotification(
      `${grant ? 'Granted' : 'Revoked'} all actions for ${RESOURCE_LABELS[resource]?.label || resource}.`
    )
  }

  const handleBatchRoleAction = async (mode: 'grant_view' | 'grant_all' | 'revoke_all') => {
    if (!currentTemplate) return

    setSaving(true)
    try {
      const newPerms: Record<string, Record<PermissionActionKey, boolean>> = {}

      Object.keys(RESOURCE_LABELS).forEach((resKey) => {
        newPerms[resKey] = {
          view: mode === 'grant_view' || mode === 'grant_all',
          create: mode === 'grant_all',
          edit: mode === 'grant_all',
          delete: mode === 'grant_all',
          approve: mode === 'grant_all',
          full_control: mode === 'grant_all',
        }
      })

      setTemplates((prev) =>
        prev.map((t) => (t.slug === currentTemplate.slug ? { ...t, permissions: newPerms } : t))
      )

      for (const [resKey, actionMap] of Object.entries(newPerms)) {
        for (const [action, isAllowed] of Object.entries(actionMap)) {
          await updateRBACTemplatePermissionAction(
            currentTemplate.slug,
            resKey,
            action as PermissionActionKey,
            isAllowed
          )
        }
      }

      showNotification(
        mode === 'grant_view'
          ? `Granted View-Only access across all modules for ${currentTemplate.name}.`
          : mode === 'grant_all'
          ? `Granted Full Access across all modules for ${currentTemplate.name}.`
          : `Revoked all permissions (Zero-Trust) for ${currentTemplate.name}.`
      )
    } catch {
      showNotification('Failed to apply batch permission update.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      if (currentTemplate) {
        for (const [resource, actionMap] of Object.entries(currentTemplate.permissions)) {
          for (const [action, isAllowed] of Object.entries(actionMap)) {
            await updateRBACTemplatePermissionAction(
              currentTemplate.slug,
              resource,
              action as PermissionActionKey,
              isAllowed
            )
          }
        }
      }
      showNotification(`Role template matrix for "${currentTemplate?.name || 'RBAC'}" saved to root database.`)
    } catch {
      showNotification('Failed to save templates.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Filter resources
  const filteredResources = useMemo(() => {
    return Object.entries(RESOURCE_LABELS).filter(([key, meta]) => {
      // Category match
      if (categoryFilter !== 'all' && meta.category !== categoryFilter) {
        return false
      }
      // Search query match
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        key.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.name_bn.toLowerCase().includes(q) ||
        meta.desc.toLowerCase().includes(q)
      )
    })
  }, [categoryFilter, searchQuery])

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Platform Sub-Navigation */}
      <PlatformSettingsNav />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Shield className="h-3.5 w-3.5" />
            Security &amp; Authorization Matrix
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Sliders className="h-7 w-7 text-indigo-400" />
            Platform RBAC &amp; Role Templates
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global authorization blueprints automatically cloned and provisioned to every newly onboarded printing press tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadTemplates}
            disabled={loading || saving}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Template Matrix
          </Button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-0 duration-200 border ${
            notification.type === 'error'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
              : notification.type === 'info'
              ? 'bg-sky-950/60 text-sky-300 border-sky-800'
              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">System Role Presets</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{templates.length || 6}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Seeded across all organizations</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Governed Modules</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">14</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Commercial, press, stock, &amp; HR</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Action Dimensions</span>
            <Sliders className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">6</div>
          <p className="text-[11px] text-slate-400 mt-0.5">View, Create, Edit, Del, Appr, Full</p>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Security Model</span>
            <ShieldCheck className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">Fail-Closed</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Explicit authorization required</p>
        </Card>
      </div>

      {/* Role Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            Select System Role Preset to Inspect &amp; Configure
          </h2>
          {currentTemplate && (
            <span className="text-xs text-slate-400 font-mono">
              Active Coverage:{' '}
              <strong className="text-indigo-400 font-bold">
                {getActivePermsCount(currentTemplate)} / {totalPossiblePerms}
              </strong>{' '}
              ({Math.round((getActivePermsCount(currentTemplate) / totalPossiblePerms) * 100)}%)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {templates.map((tmpl) => {
            const isSelected = tmpl.slug === selectedSlug
            const count = getActivePermsCount(tmpl)
            const pct = Math.round((count / totalPossiblePerms) * 100)

            return (
              <button
                key={tmpl.slug}
                type="button"
                onClick={() => setSelectedSlug(tmpl.slug)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-900/40 via-slate-900 to-violet-900/30 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs truncate">{tmpl.name}</span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-xs shadow-indigo-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400/90 truncate font-medium">{tmpl.name_bn}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>{count} perms</span>
                    <span className={pct > 50 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct >= 80 ? 'bg-indigo-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Current Template Header & Quick Batch Toolbar */}
      {currentTemplate && (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800 pb-4 bg-slate-950/60">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>{currentTemplate.name}</span>
                      <span className="text-xs text-indigo-400 font-normal">
                        ({currentTemplate.name_bn})
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-0.5">
                      {currentTemplate.description}
                    </CardDescription>
                  </div>
                </div>
              </div>

              {/* Role Quick Batch Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchRoleAction('grant_view')}
                  disabled={saving}
                  className="h-8 text-[11px] font-semibold border-slate-800 bg-slate-900 text-sky-400 hover:bg-sky-950/40 hover:border-sky-800"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" />
                  Grant View-Only
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchRoleAction('grant_all')}
                  disabled={saving}
                  className="h-8 text-[11px] font-semibold border-slate-800 bg-slate-900 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-800"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Grant Full Access
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchRoleAction('revoke_all')}
                  disabled={saving}
                  className="h-8 text-[11px] font-semibold border-slate-800 bg-slate-900 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800"
                >
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Zero-Trust Clear
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 mt-4">
              <div className="flex items-center gap-2 w-full sm:w-80">
                <Input
                  icon={<Search className="h-4 w-4 text-slate-400" />}
                  placeholder="Search modules, bills, challans, or specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {Object.entries(RESOURCE_CAT_LABELS).map(([catKey, catLabel]) => {
                  const isActive = categoryFilter === catKey
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategoryFilter(catKey)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border ${
                        isActive
                          ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-xs'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {catLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>

          {/* Matrix Table */}
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-80">Resource Domain &amp; Bengali Label</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="py-3.5 px-3 text-center min-w-[90px]">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${a.color}`}>
                          {a.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-normal lowercase mt-0.5 hidden sm:inline">
                          {a.desc}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-right min-w-[110px]">Quick Row Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                      <p className="font-semibold text-sm text-slate-300">No matching resource domains found</p>
                      <p className="text-xs text-slate-400 mt-1">Try clearing your search query or switching categories.</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery('')
                          setCategoryFilter('all')
                        }}
                        className="mt-3 text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        Reset Search Filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredResources.map(([resourceKey, meta]) => {
                    const Icon = meta.icon || Layers
                    const resourcePerms = currentTemplate.permissions[resourceKey] || {
                      view: false,
                      create: false,
                      edit: false,
                      delete: false,
                      approve: false,
                      full_control: false,
                    }

                    const allGranted = ACTIONS.every((a) => resourcePerms[a.key])
                    const activeCount = ACTIONS.filter((a) => resourcePerms[a.key]).length

                    return (
                      <tr key={resourceKey} className="hover:bg-slate-850/40 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 mt-0.5 group-hover:text-indigo-400 transition-colors">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{meta.label}</span>
                                <span className="text-[10px] text-indigo-400/80 font-medium">
                                  ({meta.name_bn})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{meta.desc}</div>
                            </div>
                          </div>
                        </td>

                        {ACTIONS.map((actionItem) => {
                          const isAllowed = resourcePerms[actionItem.key] || false
                          return (
                            <td key={actionItem.key} className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggle(resourceKey, actionItem.key)}
                                className={`h-8 w-8 rounded-xl inline-flex items-center justify-center transition-all ${
                                  isAllowed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-xs shadow-emerald-500/20'
                                    : 'bg-slate-950 text-slate-600 border border-slate-800 hover:text-slate-400 hover:border-slate-700'
                                }`}
                                title={`${isAllowed ? 'Revoke' : 'Grant'} ${actionItem.label} on ${meta.label}`}
                              >
                                {isAllowed ? (
                                  <Check className="h-4 w-4 stroke-[2.5]" />
                                ) : (
                                  <X className="h-3.5 w-3.5 opacity-30" />
                                )}
                              </button>
                            </td>
                          )
                        })}

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGrantAllForResource(resourceKey, !allGranted)}
                            className={`h-7 text-[11px] px-2.5 font-semibold transition-all ${
                              allGranted
                                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {allGranted ? 'Revoke All' : activeCount === 0 ? 'Grant All' : 'Grant All'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Governance & Inheritance Architecture Info */}
      <Card className="bg-slate-950/60 border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-slate-200 text-sm">Tenant RBAC Inheritance &amp; Multi-Tenant Isolation</h3>
            <p className="text-slate-400 leading-relaxed">
              When a new printing enterprise registers on InkFlow ERP, the platform cloning worker creates localized role copies for their organization based on these exact blueprints. Tenant Business Owners can subsequently grant customized roles to local counter staff and press operators without mutating the platform system root template.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Zero-Trust Default
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Lock className="h-3.5 w-3.5" />
                System Roles Read-Only for Tenants
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <Building2 className="h-3.5 w-3.5" />
                Tenant Custom Roles Supported
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
