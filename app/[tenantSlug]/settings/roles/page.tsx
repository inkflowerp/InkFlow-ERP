'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useParams } from 'next/navigation'
import {
  ShieldCheck,
  Check,
  RotateCcw,
  Save,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Sparkles,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import {
  PermissionAction,
  MODULE_ACTION_SPECS,
  ACTION_LABELS,
  PermissionModule,
} from '@/types/rbac.types'
import {
  listRolesWithPermissionsAction,
  createCustomRoleAction,
  updateRolePermissionsAction,
  deleteCustomRoleAction,
} from '@/actions/company-users.actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { FeatureGate } from '@/components/shared/feature-gate'
import { cn } from '@/lib/utils'

interface RoleItem {
  id: string
  name: string
  name_bn?: string | null
  slug: string
  description?: string | null
  is_system: boolean
  permissions: string[]
}

const HIGH_RISK_PERMISSIONS = new Set([
  'invoices.cancel',
  'invoices.delete',
  'payments.delete',
  'salary.edit',
  'salary.approve',
  'payroll.approve',
  'payroll.pay',
  'inventory.adjust',
  'users.permission_manage',
])

export default function RolesMatrixPage() {
  const params = useParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'app'
  const companyId = company?.id || ''

  const [roles, setRoles] = useState<RoleItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [currentPermissions, setCurrentPermissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleNameBn, setNewRoleNameBn] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleBaseSlug, setNewRoleBaseSlug] = useState('sales_manager')

  // Load roles on mount
  const loadRoles = async () => {
    setIsLoading(true)
    try {
      const data = await listRolesWithPermissionsAction(companyId)
      setRoles(data || [])
      if (data && data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0].id)
        setCurrentPermissions(new Set(data[0].permissions || []))
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load roles and permission matrix.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [companyId])

  // When selected role changes, update local permission set
  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRoleId)
    if (role) {
      setCurrentPermissions(new Set(role.permissions || []))
      setFeedback(null)
    }
  }, [selectedRoleId, roles])

  const selectedRole = roles.find((r) => r.id === selectedRoleId)
  const isOwnerRole = selectedRole?.slug === 'business_owner' || selectedRole?.slug === 'platform_owner'

  // Toggle single action permission
  const togglePermission = (mod: string, act: string) => {
    if (isOwnerRole) return // Business owner always has all permissions

    const permCode = `${mod}.${act}`
    const next = new Set(currentPermissions)
    if (next.has(permCode)) {
      next.delete(permCode)
    } else {
      next.add(permCode)
    }
    setCurrentPermissions(next)
  }

  // Toggle all actions in a module
  const toggleModuleAll = (mod: PermissionModule) => {
    if (isOwnerRole) return
    const spec = MODULE_ACTION_SPECS[mod]
    if (!spec) return

    const modulePerms = spec.actions.map((act) => `${mod}.${act}`)
    const allSelected = modulePerms.every((p) => currentPermissions.has(p))

    const next = new Set(currentPermissions)
    if (allSelected) {
      modulePerms.forEach((p) => next.delete(p))
    } else {
      modulePerms.forEach((p) => next.add(p))
    }
    setCurrentPermissions(next)
  }

  // Save changes to database
  const handleSaveRolePermissions = () => {
    if (!selectedRoleId || !companyId) return

    startTransition(async () => {
      try {
        const permsArray = Array.from(currentPermissions)
        const res = await updateRolePermissionsAction({
          companyId,
          tenantSlug,
          roleId: selectedRoleId,
          permissions: permsArray,
        })

        if (res.success) {
          setFeedback({ type: 'success', message: 'Permissions saved and enforced successfully in database.' })
          // Update local state
          setRoles((prev) =>
            prev.map((r) => (r.id === selectedRoleId ? { ...r, permissions: permsArray } : r))
          )
          setTimeout(() => setFeedback(null), 4000)
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to save role permissions.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Database error occurred.' })
      }
    })
  }

  // Create custom role
  const handleCreateRole = () => {
    if (!newRoleName.trim() || !companyId) return

    startTransition(async () => {
      try {
        const baseRole = roles.find((r) => r.slug === newRoleBaseSlug)
        const basePerms = baseRole ? baseRole.permissions : []

        const res = await createCustomRoleAction({
          companyId,
          tenantSlug,
          name: newRoleName.trim(),
          nameBn: newRoleNameBn.trim() || undefined,
          description: newRoleDesc.trim() || undefined,
          permissions: basePerms,
        })

        if (res.success) {
          setIsCreateRoleOpen(false)
          setNewRoleName('')
          setNewRoleNameBn('')
          setNewRoleDesc('')
          await loadRoles()
          setFeedback({ type: 'success', message: res.message || 'Custom role created successfully.' })
          setTimeout(() => setFeedback(null), 4000)
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to create role.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error creating custom role.' })
      }
    })
  }

  // Delete custom role
  const handleDeleteRole = (role: RoleItem) => {
    if (role.is_system) return
    if (!confirm(`Are you sure you want to delete custom role "${role.name}"?`)) return

    startTransition(async () => {
      try {
        const res = await deleteCustomRoleAction({
          companyId,
          tenantSlug,
          roleId: role.id,
        })

        if (res.success) {
          await loadRoles()
          setFeedback({ type: 'success', message: res.message || 'Role deleted successfully.' })
          setTimeout(() => setFeedback(null), 4000)
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to delete role.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error deleting role.' })
      }
    })
  }

  // Filter modules
  const filteredModules = Object.entries(MODULE_ACTION_SPECS).filter(([modKey, spec]) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      modKey.toLowerCase().includes(q) ||
      spec.label.toLowerCase().includes(q) ||
      spec.labelBn.toLowerCase().includes(q) ||
      spec.description.toLowerCase().includes(q)
    )
  })

  return (
    <FeatureGate feature="advanced_permissions">
      <div className="space-y-6 max-w-7xl pb-12">
        {/* Header */}
        <PageHeader
          titleEn="Roles & Permission Matrix"
          titleBn="অনুমতি ও ভূমিকা ম্যাট্রিক্স"
          descriptionEn="Manage server-authoritative operational roles and granular permission templates."
          descriptionBn="সার্ভার-অথরিটেটিভ ভূমিকা এবং প্রতিটি মডিউলের জন্য নির্দিষ্ট অ্যাকশন অনুমতি কনফিগার করুন।"
          actions={
            <Button
              onClick={() => setIsCreateRoleOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{tBilingual('New Custom Role', 'নতুন কাস্টম রোল')}</span>
            </Button>
          }
        />

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={cn(
              'p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in-0 duration-200',
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            )}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar: Roles Selector */}
          <Card className="lg:col-span-1 shadow-xs border-slate-200/80 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>{tBilingual('Roles & Templates', 'ভূমিকা ও টেমপ্লেট')}</span>
                <Badge variant="secondary" className="text-2xs font-bold px-1.5 py-0">
                  {roles.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {tBilingual('Select a role to view or customize permissions.', 'অনুমতি পরিবর্তন করতে রোল সিলেক্ট করুন।')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {roles.map((r) => {
                const isSelected = r.id === selectedRoleId
                const isOwner = r.slug === 'business_owner' || r.slug === 'platform_owner'

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between group',
                      isSelected
                        ? 'bg-blue-50/90 border-blue-300 dark:bg-blue-950/40 dark:border-blue-800 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('font-bold truncate', isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100')}>
                          {r.name}
                        </span>
                        {isOwner && (
                          <Badge className="bg-amber-500 text-white text-2xs px-1 py-0 h-4">
                            Full
                          </Badge>
                        )}
                        {!r.is_system && (
                          <Badge variant="outline" className="text-2xs px-1 py-0 h-4 border-indigo-300 text-indigo-700">
                            Custom
                          </Badge>
                        )}
                      </div>
                      {r.name_bn && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{r.name_bn}</p>
                      )}
                    </div>

                    {!r.is_system && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRole(r)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                        title="Delete custom role"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Right Main Area: Module Permission Matrix */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-xs border-slate-200/80 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedRole?.name}
                    </CardTitle>
                    {selectedRole?.name_bn && (
                      <span className="text-xs text-slate-400 font-normal">({selectedRole.name_bn})</span>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    {selectedRole?.description || 'Standard operational role template.'}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleSaveRolePermissions}
                    disabled={isPending || isOwnerRole}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shadow-xs cursor-pointer gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isPending ? 'Saving...' : tBilingual('Save Permissions', 'অনুমতি সংরক্ষণ')}</span>
                  </Button>
                </div>
              </CardHeader>

              {isOwnerRole && (
                <div className="m-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Business Owner Access:</strong> Has full, unconditional control across all organizational modules by design.
                  </span>
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tBilingual('Filter modules by name or action...', 'মডিউল বা অ্যাকশন ফিল্টার করুন...')}
                    className="h-8.5 pl-9 text-xs"
                  />
                </div>

                {/* Modules List */}
                <div className="space-y-3">
                  {filteredModules.map(([modKey, spec]) => {
                    const modName = modKey as PermissionModule
                    const modulePerms = spec.actions.map((act) => `${modKey}.${act}`)
                    const grantedCount = modulePerms.filter((p) => currentPermissions.has(p)).length
                    const isAllSelected = isOwnerRole || grantedCount === spec.actions.length

                    return (
                      <div
                        key={modKey}
                        className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs"
                      >
                        {/* Module Header */}
                        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {spec.label}
                            </span>
                            <span className="text-2xs text-slate-400 ml-1.5">({spec.labelBn})</span>
                            <p className="text-2xs text-slate-500 mt-0.5">{spec.description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'text-2xs font-bold px-2 py-0.5',
                                isAllSelected
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : grantedCount > 0
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              )}
                            >
                              {isOwnerRole ? `${spec.actions.length}/${spec.actions.length}` : `${grantedCount}/${spec.actions.length}`}
                            </Badge>

                            {!isOwnerRole && (
                              <button
                                type="button"
                                onClick={() => toggleModuleAll(modName)}
                                className="text-2xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                              >
                                {isAllSelected ? 'Clear All' : 'Select All'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Actions Checkboxes Grid */}
                        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {spec.actions.map((act) => {
                            const code = `${modKey}.${act}`
                            const isGranted = isOwnerRole || currentPermissions.has(code)
                            const isHighRisk = HIGH_RISK_PERMISSIONS.has(code)

                            return (
                              <div
                                key={act}
                                onClick={() => togglePermission(modKey, act)}
                                className={cn(
                                  'p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2 select-none',
                                  isGranted
                                    ? 'border-blue-300 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-950/30'
                                    : 'border-slate-200/70 dark:border-slate-800/80 bg-slate-50/20 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  disabled={isOwnerRole}
                                  onChange={() => {}} // Handled by parent onClick
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                      {ACTION_LABELS[act]?.label || act}
                                    </span>
                                    {isHighRisk && (
                                      <span title="High-Risk Action" className="text-amber-500 shrink-0">
                                        ⚠️
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-2xs text-slate-400 truncate block">
                                    {ACTION_LABELS[act]?.labelBn || ''}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal: Create Custom Role */}
        <ModalDialog
          open={isCreateRoleOpen}
          onOpenChange={setIsCreateRoleOpen}
          title={tBilingual('Create Custom Role Template', 'নতুন কাস্টম ভূমিকা তৈরি করুন')}
          description={tBilingual('Define a reusable permission matrix for your team members.', 'আপনার দলের সদস্যদের জন্য একটি পুনঃব্যবহারযোগ্য অনুমতি ম্যাট্রিক্স নির্ধারণ করুন।')}
        >
          <div className="space-y-4 py-1">
            <div>
              <Label className="text-xs font-semibold">{tBilingual('Role Name (English)', 'রোল নাম (ইংরেজি)')} *</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Senior Press Operator"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{tBilingual('Role Name (বাংলা)', 'রোল নাম (বাংলা)')}</Label>
              <Input
                value={newRoleNameBn}
                onChange={(e) => setNewRoleNameBn(e.target.value)}
                placeholder="যেমনঃ সিনিয়র প্রেস অপারেটর"
                className="mt-1 text-xs bangla-text"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">{tBilingual('Base Permission Template', 'বেস পারমিশন টেমপ্লেট')}</Label>
              <select
                value={newRoleBaseSlug}
                onChange={(e) => setNewRoleBaseSlug(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 mt-1"
              >
                {roles.filter((r) => r.slug !== 'business_owner').map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name} ({r.name_bn || r.slug})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">{tBilingual('Description', 'বিবরণ')}</Label>
              <Input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="e.g. Special access for large format printing and finishing"
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateRoleOpen(false)}
                className="text-xs"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateRole}
                disabled={!newRoleName.trim() || isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              >
                {isPending ? 'Creating...' : tBilingual('Create Role', 'রোল তৈরি করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      </div>
    </FeatureGate>
  )
}
