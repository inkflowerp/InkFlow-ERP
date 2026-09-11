'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  Save,
  Building,
  Briefcase,
  User,
  History,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import {
  PermissionModule,
  PermissionAction,
  DataScope,
  MODULE_ACTION_SPECS,
  ACTION_LABELS,
  ResponsibilitySlug,
  AuditLogRecord,
} from '@/types/rbac.types'
import {
  DEFAULT_RESPONSIBILITY_MATRICES,
  getPermissionDetail,
  extractResponsibilities,
  normalizeResponsibilitySlug,
} from '@/lib/auth/rbac.client'
import { updateUserAccessAndPermissionsAction } from '@/actions/company-users.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { cn } from '@/lib/utils'

const ALL_RESPONSIBILITIES: { slug: ResponsibilitySlug; name: string; nameBn: string; desc: string }[] = [
  { slug: 'business_owner', name: 'Business Owner', nameBn: 'ব্যবসার মালিক', desc: 'Full company-level control across all modules' },
  { slug: 'sales_manager', name: 'Sales Manager', nameBn: 'সেলস ম্যানেজার', desc: 'Quotations, pricing, invoices, orders & customers' },
  { slug: 'designer', name: 'Graphic Designer', nameBn: 'গ্রাফিক ডিজাইনার', desc: 'Prepress proofs, customer designs, job orders & proofs' },
  { slug: 'production_manager', name: 'Production Manager', nameBn: 'প্রোডাকশন ম্যানেজার', desc: 'Factory queues, job stages, stock & machine assignments' },
  { slug: 'operator', name: 'Machine Operator', nameBn: 'মেশিন অপারেটর', desc: 'Assigned print jobs, start/complete stages & inventory view' },
  { slug: 'store_manager', name: 'Store Manager', nameBn: 'স্টোর ম্যানেজার', desc: 'Raw material inventory, stock adjustments & requisitions' },
  { slug: 'accountant', name: 'Accountant', nameBn: 'হিসাবরক্ষক', desc: 'Invoices, money receipts (MR), payments & P&L reports' },
  { slug: 'delivery_coordinator', name: 'Delivery Coordinator', nameBn: 'ডেলিভারি সমন্বয়কারী', desc: 'Challans, transport dispatch, site installations' },
  { slug: 'general_staff', name: 'General Staff', nameBn: 'সাধারণ কর্মী', desc: 'Basic job status and assigned tasks viewing' },
]

interface UserPermissionsDrawerProps {
  user: CompanyUserWithProfile | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  allBranches: BranchRow[]
  allRoles: RoleRow[]
}

export function UserPermissionsDrawer({
  user,
  isOpen,
  onClose,
  onSaved,
  companyId,
  allBranches,
}: UserPermissionsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [dataScopes, setDataScopes] = useState<Record<string, DataScope>>({})
  const [department, setDepartment] = useState<string>('')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'permissions' | 'responsibilities'>('permissions')

  // Initial load when user opens
  useEffect(() => {
    if (!user) return

    const initialResp =
      user.responsibilities && user.responsibilities.length > 0
        ? user.responsibilities
        : user.roles?.map((r) => r.slug || 'general_staff') || ['general_staff']

    setSelectedResponsibilities(initialResp)
    setOverrides(user.overrides || {})
    setDataScopes(user.data_scopes || {})
    setDepartment(user.department || '')
    setBranchId(user.branch_id || null)

    // Expand all modules by default
    const allExpanded: Record<string, boolean> = {}
    Object.keys(MODULE_ACTION_SPECS).forEach((k) => {
      allExpanded[k] = true
    })
    setExpandedModules(allExpanded)
    setSuccessMsg(null)
    setErrorMsg(null)
  }, [user, isOpen])

  // Check if dirty (unsaved changes)
  const isDirty = useMemo(() => {
    if (!user) return false
    const origResp = JSON.stringify(user.responsibilities || [user.roles?.[0]?.slug || 'general_staff'])
    const curResp = JSON.stringify(selectedResponsibilities)
    const origOverrides = JSON.stringify(user.overrides || {})
    const curOverrides = JSON.stringify(overrides)
    const origScopes = JSON.stringify(user.data_scopes || {})
    const curScopes = JSON.stringify(dataScopes)
    const origDept = user.department || ''
    const origBranch = user.branch_id || null

    return (
      origResp !== curResp ||
      origOverrides !== curOverrides ||
      origScopes !== curScopes ||
      origDept !== department ||
      origBranch !== branchId
    )
  }, [user, selectedResponsibilities, overrides, dataScopes, department, branchId])

  if (!isOpen || !user) return null

  // User context for real-time permission evaluation
  const simulatedUserCtx = {
    userId: user.user_id,
    role: user.roles?.[0]?.slug,
    responsibilities: selectedResponsibilities,
    overrides,
    data_scopes: dataScopes,
  }

  // Filter modules
  const filteredModuleEntries = Object.entries(MODULE_ACTION_SPECS).filter(([modKey, spec]) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      modKey.toLowerCase().includes(q) ||
      spec.label.toLowerCase().includes(q) ||
      spec.labelBn.toLowerCase().includes(q) ||
      spec.description.toLowerCase().includes(q) ||
      spec.actions.some((a) => a.toLowerCase().includes(q) || ACTION_LABELS[a]?.label.toLowerCase().includes(q))
    )
  })

  // Handlers
  const toggleAction = (module: PermissionModule, action: PermissionAction) => {
    const code = `${module}.${action}`
    const detail = getPermissionDetail(simulatedUserCtx, module, action)
    const currentlyGranted = detail.isGranted

    const nextOverrides = { ...overrides }

    if (detail.source === 'inherited') {
      // Inherited is TRUE -> User explicitly DENIES it
      nextOverrides[code] = false
    } else if (detail.source === 'override_deny') {
      // It was explicitly denied -> remove override (reverts to inherited TRUE)
      delete nextOverrides[code]
    } else if (detail.source === 'override_allow') {
      // It was explicitly allowed -> remove override (reverts to default FALSE)
      delete nextOverrides[code]
    } else if (detail.source === 'default_deny') {
      // It was default denied -> user explicitly ALLOWS it
      nextOverrides[code] = true
    } else {
      // Fallback toggle
      nextOverrides[code] = !currentlyGranted
    }

    setOverrides(nextOverrides)
  }

  const resetModuleOverrides = (module: PermissionModule) => {
    const spec = MODULE_ACTION_SPECS[module]
    const nextOverrides = { ...overrides }
    spec.actions.forEach((a) => {
      delete nextOverrides[`${module}.${a}`]
    })
    delete nextOverrides[`${module}.full_control`]
    setOverrides(nextOverrides)

    const nextScopes = { ...dataScopes }
    delete nextScopes[module]
    setDataScopes(nextScopes)
  }

  const toggleResponsibility = (slug: string) => {
    let next: string[]
    if (selectedResponsibilities.includes(slug)) {
      next = selectedResponsibilities.filter((s) => s !== slug)
      if (next.length === 0) next = ['general_staff']
    } else {
      next = [...selectedResponsibilities, slug]
    }
    setSelectedResponsibilities(next)
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await updateUserAccessAndPermissionsAction({
        companyUserId: user.id,
        companyId,
        responsibilities: selectedResponsibilities,
        overrides,
        dataScopes,
        department: department || null,
        branchId,
        actorName: 'Admin',
      })

      if (res.success) {
        setSuccessMsg(res.message || 'Permissions updated successfully.')
        setTimeout(() => {
          onSaved()
          setSuccessMsg(null)
        }, 1200)
      } else {
        setErrorMsg(res.message || 'Failed to update permissions.')
      }
    } catch {
      setErrorMsg('An unexpected error occurred while saving permissions.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenAudit = () => {
    setAuditLogs([])
    setIsAuditModalOpen(true)
  }

  const handleResetToUserInitial = () => {
    const initialResp =
      user.responsibilities && user.responsibilities.length > 0
        ? user.responsibilities
        : user.roles?.map((r) => r.slug || 'general_staff') || ['general_staff']

    setSelectedResponsibilities(initialResp)
    setOverrides(user.overrides || {})
    setDataScopes(user.data_scopes || {})
    setDepartment(user.department || '')
    setBranchId(user.branch_id || null)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {(user.profile?.full_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {user.profile?.full_name || user.invited_email}
                    </h2>
                    {user.status === 'active' ? (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-4">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                        {user.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {user.profile?.email || user.invited_email} • {user.profile?.phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAudit}
                  className="h-8 text-xs text-slate-600 dark:text-slate-300"
                  title="View Permission Audit Log"
                >
                  <History className="mr-1 h-3.5 w-3.5" />
                  Audit
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Department & Branch Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Department / Floor
                </label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Pre-Press & Design"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Assigned Branch
                </label>
                <select
                  value={branchId || ''}
                  onChange={(e) => setBranchId(e.target.value || null)}
                  className="w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
                >
                  <option value="">All Branches / Central HQ</option>
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer',
                  activeTab === 'permissions'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                )}
              >
                Module Access & Permissions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('responsibilities')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5',
                  activeTab === 'responsibilities'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                )}
              >
                <span>Assigned Responsibilities</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {selectedResponsibilities.length}
                </span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Feedback Banners */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-800 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 animate-in fade-in-0">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {activeTab === 'responsibilities' ? (
              /* TAB 1: RESPONSIBILITIES ASSIGNMENT */
              <div className="space-y-3">
                <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Multi-Responsibility Role System</p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                      Users receive the combined permissions of all assigned responsibilities. You can also customize individual overrides per module.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {ALL_RESPONSIBILITIES.map((r) => {
                    const isSelected = selectedResponsibilities.includes(r.slug)

                    return (
                      <div
                        key={r.slug}
                        onClick={() => toggleResponsibility(r.slug)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3',
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                            )}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                {r.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({r.nameBn})
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {r.desc}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px]">
                            Assigned
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* TAB 2: MODULE ACCESS & OVERRIDES */
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search module (e.g. Customers, Invoices, Production)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Precedence Legend */}
                <div className="flex flex-wrap items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Legend:</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Inherited Allowed
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    User Override (Allow)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    User Override (Deny)
                  </span>
                </div>

                {/* Module Cards */}
                <div className="space-y-3">
                  {filteredModuleEntries.map(([_modKey, spec]) => {
                    const modName = spec.module
                    const isExpanded = Boolean(expandedModules[modName])
                    const currentScope = dataScopes[modName] || spec.defaultScope

                    // Calculate active granted permissions count
                    const grantedCount = spec.actions.filter((act) => {
                      const detail = getPermissionDetail(simulatedUserCtx, modName, act)
                      return detail.isGranted
                    }).length

                    return (
                      <div
                        key={modName}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs"
                      >
                        {/* Module Card Header */}
                        <div
                          onClick={() =>
                            setExpandedModules({
                              ...expandedModules,
                              [modName]: !isExpanded,
                            })
                          }
                          className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {spec.label}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({spec.labelBn})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {spec.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-2 py-0 h-5 font-semibold',
                                grantedCount > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500'
                              )}
                            >
                              {grantedCount}/{spec.actions.length} Allowed
                            </Badge>

                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Module Expanded Settings */}
                        {isExpanded && (
                          <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800/80">
                            {/* Data Scope Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  Data Scope for {spec.label}:
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  Controls which records the user can access within this module.
                                </p>
                              </div>

                              <select
                                value={currentScope}
                                onChange={(e) =>
                                  setDataScopes({
                                    ...dataScopes,
                                    [modName]: e.target.value as DataScope,
                                  })
                                }
                                className="h-7 px-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                              >
                                <option value="own">Own (Created by user)</option>
                                <option value="assigned">Assigned (Assigned to user / own)</option>
                                <option value="department">Department</option>
                                <option value="company">Entire Company / Branch</option>
                              </select>
                            </div>

                            {/* Actions Checkboxes Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {spec.actions.map((act) => {
                                const detail = getPermissionDetail(simulatedUserCtx, modName, act)
                                const isGranted = detail.isGranted

                                let sourceBadge: React.ReactNode
                                if (detail.source === 'override_allow') {
                                  sourceBadge = (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                      Override (Allow)
                                    </span>
                                  )
                                } else if (detail.source === 'override_deny') {
                                  sourceBadge = (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                      Override (Deny)
                                    </span>
                                  )
                                } else if (detail.source === 'inherited') {
                                  sourceBadge = (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      Inherited
                                    </span>
                                  )
                                } else {
                                  sourceBadge = (
                                    <span className="text-[9px] text-slate-400">
                                      Denied
                                    </span>
                                  )
                                }

                                return (
                                  <div
                                    key={act}
                                    onClick={() => toggleAction(modName, act)}
                                    className={cn(
                                      'p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2',
                                      isGranted
                                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20'
                                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30'
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={() => {}} // Handled by container onClick
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <div>
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                          {ACTION_LABELS[act]?.label || act}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {ACTION_LABELS[act]?.labelBn || ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div>{sourceBadge}</div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Reset Module Overrides Action */}
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => resetModuleOverrides(modName as PermissionModule)}
                                className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reset {spec.label} Overrides to Defaults
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Save / Action Bar */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <div>
              {isDirty ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Unsaved permission changes</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>All permissions synced</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              {isDirty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToUserInitial}
                  disabled={isSaving}
                  className="h-10 sm:h-9 text-xs flex-1 sm:flex-initial"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="h-10 sm:h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 shadow-sm font-semibold flex-1 sm:flex-initial"
              >
                {isSaving ? (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-4 w-4" />
                    Save Access & Permissions
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Modal */}
      <ModalDialog
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
        title={`Audit Trail: ${user.profile?.full_name || 'User'}`}
        description="Chronological record of responsibility and permission changes."
      >
        <div className="max-h-96 overflow-y-auto space-y-3 pt-2">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              No previous permission changes recorded for this user yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Changed by: <strong className="text-slate-700 dark:text-slate-300">{log.actorName}</strong></span>
                  <span>{new Date(log.createdAt).toLocaleString('en-BD')}</span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white capitalize">
                  {log.actionType.replace(/_/g, ' ')}
                </div>
                {log.details && (
                  <pre className="text-[10px] bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700/60 overflow-x-auto text-slate-600 dark:text-slate-300">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </ModalDialog>
    </>
  )
}
