'use client'

import React, { useState, useMemo } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  User,
  Layers,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Building,
  Briefcase,
  FileCheck2,
  Download,
  Eye,
  Sliders,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MODULE_ACTION_SPECS,
  ACTION_LABELS,
  PermissionModule,
  PermissionAction,
  DataScope,
  ResponsibilitySlug,
} from '@/types/rbac.types'
import {
  getPermissionDetail,
  extractResponsibilities,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '@/lib/auth/rbac.client'
import type { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { cn } from '@/lib/utils'

interface PermissionSimulatorProps {
  users: CompanyUserWithProfile[]
  roles: RoleRow[]
  branches: BranchRow[]
  companySlug: string
  onEditUserPermissions?: (user: CompanyUserWithProfile) => void
}

const HIGH_RISK_ACTIONS: { code: string; module: PermissionModule; action: PermissionAction; label: string; desc: string }[] = [
  { code: 'invoices.cancel', module: 'invoices', action: 'cancel', label: 'Cancel Invoices', desc: 'Void issued commercial & tax invoices' },
  { code: 'invoices.delete', module: 'invoices', action: 'delete', label: 'Delete Invoices', desc: 'Permanently remove billing records' },
  { code: 'payments.delete', module: 'payments', action: 'delete', label: 'Delete Payments', desc: 'Remove recorded cash/bKash money receipts' },
  { code: 'hr.approve', module: 'hr', action: 'approve', label: 'Approve Payroll & Salaries', desc: 'Authorize employee compensation disbursements' },
  { code: 'users.manage', module: 'users', action: 'manage', label: 'Manage Users & Permissions', desc: 'Create, modify roles, or alter security overrides' },
  { code: 'machineries.delete', module: 'machineries', action: 'delete', label: 'Delete Plant Machinery', desc: 'Decommission and remove factory assets' },
  { code: 'pricing.delete', module: 'pricing', action: 'delete', label: 'Delete Price Tariffs', desc: 'Delete rate cards and floor margins' },
  { code: 'inventory.approve', module: 'inventory', action: 'approve', label: 'Approve Inventory Adjustments', desc: 'Authorize write-offs and material stock balances' },
]

export function PermissionSimulator({
  users = [],
  roles = [],
  branches = [],
  companySlug,
  onEditUserPermissions,
}: PermissionSimulatorProps) {
  const [activeMode, setActiveMode] = useState<'simulate' | 'audit'>('simulate')

  const safeUsers = Array.isArray(users) ? users : []
  const safeBranches = Array.isArray(branches) ? branches : []

  // Simulation state
  const [selectedUserId, setSelectedUserId] = useState<string>(safeUsers[0]?.id || '')
  const [selectedModule, setSelectedModule] = useState<PermissionModule>('invoices')
  const [selectedAction, setSelectedAction] = useState<PermissionAction>('create')
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  // Audit state
  const [auditTargetCode, setAuditTargetCode] = useState<string>(HIGH_RISK_ACTIONS[0].code)
  const [auditSearchQuery, setAuditSearchQuery] = useState('')

  // Target User for Simulation
  const selectedUser = useMemo(() => {
    return safeUsers.find((u) => u.id === selectedUserId) || safeUsers[0] || null
  }, [safeUsers, selectedUserId])

  // Available actions for chosen module
  const availableActions = useMemo(() => {
    const spec = MODULE_ACTION_SPECS[selectedModule]
    return spec ? spec.actions : (['view', 'create', 'edit', 'delete'] as PermissionAction[])
  }, [selectedModule])

  // Ensure valid action selected
  React.useEffect(() => {
    if (!availableActions.includes(selectedAction)) {
      setSelectedAction(availableActions[0] || 'view')
    }
  }, [selectedModule, availableActions, selectedAction])

  // Helper to extract role name or slug
  const getUserRoleLabel = (u: CompanyUserWithProfile) => {
    return u.roles?.[0]?.name || u.roles?.[0]?.slug || (u as any).role || 'General Staff'
  }

  const getUserDisplayName = (u: CompanyUserWithProfile) => {
    return u.profile?.full_name || u.invited_email || 'Unnamed Member'
  }

  const getUserEmail = (u: CompanyUserWithProfile) => {
    return u.profile?.email || u.invited_email || ''
  }

  // Perform Live Permission Evaluation
  const evaluationResult = useMemo(() => {
    if (!selectedUser) return null

    const responsibilities = extractResponsibilities(selectedUser)
    const primaryRoleSlug = selectedUser.roles?.[0]?.slug || (selectedUser as any).role || ''
    const isOwner =
      primaryRoleSlug === 'owner' ||
      primaryRoleSlug === 'business_owner' ||
      responsibilities.includes('business_owner')

    const detail = getPermissionDetail(selectedUser, selectedModule, selectedAction)
    const dataScopes = (selectedUser.data_scopes as Record<string, DataScope>) || {}
    const moduleScope: DataScope = dataScopes[selectedModule] || (MODULE_ACTION_SPECS[selectedModule]?.defaultScope || 'assigned')

    // Branch Isolation Verification
    const authorizedBranches = selectedUser.authorized_branch_ids || []
    let branchAccessGranted = true
    let branchReason = 'No specific branch constraint'

    if (selectedBranchId !== 'all') {
      if (isOwner) {
        branchAccessGranted = true
        branchReason = 'Business Owner has universal branch clearance'
      } else if (moduleScope === 'all_branches' || moduleScope === 'company') {
        branchAccessGranted = true
        branchReason = 'Data scope allows cross-branch operations'
      } else if (authorizedBranches.length > 0) {
        branchAccessGranted = authorizedBranches.includes(selectedBranchId)
        branchReason = branchAccessGranted
          ? 'Explicitly authorized for this branch'
          : 'Branch not in user authorized branch list'
      } else if (selectedUser.branch_id) {
        branchAccessGranted = selectedUser.branch_id === selectedBranchId
        branchReason = branchAccessGranted ? 'Assigned Primary Branch' : 'Restricted to primary branch only'
      }
    }

    const finalGranted = detail.isGranted && branchAccessGranted

    return {
      detail,
      isOwner,
      responsibilities,
      moduleScope,
      branchAccessGranted,
      branchReason,
      finalGranted,
    }
  }, [selectedUser, selectedModule, selectedAction, selectedBranchId])

  // Perform High-Risk Audit (Who has this permission?)
  const auditResults = useMemo(() => {
    const [mod, act] = auditTargetCode.split('.') as [PermissionModule, PermissionAction]
    const matchedUsers: {
      user: CompanyUserWithProfile
      isGranted: boolean
      source: string
      isExplicitOverride: boolean
      sourceType: string
    }[] = []

    safeUsers.forEach((u) => {
      const detail = getPermissionDetail(u, mod, act)
      if (detail.isGranted) {
        matchedUsers.push({
          user: u,
          isGranted: true,
          source: detail.sourceDetail || detail.source,
          isExplicitOverride: detail.source.startsWith('override'),
          sourceType: detail.source,
        })
      }
    })

    if (!auditSearchQuery.trim()) return matchedUsers

    const q = auditSearchQuery.toLowerCase()
    return matchedUsers.filter((m) => {
      const name = getUserDisplayName(m.user).toLowerCase()
      const email = getUserEmail(m.user).toLowerCase()
      const role = getUserRoleLabel(m.user).toLowerCase()
      return name.includes(q) || email.includes(q) || role.includes(q) || m.source.toLowerCase().includes(q)
    })
  }, [users, auditTargetCode, auditSearchQuery])

  // Export audit summary to CSV
  const handleExportAuditCSV = () => {
    const headers = ['User Name', 'Email', 'Role', 'Status', 'Target Permission', 'Access Source']
    const rows = (Array.isArray(auditResults) ? auditResults : []).map((r) => [
      `"${getUserDisplayName(r.user)}"`,
      `"${getUserEmail(r.user)}"`,
      `"${getUserRoleLabel(r.user)}"`,
      `"${r.user.status || 'active'}"`,
      `"${auditTargetCode}"`,
      `"${r.source}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `InkFlow_Security_Audit_${auditTargetCode}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            variant={activeMode === 'simulate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveMode('simulate')}
            className={cn(
              'gap-2 rounded-lg font-medium text-xs sm:text-sm',
              activeMode === 'simulate' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-400 hover:text-white'
            )}
          >
            <Sliders className="w-4 h-4" />
            Access Rule Simulator (লাইভ সিমুলেটর)
          </Button>

          <Button
            variant={activeMode === 'audit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveMode('audit')}
            className={cn(
              'gap-2 rounded-lg font-medium text-xs sm:text-sm',
              activeMode === 'audit' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            Reverse Permission Auditor (কে কী করতে পারে?)
            <Badge variant="outline" className="ml-1 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
              {HIGH_RISK_ACTIONS.length}
            </Badge>
          </Button>
        </div>

        <div className="text-xs text-slate-400 px-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Real-time RBAC + ABAC Resolution Engine
        </div>
      </div>

      {/* MODE 1: ACCESS RULE SIMULATOR */}
      {activeMode === 'simulate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  Select Test Context (টেস্ট প্যারামিটার)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Select a team user, target ERP module, action, and branch to evaluate exact runtime clearance.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* User Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-medium">1. Target User (ব্যবহারকারী)</Label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {safeUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {getUserDisplayName(u)} ({getUserRoleLabel(u)}) {u.status === 'disabled' ? '⛔ Disabled' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-medium">2. ERP Module (মডিউল)</Label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value as PermissionModule)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(MODULE_ACTION_SPECS).map(([key, spec]) => (
                      <option key={key} value={key}>
                        {spec.label} ({spec.labelBn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-medium">3. Desired Action (অনুরোধকৃত কাজ)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableActions.map((act) => {
                      const isSelected = selectedAction === act
                      const isDestructive = act === 'delete' || act === 'cancel'
                      return (
                        <button
                          key={act}
                          type="button"
                          onClick={() => setSelectedAction(act)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center flex items-center justify-center gap-1',
                            isSelected
                              ? isDestructive
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                                : 'bg-primary/20 border-primary text-primary-foreground shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          )}
                        >
                          {ACTION_LABELS[act]?.label || act}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Branch Scope Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-medium">4. Context Branch (লোকেশন বা শাখা)</Label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Any Branch / General Context (যে কোনো শাখা)</option>
                    {safeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.name_bn || b.code || 'Branch'}) {b.is_main ? '⭐ Main' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && onEditUserPermissions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditUserPermissions(selectedUser)}
                    className="w-full mt-2 border-slate-700 hover:bg-slate-800 text-xs text-slate-300 gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    Configure Overrides for {getUserDisplayName(selectedUser).split(' ')[0]}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resolution Pipeline Column */}
          <div className="lg:col-span-7 space-y-4">
            {evaluationResult && selectedUser && (
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden shadow-lg">
                {/* Result Header Banner */}
                <div
                  className={cn(
                    'p-4 border-b flex items-center justify-between',
                    evaluationResult.finalGranted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {evaluationResult.finalGranted ? (
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-bold tracking-tight">
                        {evaluationResult.finalGranted ? 'ACCESS GRANTED (অনুমোদিত)' : 'ACCESS DENIED (নিষিদ্ধ)'}
                      </div>
                      <div className="text-xs opacity-90">
                        User <span className="font-semibold text-white">{getUserDisplayName(selectedUser)}</span> is{' '}
                        {evaluationResult.finalGranted ? 'authorized' : 'not permitted'} to execute{' '}
                        <Badge variant="outline" className="mx-1 px-1.5 py-0 text-[10px] uppercase font-mono">
                          {selectedModule}.{selectedAction}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-bold px-2.5 py-1',
                      evaluationResult.finalGranted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    )}
                  >
                    {evaluationResult.detail.source.toUpperCase()}
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Step-by-Step Resolution Pathway */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      Evaluation Decision Tree (সিদ্ধান্ত নেওয়ার ধাপসমূহ)
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Step 1: User Account & Ownership */}
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] mt-0.5">01</div>
                          <div>
                            <div className="font-medium text-slate-200">Account Status & Base Role</div>
                            <div className="text-slate-400 text-[11px]">
                              Status: <span className={selectedUser.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}>{selectedUser.status || 'active'}</span> • Primary Role: <span className="text-sky-300 font-medium">{getUserRoleLabel(selectedUser)}</span>
                            </div>
                          </div>
                        </div>
                        {selectedUser.status === 'disabled' ? (
                          <Badge variant="destructive" className="text-[10px]">Account Disabled</Badge>
                        ) : evaluationResult.isOwner ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Owner Full Access</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-800 text-slate-300 text-[10px]">Active Member</Badge>
                        )}
                      </div>

                      {/* Step 2: Inherited Responsibilities */}
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] mt-0.5">02</div>
                          <div>
                            <div className="font-medium text-slate-200">Role & Responsibilities Matrix</div>
                            <div className="text-slate-400 text-[11px]">
                              Assigned: {evaluationResult.responsibilities.join(', ')}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            evaluationResult.detail.source === 'inherited'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          )}
                        >
                          {evaluationResult.detail.source === 'inherited' ? 'Granted in Matrix' : 'Evaluated'}
                        </Badge>
                      </div>

                      {/* Step 3: Explicit User Overrides */}
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] mt-0.5">03</div>
                          <div>
                            <div className="font-medium text-slate-200">Direct User Overrides (+Grant / -Deny)</div>
                            <div className="text-slate-400 text-[11px]">
                              {evaluationResult.detail.source === 'override_allow' && 'Explicit user grant override applied'}
                              {evaluationResult.detail.source === 'override_deny' && 'Explicit user revoke override applied'}
                              {!evaluationResult.detail.source.startsWith('override') && 'No specific override for this action'}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            evaluationResult.detail.source === 'override_allow'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold'
                              : evaluationResult.detail.source === 'override_deny'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold'
                              : 'bg-slate-800 text-slate-500'
                          )}
                        >
                          {evaluationResult.detail.source === 'override_allow'
                            ? '+OVERRIDE ALLOW'
                            : evaluationResult.detail.source === 'override_deny'
                            ? '-OVERRIDE DENY'
                            : 'NONE'}
                        </Badge>
                      </div>

                      {/* Step 4: Branch Scope & Data Isolation */}
                      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px] mt-0.5">04</div>
                          <div>
                            <div className="font-medium text-slate-200">Branch & Data Scope Filter</div>
                            <div className="text-slate-400 text-[11px]">
                              Scope: <span className="text-sky-300 uppercase">{evaluationResult.moduleScope}</span> • {evaluationResult.branchReason}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            evaluationResult.branchAccessGranted
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          )}
                        >
                          {evaluationResult.branchAccessGranted ? 'Branch Passed' : 'Branch Restricted'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="text-slate-400">
                      Authoritative resolution: <span className="font-semibold text-white">{evaluationResult.detail.sourceDetail}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Module: <span className="text-slate-300 font-mono">{selectedModule}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: REVERSE PERMISSION AUDITOR */}
      {activeMode === 'audit' && (
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-md">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    High-Risk Permission Security Audit (সংবেদনশীল অনুমতি নিরীক্ষা)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Audit exactly which team members hold dangerous permissions across the company.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAuditCSV}
                  className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800 gap-1.5 self-start md:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Export Compliance CSV
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* High-Risk Selector Pills */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-300 font-medium">Select Critical Operation to Audit:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {HIGH_RISK_ACTIONS.map((item) => {
                    const isSelected = auditTargetCode === item.code
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setAuditTargetCode(item.code)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all relative',
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-slate-200">{item.label}</span>
                          <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase bg-slate-900 border-slate-700">
                            {item.code}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Filter Search Bar */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Filter audit results by name or email..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-xs bg-slate-950 border-slate-800"
                  />
                </div>

                <div className="text-xs text-slate-400">
                  Found <span className="font-bold text-amber-400">{auditResults.length}</span> user(s) with this privilege
                </div>
              </div>

              {/* Audit Results Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Team Member</th>
                        <th className="px-4 py-3">Role / Department</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Privilege Source</th>
                        <th className="px-4 py-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {!Array.isArray(auditResults) || auditResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No team members have been granted this permission.
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(auditResults) ? auditResults : []).map(({ user, source, isExplicitOverride, sourceType }) => (
                          <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">{getUserDisplayName(user)}</div>
                              <div className="text-slate-400 text-[11px] font-mono">{getUserEmail(user)}</div>
                            </td>

                            <td className="px-4 py-3">
                              <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 text-[10px]">
                                {getUserRoleLabel(user)}
                              </Badge>
                              {user.department && (
                                <div className="text-[10px] text-slate-500 mt-0.5">{user.department}</div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  user.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                )}
                              >
                                {user.status || 'active'}
                              </Badge>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    sourceType === 'owner'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : isExplicitOverride
                                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold'
                                      : 'bg-slate-800 text-slate-300'
                                  )}
                                >
                                  {source}
                                </Badge>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              {onEditUserPermissions && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditUserPermissions(user)}
                                  className="h-7 px-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                                >
                                  Modify Access
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
