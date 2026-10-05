'use client'

import React, { useState, useMemo } from 'react'
import { useI18n } from '@/i18n/context'
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
 isUserBusinessOwner,
 DEFAULT_RESPONSIBILITY_MATRICES,
} from '@/lib/auth/rbac.client'
import { formatBranchName } from '@/lib/formatters'
import { resolveUserRole } from './user-resolvers'
import type { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { cn } from '@/lib/utils'

interface PermissionSimulatorProps {
 users: CompanyUserWithProfile[]
 roles: RoleRow[]
 branches: BranchRow[]
 companySlug: string
 onEditUserPermissions?: (user: CompanyUserWithProfile) => void
}

const HIGH_RISK_ACTIONS: { code: string; module: PermissionModule; action: PermissionAction; label: string; labelBn: string; desc: string; descBn: string }[] = [
  { code: 'invoices.cancel', module: 'invoices', action: 'cancel', label: 'Cancel Invoices', labelBn: 'ইনভয়েস বাতিল', desc: 'Void issued commercial & tax invoices', descBn: 'ইস্যুকৃত কমার্শিয়াল ও ট্যাক্স ইনভয়েস বাতিলকরণ' },
  { code: 'invoices.delete', module: 'invoices', action: 'delete', label: 'Delete Invoices', labelBn: 'ইনভয়েস মুছে ফেলা', desc: 'Permanently remove billing records', descBn: 'বিলিং রেকর্ড স্থায়ীভাবে মুছে ফেলা' },
  { code: 'payments.delete', module: 'payments', action: 'delete', label: 'Delete Payments', labelBn: 'পেমেন্ট মুছে ফেলা', desc: 'Remove recorded cash/bKash money receipts', descBn: 'নগদ বা বিকাশ মানি রিসিট স্থায়ীভাবে মুছে ফেলা' },
  { code: 'hr.approve', module: 'hr', action: 'approve', label: 'Approve Payroll & Salaries', labelBn: 'বেতন ও পে-রোল অনুমোদন', desc: 'Authorize employee compensation disbursements', descBn: 'কর্মীদের বেতন ও ভাতা অনুমোদন' },
  { code: 'users.manage', module: 'users', action: 'manage', label: 'Manage Users & Permissions', labelBn: 'ব্যবহারকারী ও অনুমতি পরিচালনা', desc: 'Create, modify roles, or alter security overrides', descBn: 'রোল তৈরি, পরিবর্তন বা নিরাপত্তা ওভাররাইড' },
  { code: 'machineries.delete', module: 'machineries', action: 'delete', label: 'Delete Plant Machinery', labelBn: 'কারখানা মেশিনারি মুছে ফেলা', desc: 'Decommission and remove factory assets', descBn: 'কারখানার স্থায়ী যন্ত্রপাতি নিষ্ক্রিয় বা মুছে ফেলা' },
  { code: 'pricing.delete', module: 'pricing', action: 'delete', label: 'Delete Price Tariffs', labelBn: 'মূল্য তালিকা মুছে ফেলা', desc: 'Delete rate cards and floor margins', descBn: 'রেট কার্ড এবং ফ্লোর মার্জিন মুছে ফেলা' },
  { code: 'inventory.approve', module: 'inventory', action: 'approve', label: 'Approve Inventory Adjustments', labelBn: 'ইনভেন্টরি সমন্বয় অনুমোদন', desc: 'Authorize write-offs and material stock balances', descBn: 'কাঁচামাল স্টক সমন্বয় ও ঘাটতি অনুমোদন' },
]


const ROLE_NAMES_BN: Record<string, string> = {
  business_owner: 'ব্যবসা স্বত্বাধিকারী',
  sales_manager: 'সেলস ম্যানেজার',
  designer: 'গ্রাফিক ডিজাইনার',
  production_manager: 'প্রোডাকশন ম্যানেজার',
  operator: 'মেশিন অপারেটর',
  store_manager: 'স্টোর ও ইনভেন্টরি ম্যানেজার',
  accountant: 'হিসাবরক্ষক ও বিলিং কর্মকর্তা',
  delivery_coordinator: 'ডেলিভারি ও চালান সমন্বয়ক',
  general_staff: 'সাধারণ কর্মী',
  'Business Owner': 'ব্যবসা স্বত্বাধিকারী',
  'Sales Manager': 'সেলস ম্যানেজার',
  'Graphic Designer': 'গ্রাফিক ডিজাইনার',
  'Production Manager': 'প্রোডাকশন ম্যানেজার',
  'Machine Operator': 'মেশিন অপারেটর',
  'Store & Inventory Manager': 'স্টোর ও ইনভেন্টরি ম্যানেজার',
  'Accountant & Billing Officer': 'হিসাবরক্ষক ও বিলিং কর্মকর্তা',
  'Delivery & Challan Coordinator': 'ডেলিভারি ও চালান সমন্বয়ক',
  'General Staff': 'সাধারণ কর্মী',
}

const translateStatus = (status: string, isBn: boolean) => {
  if (!isBn) return status
  if (status === 'active') return 'সক্রিয়'
  if (status === 'disabled') return 'নিষ্ক্রিয়'
  if (status === 'invited') return 'আমন্ত্রিত'
  return status
}

const translateScope = (scope: string, isBn: boolean) => {
  if (!isBn) return scope.toUpperCase()
  const map: Record<string, string> = {
    company: 'প্রতিষ্ঠান (সার্বজনীন)',
    all_branches: 'সকল শাখা',
    selected_branches: 'নির্বাচিত শাখা',
    branch: 'শাখা',
    department: 'বিভাগ',
    assigned: 'বরাদ্দকৃত',
    own: 'নিজস্ব',
  }
  return map[scope.toLowerCase()] || scope
}

const translateBranchReason = (reason: string, isBn: boolean) => {
  if (!isBn) return reason
  const map: Record<string, string> = {
    'No specific branch constraint': 'কোনো নির্দিষ্ট শাখা সীমাবদ্ধতা নেই',
    'Business Owner has universal branch clearance': 'স্বত্বাধিকারীর সর্বজনীন শাখা অনুমতি রয়েছে',
    'Data scope allows cross-branch operations': 'ডেটা স্কোপ অনুযায়ী আন্তঃশাখা অপারেশনের অনুমতি রয়েছে',
    'Explicitly authorized for this branch': 'এই শাখার জন্য স্পষ্টভাবে অনুমোদিত',
    'Branch not in user authorized branch list': 'ব্যবহারকারীর অনুমোদিত শাখা তালিকায় নেই',
    'Assigned Primary Branch': 'নির্ধারিত প্রাথমিক শাখা',
    'Restricted to primary branch only': 'শুধুমাত্র প্রাথমিক শাখায় সীমাবদ্ধ',
  }
  return map[reason] || reason
}

const translateSourceDetail = (src: string | undefined, isBn: boolean) => {
  if (!src) return isBn ? 'অজ্ঞাত' : 'Unknown'
  if (!isBn) return src
  if (src === 'Business Owner Full Access') return 'ব্যবসা স্বত্বাধিকারী পূর্ণ অ্যাক্সেস'
  if (src.includes('Role Matrix')) return 'রোল ম্যাট্রিক্স অনুমোদন'
  if (src.includes('Override')) return 'সরাসরি ব্যবহারকারী ওভাররাইড'
  if (src.includes('System Default')) return 'সিস্টেম ডিফল্ট'
  return src
}

const translateResponsibilities = (resps: string[], isBn: boolean) => {
  if (!isBn) return resps.join(', ')
  return resps.map((r) => ROLE_NAMES_BN[r] || r).join(', ')
}

export function PermissionSimulator({
 users = [],
 roles = [],
 branches = [],
 companySlug,
 onEditUserPermissions,
}: PermissionSimulatorProps) {
  const { locale, tBilingual } = useI18n()
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

  const getUserRoleLabel = (u: CompanyUserWithProfile) => {
    const resolved = resolveUserRole(u, roles)
    return locale === 'bn' ? resolved.nameBn : resolved.name
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
  const isOwner = isUserBusinessOwner(selectedUser)

  const detail = getPermissionDetail(selectedUser, selectedModule, selectedAction)
  const dataScopes = (selectedUser.data_scopes as Record<string, DataScope>) || {}
  const moduleScope: DataScope = isOwner ? 'company' : (dataScopes[selectedModule] || (MODULE_ACTION_SPECS[selectedModule]?.defaultScope || 'assigned'))

    // Branch Isolation Verification
  const authorizedBranches = selectedUser.authorized_branch_ids || []
  let branchAccessGranted = true
  let branchReason = 'No specific branch constraint'

  if (isOwner) {
    branchAccessGranted = true
    branchReason = 'Business Owner has universal branch clearance'
  } else if (selectedBranchId !== 'all') {
    if (moduleScope === 'all_branches' || moduleScope === 'company') {
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

  const finalGranted = isOwner ? true : (detail.isGranted && branchAccessGranted)

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
 link.setAttribute('download', `PrintFlow_Security_Audit_${auditTargetCode}_${new Date().toISOString().slice(0, 10)}.csv`)
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
  }

 return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-2 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Button
 variant={activeMode === 'simulate' ? 'default' : 'ghost'}
 size="sm"onClick={() => setActiveMode('simulate')}
 className={cn(
              'gap-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer',
 activeMode === 'simulate' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >
            <Sliders className="w-4 h-4"/>
 {tBilingual('Access Rule Simulator', 'অ্যাক্সেস রুল সিমুলেটর')}
          </Button>

          <Button
 variant={activeMode === 'audit' ? 'default' : 'ghost'}
 size="sm"onClick={() => setActiveMode('audit')}
 className={cn(
              'gap-2 rounded-lg font-medium text-xs sm:text-sm cursor-pointer',
 activeMode === 'audit' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
            )}
          >
            <ShieldAlert className="w-4 h-4"/>
 {tBilingual('Reverse Permission Auditor', 'রিভার্স পারমিশন অডিটর')}
            <Badge variant="outline"className="ml-1 bg-warning/15 text-warning text-warning border-warning-border/30 text-xs">
              {HIGH_RISK_ACTIONS.length}
            </Badge>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground px-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary"/>
 Real-time RBAC + ABAC Resolution Engine
        </div>
      </div>

      {/* MODE 1: ACCESS RULE SIMULATOR */}
      {activeMode === 'simulate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border bg-card backdrop-blur-md shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary text-primary"/>
 {tBilingual('Select Test Context', 'টেস্ট কনটেক্সট নির্বাচন করুন')}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
 Select a team user, target ERP module, action, and branch to evaluate exact runtime clearance.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* User Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">{tBilingual('1. Target User', '১. নির্দিষ্ট ব্যবহারকারী')}</Label>
                  <select
 value={selectedUserId}
 onChange={(e) => setSelectedUserId(e.target.value)}
 className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {safeUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {getUserDisplayName(u)} ({getUserRoleLabel(u)}) {u.status === 'disabled' ? (locale === 'bn' ? '⛔ নিষ্ক্রিয়' : '⛔ Disabled') : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">{tBilingual('2. ERP Module', '২. ইআরপি মডিউল')}</Label>
                  <select
 value={selectedModule}
 onChange={(e) => setSelectedModule(e.target.value as PermissionModule)}
 className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    {Object.entries(MODULE_ACTION_SPECS).map(([key, spec]) => (
                      <option key={key} value={key}>
                        {locale === 'bn' ? (spec.labelBn || spec.label) : spec.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">{tBilingual('3. Desired Action', '৩. প্রয়োজনীয় অ্যাকশন')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableActions.map((act) => {
 const isSelected = selectedAction === act
 const isDestructive = act === 'delete' || act === 'cancel'
 return (
                        <button
 key={act}
 type="button"onClick={() => setSelectedAction(act)}
 className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-center flex items-center justify-center gap-1 cursor-pointer',
 isSelected
                              ? isDestructive
                                ? 'bg-danger-surface bg-destructive/20 border-danger-border border-danger-border text-destructive text-destructive shadow-xs'
                                : 'bg-primary/10 dark:bg-primary/20 border-primary/40 dark:border-primary text-primary dark:text-primary-foreground shadow-xs font-semibold'
                              : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-input dark:hover:border-border'
                          )}
                        >
                          <span className={isSelected ? (isDestructive ? 'text-destructive text-destructive font-bold' : 'text-primary text-primary font-bold') : 'text-muted-foreground'}>{locale === 'bn' ? (ACTION_LABELS[act]?.labelBn || act) : (ACTION_LABELS[act]?.label || act)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Branch Scope Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">{tBilingual('4. Context Branch', '৪. কনটেক্সট শাখা')}</Label>
                  <select
 value={selectedBranchId}
 onChange={(e) => setSelectedBranchId(e.target.value)}
 className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="all">{tBilingual('Any Branch / General Context', 'যেকোনো শাখা / সাধারণ কনটেক্সট')}</option>
                    {safeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {formatBranchName(b.name, locale === 'bn' ? 'bn' : 'en', b.name_bn)} {b.is_main ? (locale === 'bn' ? '⭐ (প্রধান শাখা)' : '⭐ (Main)') : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && onEditUserPermissions && (
                  <Button
 variant="outline"size="sm"onClick={() => onEditUserPermissions(selectedUser)}
 className="w-full mt-2 border-border hover:bg-muted text-xs text-foreground gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary"/>
 {locale === 'bn' ? `${getUserDisplayName(selectedUser).split(' ')[0]}-এর ওভাররাইড কনফিগার` : `Configure Overrides for ${getUserDisplayName(selectedUser).split(' ')[0]}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resolution Pipeline Column */}
          <div className="lg:col-span-7 space-y-4">
            {evaluationResult && selectedUser && (
              <Card className="border-border bg-card backdrop-blur-md overflow-hidden shadow-xs">
                {/* Result Header Banner */}
                <div
 className={cn(
                    'p-4 border-b flex items-center justify-between',
 evaluationResult.finalGranted
                      ? 'bg-success/10 border-success-border/30 text-success text-success'
                      : 'bg-destructive/10 border-danger-border/30 text-destructive text-destructive'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {evaluationResult.finalGranted ? (
                      <div className="p-2 rounded-xl bg-success/20 text-success text-success border border-success-border/40">
                        <CheckCircle2 className="w-6 h-6"/>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-destructive/20 text-destructive text-destructive border border-danger-border/40">
                        <XCircle className="w-6 h-6"/>
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-bold tracking-tight">
                        {evaluationResult.finalGranted ? tBilingual('ACCESS GRANTED', 'অ্যাক্সেস অনুমোদিত') : tBilingual('ACCESS DENIED', 'অ্যাক্সেস প্রত্যাখ্যাত')}
                      </div>
                      <div className="text-xs opacity-90 text-muted-foreground">
 User <span className="font-semibold text-foreground">{getUserDisplayName(selectedUser)}</span> is{' '}
                        {evaluationResult.finalGranted ? 'authorized' : 'not permitted'} to execute{' '}
                        <Badge variant="outline"className="mx-1 px-1.5 py-0 text-xs uppercase tabular-nums">
                          {selectedModule}.{selectedAction}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Badge
 variant="outline"className={cn(
                      'text-xs font-bold px-2.5 py-1',
 evaluationResult.finalGranted
                        ? 'bg-success/20 text-success text-success border-success-border/40'
                        : 'bg-destructive/20 text-destructive text-destructive border-danger-border/40'
                    )}
                  >
                    {locale === 'bn' ? (evaluationResult.detail.source === 'owner' ? 'মালিক' : evaluationResult.detail.source.startsWith('override') ? 'ওভাররাইড' : evaluationResult.detail.source === 'inherited' ? 'রোল ম্যাট্রিক্স' : 'সিস্টেম') : evaluationResult.detail.source.toUpperCase()}
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Step-by-Step Resolution Pathway */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary text-primary"/>
 {tBilingual('Evaluation Decision Tree', 'মূল্যায়ন সিদ্ধান্ত ট্রি')}
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Step 1: User Account & Ownership */}
                      <div className="p-3 rounded-lg bg-muted border border-border flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-muted text-foreground tabular-nums text-xs mt-0.5">01</div>
                          <div>
                            <div className="font-medium text-foreground">Account Status & Base Role</div>
                            <div className="text-muted-foreground text-xs">
 Status: <span className={selectedUser.status === 'active' ? 'text-success text-success font-medium' : 'text-destructive text-destructive font-medium'}>{selectedUser.status || 'active'}</span> • Primary Role: <span className="text-primary text-primary font-medium">{getUserRoleLabel(selectedUser)}</span>
                            </div>
                          </div>
                        </div>
                        {selectedUser.status === 'disabled' ? (
                          <Badge variant="destructive"className="text-xs">Account Disabled</Badge>
                        ) : evaluationResult.isOwner ? (
                          <Badge className="bg-warning/20 text-warning text-warning border-warning-border/30 text-xs">Owner Full Access</Badge>
                        ) : (
                          <Badge variant="outline"className="bg-muted text-foreground border-border text-xs">Active Member</Badge>
                        )}
                      </div>

                      {/* Step 2: Inherited Responsibilities */}
                      <div className="p-3 rounded-lg bg-muted border border-border flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-muted text-foreground tabular-nums text-xs mt-0.5">02</div>
                          <div>
                            <div className="font-medium text-foreground">Role & Responsibilities Matrix</div>
                            <div className="text-muted-foreground text-xs">
 Assigned: {evaluationResult.responsibilities.join(', ')}
                            </div>
                          </div>
                        </div>
                        <Badge
 variant="outline"className={cn(
                            'text-xs',
 evaluationResult.detail.source === 'inherited'
                              ? 'bg-success/20 text-success text-success border-success-border/30 font-medium'
                              : 'bg-muted text-muted-foreground border-border '
                          )}
                        >
                          {evaluationResult.detail.source === 'inherited' ? tBilingual('Granted in Matrix', 'ম্যাট্রিক্সে অনুমোদিত') : tBilingual('Evaluated', 'মূল্যায়িত')}
                        </Badge>
                      </div>

                      {/* Step 3: Explicit User Overrides */}
                      <div className="p-3 rounded-lg bg-muted border border-border flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-muted text-foreground tabular-nums text-xs mt-0.5">03</div>
                          <div>
                            <div className="font-medium text-foreground">{tBilingual('Direct User Overrides (+Grant / -Deny)', 'সরাসরি ব্যবহারকারী ওভাররাইড (+অনুমোদন / -বাতিল)')}</div>
                            <div className="text-muted-foreground text-xs">
                              {evaluationResult.detail.source === 'override_allow' && tBilingual('Explicit user grant override applied', 'সরাসরি ব্যবহারকারী অনুমোদন প্রয়োগ করা হয়েছে')}
                              {evaluationResult.detail.source === 'override_deny' && tBilingual('Explicit user revoke override applied', 'সরাসরি ব্যবহারকারী বাতিল প্রয়োগ করা হয়েছে')}
                              {!evaluationResult.detail.source.startsWith('override') && tBilingual('No specific override for this action', 'এই অ্যাকশনের জন্য কোনো নির্দিষ্ট ওভাররাইড নেই')}
                            </div>
                          </div>
                        </div>
                        <Badge
 variant="outline"className={cn(
                            'text-xs',
 evaluationResult.detail.source === 'override_allow'
                              ? 'bg-success/20 text-success text-success border-success-border/30 font-bold'
                              : evaluationResult.detail.source === 'override_deny'
                              ? 'bg-destructive/20 text-destructive text-destructive border-danger-border/30 font-bold'
                              : 'bg-muted text-muted-foreground border-border '
                          )}
                        >
                          {evaluationResult.detail.source === 'override_allow'
                            ? (locale === 'bn' ? '+ওভাররাইড অনুমোদন' : '+OVERRIDE ALLOW')
                            : evaluationResult.detail.source === 'override_deny'
                            ? (locale === 'bn' ? '-ওভাররাইড বাতিল' : '-OVERRIDE DENY')
                            : (locale === 'bn' ? 'নেই' : 'NONE')}
                        </Badge>
                      </div>

                      {/* Step 4: Branch Scope & Data Isolation */}
                      <div className="p-3 rounded-lg bg-muted border border-border flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded bg-muted text-foreground tabular-nums text-xs mt-0.5">04</div>
                          <div>
                            <div className="font-medium text-foreground">Branch & Data Scope Filter</div>
                            <div className="text-muted-foreground text-xs">
 Scope: <span className="text-primary text-primary font-semibold uppercase">{evaluationResult.moduleScope}</span> • {evaluationResult.branchReason}
                            </div>
                          </div>
                        </div>
                        <Badge
 variant="outline"className={cn(
                            'text-xs',
 evaluationResult.branchAccessGranted
                              ? 'bg-success/20 text-success text-success border-success-border/30'
                              : 'bg-destructive/20 text-destructive text-destructive border-danger-border/30'
                          )}
                        >
                          {evaluationResult.branchAccessGranted ? tBilingual('Branch Passed', 'শাখা অনুমোদিত') : tBilingual('Branch Restricted', 'শাখা সীমাবদ্ধ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-muted border border-border flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
 {tBilingual('Authoritative resolution:', 'চূড়ান্ত সিদ্ধান্ত:')} <span className="font-semibold text-foreground">{translateSourceDetail(evaluationResult.detail.sourceDetail, locale === 'bn')}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
 {tBilingual('Module:', 'মডিউল:')} <span className="text-foreground tabular-nums font-medium">{locale === 'bn' ? (MODULE_ACTION_SPECS[selectedModule]?.labelBn || selectedModule) : selectedModule}</span>
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
          <Card className="border-border bg-card backdrop-blur-md shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-warning"/>
 {tBilingual('High-Risk Permission Security Audit', 'উচ্চ-ঝুঁকিপূর্ণ পারমিশন অডিট')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
 Audit exactly which team members hold dangerous permissions across the company.
                  </CardDescription>
                </div>

                <Button
 variant="outline"size="sm"onClick={handleExportAuditCSV}
 className="border-border text-xs text-foreground hover:bg-muted gap-1.5 self-start md:self-auto cursor-pointer">
                  <Download className="w-3.5 h-3.5 text-primary"/>
 Export Compliance CSV
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* High-Risk Selector Pills */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">{tBilingual('Select Critical Operation to Audit:', 'অডিট করার জন্য সংবেদনশীল অপারেশন নির্বাচন করুন:')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {HIGH_RISK_ACTIONS.map((item) => {
 const isSelected = auditTargetCode === item.code
 return (
                      <button
 key={item.code}
 type="button"onClick={() => setAuditTargetCode(item.code)}
 className={cn(
                          'p-2.5 rounded-xl border text-left transition-all relative cursor-pointer',
 isSelected
                            ? 'bg-warning/10 border-warning-border/50 text-foreground shadow-xs ring-1 focus:ring-ring/30'
                            : 'bg-muted border-border text-muted-foreground hover:border-input hover:text-foreground dark:hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-foreground">{locale === 'bn' ? item.labelBn : item.label}</span>
                          <Badge variant="outline"className="text-xs tabular-nums px-1 py-0 uppercase bg-muted border-border text-muted-foreground">
                            {item.code}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{locale === 'bn' ? item.descBn : item.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Filter Search Bar */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground"/>
                  <Input
 type="text"placeholder={tBilingual('Filter audit results by name or email...', 'নাম বা ইমেইল দিয়ে ফলাফল ফিল্টার করুন...')}value={auditSearchQuery}
 onChange={(e) => setAuditSearchQuery(e.target.value)}
 className="pl-9 h-8 text-xs bg-card border-border text-foreground"/>
                </div>

                <div className="text-xs text-muted-foreground">
 {locale === 'bn' ? <>পাওয়া গেছে <span className="font-bold text-warning text-warning">{auditResults.length}</span> জন সদস্য এই অনুমতিপ্রাপ্ত</> : <>Found <span className="font-bold text-warning text-warning">{auditResults.length}</span> user(s) with this privilege</>}
                </div>
              </div>

              {/* Audit Results Table */}
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
                      <tr>
                        <th className="px-4 py-3">{tBilingual('Team Member', 'টিম সদস্য')}</th>
                        <th className="px-4 py-3">{tBilingual('Role / Department', 'রোল / বিভাগ')}</th>
                        <th className="px-4 py-3">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                        <th className="px-4 py-3">{tBilingual('Privilege Source', 'অনুমতির উৎস')}</th>
                        <th className="px-4 py-3 text-right">{tBilingual('Quick Action', 'দ্রুত অ্যাকশন')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border/60">
                      {!Array.isArray(auditResults) || auditResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
 {tBilingual('No team members have been granted this permission.', 'কোনো টিম সদস্যকে এই অনুমতি দেওয়া হয়নি।')}
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(auditResults) ? auditResults : []).map(({ user, source, isExplicitOverride, sourceType }) => (
                          <tr key={user.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{getUserDisplayName(user)}</div>
                              <div className="text-muted-foreground text-xs tabular-nums">{getUserEmail(user)}</div>
                            </td>

                            <td className="px-4 py-3">
                              <Badge variant="outline"className="bg-muted border-border text-foreground text-xs">
                                {getUserRoleLabel(user)}
                              </Badge>
                              {user.department && (
                                <div className="text-xs text-muted-foreground mt-0.5">{user.department}</div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <Badge
 variant="outline"className={cn(
                                  'text-xs',
 user.status === 'active'
                                    ? 'bg-success/10 text-success text-success border-success-border/30'
                                    : 'bg-destructive/10 text-destructive text-destructive border-danger-border/30'
                                )}
                              >
                                {translateStatus(user.status || 'active', locale === 'bn')}
                              </Badge>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Badge
 variant="outline"className={cn(
                                    'text-xs',
 sourceType === 'owner'
                                      ? 'bg-warning/20 text-warning text-warning border-warning-border/30'
                                      : isExplicitOverride
                                      ? 'bg-primary/20 text-primary text-primary border-primary/20/30 font-bold'
                                      : 'bg-muted text-foreground border-border '
                                  )}
                                >
                                  {translateSourceDetail(source, locale === 'bn')}
                                </Badge>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right">
                              {onEditUserPermissions && (
                                <Button
 variant="ghost"size="sm"onClick={() => onEditUserPermissions(user)}
 className="h-7 px-2.5 text-xs text-primary text-primary hover:text-primary dark:hover:text-primary hover:bg-info-surface dark:hover:bg-primary/10">
 {tBilingual('Modify Access', 'অ্যাক্সেস সংশোধন')}
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
