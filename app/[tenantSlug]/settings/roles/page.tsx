'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Check,
  RotateCcw,
  Save,
  CheckCircle2,
  Lock,
  UserCheck,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import {
  PrimaryRole,
  PermissionAction,
  RolePermissionMatrix,
  MATRIX_RESOURCES,
  PERMISSION_ACTIONS,
} from '@/types/rbac.types'
import { DEFAULT_ROLE_MATRICES } from '@/lib/auth/rbac.client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'
import { updateUserAccessAndPermissionsAction } from '@/actions/company-users.actions'
import { CompanyUserWithProfile } from '@/types/tenant.types'

export default function RolesMatrixPage() {
  const { locale, tBilingual } = useI18n()
  const [selectedRole, setSelectedRole] = useState<PrimaryRole>('sales_manager')
  const [matrices, setMatrices] = useDataStore<Record<PrimaryRole, RolePermissionMatrix>>(
    STORAGE_KEYS.ROLE_MATRICES,
    DEFAULT_ROLE_MATRICES
  )
  const [companyUsers] = useDataStore<CompanyUserWithProfile[]>(
    STORAGE_KEYS.COMPANY_USERS,
    []
  )
  const [activeTab, setActiveTab] = useState<'matrix' | 'overrides'>('matrix')
  const [isSaved, setIsSaved] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')

  React.useEffect(() => {
    if (!selectedEmployee && companyUsers.length > 0) {
      setSelectedEmployee(companyUsers[0].id)
    }
  }, [companyUsers, selectedEmployee])

  const targetUser = companyUsers.find(
    (u) => u.id === selectedEmployee || u.user_id === selectedEmployee
  ) || companyUsers[0]

  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>(
    targetUser?.overrides || {}
  )

  React.useEffect(() => {
    if (targetUser?.overrides) {
      setUserOverrides(targetUser.overrides)
    } else {
      setUserOverrides({})
    }
  }, [selectedEmployee, targetUser])


  const currentMatrix = matrices[selectedRole]
  const isOwnerRole = selectedRole === 'business_owner' || selectedRole === 'platform_owner'

  // Toggle specific action for a resource
  const toggleCell = (resource: string, action: PermissionAction) => {
    if (isOwnerRole) return // Owner always has full permissions

    setMatrices((prev) => {
      const currentRoleMatrix = { ...prev[selectedRole] }
      const resPerms = { ...currentRoleMatrix[resource] }

      if (action === 'full_control') {
        const nextVal = !resPerms.full_control
        PERMISSION_ACTIONS.forEach((a) => {
          resPerms[a.action] = nextVal
        })
      } else {
        resPerms[action] = !resPerms[action]
        if (!resPerms[action]) {
          resPerms.full_control = false
        }
      }

      currentRoleMatrix[resource] = resPerms
      return { ...prev, [selectedRole]: currentRoleMatrix }
    })
  }

  // Toggle entire resource row
  const toggleRow = (resource: string) => {
    if (isOwnerRole) return
    const isAllChecked = PERMISSION_ACTIONS.every((a) => currentMatrix[resource]?.[a.action])
    setMatrices((prev) => {
      const currentRoleMatrix = { ...prev[selectedRole] }
      const nextVal = !isAllChecked
      const nextActions = {} as Record<PermissionAction, boolean>
      PERMISSION_ACTIONS.forEach((a) => {
        nextActions[a.action] = nextVal
      })
      currentRoleMatrix[resource] = nextActions
      return { ...prev, [selectedRole]: currentRoleMatrix }
    })
  }

  const handleResetToDefault = () => {
    setMatrices((prev) => ({
      ...prev,
      [selectedRole]: { ...DEFAULT_ROLE_MATRICES[selectedRole] },
    }))
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleSave = () => {
    setMatrices(matrices)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }

  const handleSaveUserOverrides = async () => {
    if (targetUser) {
      await updateUserAccessAndPermissionsAction({
        companyUserId: targetUser.id,
        overrides: userOverrides,
        actorName: 'Business Owner',
      })
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3500)
  }


  const rolesList: { role: PrimaryRole; title: string; titleBn: string; desc: string }[] = [
    { role: 'business_owner', title: 'Business Owner', titleBn: 'প্রতিষ্ঠানের মালিক', desc: 'Full organization access' },
    { role: 'sales_manager', title: 'Sales Manager', titleBn: 'সেলস ম্যানেজার', desc: 'Quotations, orders & customers' },
    { role: 'designer', title: 'Graphic Designer', titleBn: 'গ্রাফিক ডিজাইনার', desc: 'Pre-press, proofs & revisions' },
    { role: 'production_manager', title: 'Production Manager', titleBn: 'প্রোডাকশন ম্যানেজার', desc: 'Floor scheduling & inventory' },
    { role: 'operator', title: 'Print Operator', titleBn: 'মেশিন অপারেটর', desc: 'Assigned jobs & consumption' },
    { role: 'general_staff', title: 'General Staff', titleBn: 'সাধারণ কর্মী', desc: 'Strictly assigned features' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Roles & Permission Matrix"
        titleBn="অনুমতি ও ভূমিকা ম্যাট্রিক্স"
        descriptionEn="Configure granular Module / Resource / Action permissions for each operational role."
        descriptionBn="প্রতিটি অপারেশনাল ভূমিকার জন্য মডিউল, রিসোর্স এবং অ্যাকশন অনুমতি কনফিগার করুন।"
        icon={ShieldCheck}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            {isSaved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 bangla-text">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {tBilingual('Permissions applied!', 'অনুমতি সংরক্ষিত হয়েছে!')}
              </span>
            )}

            <Button variant="outline" size="sm" onClick={handleResetToDefault} disabled={isOwnerRole} className="bangla-text">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Reset to Default', 'ডিফল্টে ফিরুন')}
            </Button>

            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 bangla-text">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Save Changes', 'সংরক্ষণ করুন')}
            </Button>
          </div>
        }
      />

      {/* Main Tabs (Matrix vs User Overrides) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Role Permission Matrix
        </button>

        <button
          onClick={() => setActiveTab('overrides')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2',
            activeTab === 'overrides'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <UserCheck className="h-4 w-4" />
          Individual User Overrides
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Role Selector */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Select Primary Role
            </h3>

            {rolesList.map((r) => {
              const isSelected = selectedRole === r.role
              return (
                <div
                  key={r.role}
                  onClick={() => setSelectedRole(r.role)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-3 transition-all text-left',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {r.title}
                    </span>
                    {isSelected && <Badge variant="default" className="text-[10px] h-5">Active</Badge>}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                    {r.titleBn}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{r.desc}</p>
                </div>
              )
            })}

            {isOwnerRole && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2 mt-4">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Business Owner has permanent full control over all modules to ensure operational continuity.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Permission Matrix Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Permissions for: <span className="text-blue-600">{rolesList.find((r) => r.role === selectedRole)?.title}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Rows represent resources. Columns represent allowed operations.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Object.values(currentMatrix || {}).reduce(
                      (acc, r) => acc + Object.values(r).filter(Boolean).length,
                      0
                    )}{' '}
                    Grants Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 min-w-[200px]">Resource / Module</th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th key={action.action} className="py-3 px-3 text-center min-w-[90px]">
                          <div>{action.label}</div>
                          <div className="text-[10px] font-normal text-slate-400">{action.labelBn}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MATRIX_RESOURCES.map((res) => {
                      const resPerms = currentMatrix?.[res.resource] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        approve: false,
                        full_control: false,
                      }

                      return (
                        <tr
                          key={res.resource}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          {/* Row Header */}
                          <td className="py-3 px-4">
                            <div
                              onClick={() => toggleRow(res.resource)}
                              className="cursor-pointer group flex items-start flex-col"
                              title="Click to toggle entire resource row"
                            >
                              <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 flex items-center gap-1.5">
                                {res.label}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({res.labelBn})
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 line-clamp-1">
                                {res.description}
                              </span>
                            </div>
                          </td>

                          {/* Action Checkboxes */}
                          {PERMISSION_ACTIONS.map((action) => {
                            const isChecked = resPerms[action.action]
                            return (
                              <td key={action.action} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCell(res.resource, action.action)}
                                  disabled={isOwnerRole}
                                  className={cn(
                                    'h-6 w-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer border',
                                    isOwnerRole
                                      ? 'bg-blue-100 border-blue-200 text-blue-700 cursor-not-allowed dark:bg-blue-950 dark:border-blue-900'
                                      : isChecked
                                      ? action.action === 'full_control'
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                        : 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                      : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900'
                                  )}
                                  title={`${res.label} - ${action.label}`}
                                >
                                  {isChecked && <Check className="h-3.5 w-3.5" />}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* USER OVERRIDES TAB */
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Individual User-Level Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Grant exceptional privileges or restrict specific actions for individual employees without altering base role matrices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-64 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Team Member:
                </label>
                <select
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2.5"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  {companyUsers.length === 0 ? (
                    <option value="">No team members found</option>
                  ) : (
                    companyUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.profile?.full_name || u.profile?.email || 'Unnamed User'} ({u.roles?.[0]?.name || (u as any).role || 'Member'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="pt-5">
                <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Base Role: {targetUser?.roles?.[0]?.name || (targetUser as any)?.role || 'None'}
                </Badge>
              </div>
            </div>

            {/* Overrides Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4">Permission / Resource Capability</th>
                    <th className="py-3 px-4">Base Role Default</th>
                    <th className="py-3 px-4 text-right">User Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { code: 'invoice.delete', label: 'Delete Invoices (ইনভয়েস ডিলিট)', base: 'Denied' },
                    { code: 'reports.view', label: 'View P&L Profit Reports (মুনাফা রিপোর্ট)', base: 'Denied' },
                    { code: 'quotation.approve', label: 'Approve High-Discount Quotes', base: 'Allowed' },
                    { code: 'settings.edit', label: 'Modify Company Tax/BIN', base: 'Denied' },
                  ].map((item) => {
                    const override = userOverrides[item.code]
                    return (
                      <tr key={item.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {item.label}
                          <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold',
                              item.base === 'Allowed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            )}
                          >
                            {item.base}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setUserOverrides((prev) => ({ ...prev, [item.code]: true }))}
                              className={cn(
                                'px-2.5 py-1 rounded text-[11px] font-bold border transition-colors',
                                override === true
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700'
                              )}
                            >
                              Grant Override
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserOverrides((prev) => ({ ...prev, [item.code]: false }))}
                              className={cn(
                                'px-2.5 py-1 rounded text-[11px] font-bold border transition-colors',
                                override === false
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700'
                              )}
                            >
                              Deny Explicitly
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setUserOverrides((prev) => {
                                  const copy = { ...prev }
                                  delete copy[item.code]
                                  return copy
                                })
                              }
                              className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600"
                              title="Revert to Role Default"
                            >
                              Default
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveUserOverrides} className="bg-blue-600 hover:bg-blue-700 text-xs">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save User Overrides
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
