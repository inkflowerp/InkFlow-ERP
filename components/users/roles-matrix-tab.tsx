'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
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
  Layers,
  Sliders,
  Edit2,
  ShieldAlert,
  Shield,
  HelpCircle,
} from 'lucide-react'
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'
import { tBilingual } from '@/lib/formatters'

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
  'users.delete',
  'machineries.delete',
  'pricing.delete',
])

type ModuleCategory = 'all' | 'sales' | 'production' | 'inventory' | 'hr' | 'system'

const MODULE_CATEGORIES: Record<ModuleCategory, { labelEn: string; labelBn: string; modules: PermissionModule[] }> = {
  all: {
    labelEn: 'All Modules',
    labelBn: 'সকল মডিউল',
    modules: Object.keys(MODULE_ACTION_SPECS) as PermissionModule[],
  },
  sales: {
    labelEn: 'Commercial & Sales',
    labelBn: 'বিক্রয় ও বাণিজ্যিক',
    modules: ['products', 'pricing', 'customers', 'quotations', 'orders', 'design', 'invoices', 'payments'],
  },
  production: {
    labelEn: 'Production & Plant',
    labelBn: 'প্রোডাকশন ও কারখানা',
    modules: ['production', 'machineries', 'tasks'],
  },
  inventory: {
    labelEn: 'Inventory & Dispatch',
    labelBn: 'ইনভেন্টরি ও ডেলিভারি',
    modules: ['inventory', 'delivery'],
  },
  hr: {
    labelEn: 'Workforce & HR',
    labelBn: 'এইচআর ও কর্মী',
    modules: ['hr'],
  },
  system: {
    labelEn: 'System & Governance',
    labelBn: 'সিস্টেম ও প্রশাসন',
    modules: ['settings', 'branches', 'users', 'notifications', 'support', 'reports'],
  },
}

const DEFAULT_CLIENT_ROLES: RoleItem[] = [
  {
    id: 'role-owner',
    name: 'Business Owner',
    name_bn: 'ব্যবসা স্বত্বাধিকারী',
    slug: 'business_owner',
    description: 'Universal administrative authority and organization governance.',
    is_system: true,
    permissions: Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
      spec.actions.map((act) => `${mod}.${act}`)
    ),
  },
  {
    id: 'role-sales',
    name: 'Sales Manager',
    name_bn: 'সেলস ম্যানেজার',
    slug: 'sales_manager',
    description: 'Quotations, pricing, customer relations, invoicing, and order handling.',
    is_system: true,
    permissions: [
      'customers.view', 'customers.create', 'customers.edit', 'customers.export',
      'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.approve', 'quotations.send', 'quotations.print',
      'orders.view', 'orders.create', 'orders.edit', 'orders.assign', 'orders.print',
      'design.view', 'design.send', 'design.download',
      'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.approve', 'invoices.cancel', 'invoices.print', 'invoices.download', 'invoices.send',
      'payments.view', 'payments.create', 'payments.print',
      'production.view', 'machineries.view', 'delivery.view', 'delivery.assign',
      'inventory.view', 'reports.view', 'reports.export', 'products.view', 'products.create', 'products.edit', 'pricing.view', 'pricing.create', 'pricing.edit'
    ],
  },
  {
    id: 'role-designer',
    name: 'Graphic Designer',
    name_bn: 'গ্রাফিক ডিজাইনার',
    slug: 'designer',
    description: 'Artwork proofs, customer approvals, pre-press checks, and design revisions.',
    is_system: true,
    permissions: [
      'customers.view', 'quotations.view', 'orders.view', 'orders.create', 'orders.edit', 'orders.print',
      'design.view', 'design.create', 'design.edit', 'design.send', 'design.download', 'design.approve',
      'invoices.view', 'production.view', 'machineries.view', 'tasks.view', 'notifications.view'
    ],
  },
  {
    id: 'role-production',
    name: 'Production Manager',
    name_bn: 'প্রোডাকশন ম্যানেজার',
    slug: 'production_manager',
    description: 'Plant machine queues, raw media allocation, stages, and quality control.',
    is_system: true,
    permissions: [
      'orders.view', 'orders.edit', 'orders.assign', 'orders.complete',
      'production.view', 'production.create', 'production.edit', 'production.assign', 'production.complete', 'production.cancel',
      'machineries.view', 'machineries.create', 'machineries.edit', 'machineries.assign',
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve',
      'delivery.view', 'delivery.assign', 'reports.view', 'tasks.view', 'tasks.complete'
    ],
  },
  {
    id: 'role-operator',
    name: 'Machine Operator',
    name_bn: 'মেশিন অপারেটর',
    slug: 'operator',
    description: 'Floor press runs, finishing works, task completions, and machine logs.',
    is_system: true,
    permissions: [
      'orders.view', 'production.view', 'production.complete',
      'machineries.view', 'delivery.view', 'tasks.view', 'tasks.complete'
    ],
  },
  {
    id: 'role-store',
    name: 'Store & Inventory Manager',
    name_bn: 'স্টোর ও ইনভেন্টরি ম্যানেজার',
    slug: 'store_manager',
    description: 'Raw media rolls, inks, boards, store ledger, and material dispatches.',
    is_system: true,
    permissions: [
      'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve',
      'products.view', 'delivery.view', 'delivery.create', 'orders.view', 'tasks.view'
    ],
  },
  {
    id: 'role-accountant',
    name: 'Accountant & Billing Officer',
    name_bn: 'হিসাবরক্ষক ও বিলিং কর্মকর্তা',
    slug: 'accountant',
    description: 'Invoicing, receipts, payment recording, banking, and financial reports.',
    is_system: true,
    permissions: [
      'customers.view', 'customers.create', 'quotations.view',
      'orders.view', 'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.approve', 'invoices.cancel', 'invoices.print', 'invoices.download', 'invoices.send',
      'payments.view', 'payments.create', 'payments.edit', 'payments.print',
      'reports.view', 'reports.export', 'pricing.view', 'hr.view', 'hr.create', 'hr.edit', 'hr.approve'
    ],
  },
  {
    id: 'role-delivery',
    name: 'Delivery & Challan Coordinator',
    name_bn: 'ডেলিভারি ও চালান সমন্বয়ক',
    slug: 'delivery_coordinator',
    description: 'Delivery challans, site installation sign-offs, and dispatch routing.',
    is_system: true,
    permissions: [
      'customers.view', 'orders.view', 'invoices.view', 'invoices.print',
      'production.view', 'machineries.view',
      'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.assign', 'delivery.complete', 'delivery.cancel',
      'tasks.view', 'tasks.complete'
    ],
  },
  {
    id: 'role-staff',
    name: 'General Staff',
    name_bn: 'সাধারণ কর্মী',
    slug: 'general_staff',
    description: 'Standard workspace member with basic operational view access.',
    is_system: true,
    permissions: [
      'orders.view', 'machineries.view', 'delivery.view', 'tasks.view', 'notifications.view', 'support.view'
    ],
  },
]

interface RolesMatrixTabProps {
  companyId: string
  tenantSlug: string
  onRolesChanged?: () => void
}

export function RolesMatrixTab({ companyId, tenantSlug, onRolesChanged }: RolesMatrixTabProps) {
  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_CLIENT_ROLES)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-sales')
  const [currentPermissions, setCurrentPermissions] = useState<Set<string>>(() => {
    return new Set(DEFAULT_CLIENT_ROLES[1].permissions)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('all')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null)

  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleNameBn, setNewRoleNameBn] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRoleBaseSlug, setNewRoleBaseSlug] = useState('sales_manager')

  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleNameBn, setEditRoleNameBn] = useState('')
  const [editRoleDesc, setEditRoleDesc] = useState('')

  const loadRoles = async () => {
    setIsLoading(true)
    try {
      const data = await listRolesWithPermissionsAction(companyId)
      const safeData = Array.isArray(data) && data.length > 0 ? data : DEFAULT_CLIENT_ROLES
      setRoles(safeData)
      if (safeData.length > 0) {
        const found = selectedRoleId ? safeData.find((r) => r.id === selectedRoleId) : safeData[0]
        const target = found || safeData[0]
        setSelectedRoleId(target.id)
        setCurrentPermissions(new Set(target.permissions || []))
      }
    } catch (err) {
      console.error('Failed to load roles:', err)
      setRoles((prev) => (Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_CLIENT_ROLES))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [companyId])

  const selectedRole = useMemo(() => {
    const list = Array.isArray(roles) && roles.length > 0 ? roles : DEFAULT_CLIENT_ROLES
    return list.find((r) => r.id === selectedRoleId) || list[0] || null
  }, [roles, selectedRoleId])

  // Select Role Handler
  const handleSelectRole = (role: RoleItem) => {
    setSelectedRoleId(role.id)
    setCurrentPermissions(new Set(role.permissions || []))
    setFeedback(null)
  }

  // Permission Toggle
  const handleTogglePermission = (moduleKey: string, actionKey: string) => {
    if (!selectedRole) return
    const code = `${moduleKey}.${actionKey}`
    const next = new Set(currentPermissions)
    if (next.has(code)) {
      next.delete(code)
    } else {
      next.add(code)
    }
    setCurrentPermissions(next)
  }

  // Batch Category Actions
  const handleCategoryAction = (categoryKey: ModuleCategory, mode: 'view_all' | 'grant_all' | 'clear_all' | 'revoke_delete') => {
    const targetModules = MODULE_CATEGORIES[categoryKey]?.modules || []
    const next = new Set(currentPermissions)

    targetModules.forEach((mod) => {
      const spec = MODULE_ACTION_SPECS[mod]
      if (!spec) return

      if (mode === 'view_all') {
        next.add(`${mod}.view`)
      } else if (mode === 'grant_all') {
        spec.actions.forEach((act) => next.add(`${mod}.${act}`))
      } else if (mode === 'clear_all') {
        spec.actions.forEach((act) => next.delete(`${mod}.${act}`))
      } else if (mode === 'revoke_delete') {
        next.delete(`${mod}.delete`)
        next.delete(`${mod}.cancel`)
      }
    })

    setCurrentPermissions(next)
  }

  // Save Matrix
  const handleSaveMatrix = () => {
    if (!selectedRole) return
    startTransition(async () => {
      try {
        const res = await updateRolePermissionsAction({
          companyId,
          tenantSlug,
          roleId: selectedRole.id,
          permissions: Array.from(currentPermissions),
        })

        if (res.success) {
          setFeedback({ type: 'success', message: `Permissions updated successfully for "${selectedRole.name}".` })
          await loadRoles()
          onRolesChanged?.()
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to update role permissions.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error occurred while saving.' })
      }
    })
  }

  // Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return

    const baseRole = roles.find((r) => r.slug === newRoleBaseSlug)
    const initialPerms = baseRole ? baseRole.permissions : []

    startTransition(async () => {
      try {
        const res = await createCustomRoleAction({
          companyId,
          tenantSlug,
          name: newRoleName.trim(),
          nameBn: newRoleNameBn.trim() || undefined,
          description: newRoleDesc.trim() || undefined,
          permissions: initialPerms,
        })

        if (res.success) {
          setIsCreateRoleOpen(false)
          setNewRoleName('')
          setNewRoleNameBn('')
          setNewRoleDesc('')
          setFeedback({ type: 'success', message: 'Custom role created successfully.' })
          await loadRoles()
          onRolesChanged?.()
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to create role.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error creating role.' })
      }
    })
  }

  // Edit Role Details
  const handleSaveRoleDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole || selectedRole.is_system) return

    startTransition(async () => {
      try {
        const res = await updateRolePermissionsAction({
          companyId,
          tenantSlug,
          roleId: selectedRole.id,
          permissions: Array.from(currentPermissions),
          details: {
            name: editRoleName.trim() || selectedRole.name,
            nameBn: editRoleNameBn.trim() || selectedRole.name_bn || undefined,
            description: editRoleDesc.trim() || selectedRole.description || undefined,
          },
        })

        if (res.success) {
          setIsEditRoleOpen(false)
          setFeedback({ type: 'success', message: 'Role details updated.' })
          await loadRoles()
          onRolesChanged?.()
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to update role details.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error updating role.' })
      }
    })
  }

  // Delete Custom Role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return
    startTransition(async () => {
      try {
        const res = await deleteCustomRoleAction({
          companyId,
          tenantSlug,
          roleId: roleToDelete.id,
        })

        if (res.success) {
          setIsDeleteConfirmOpen(false)
          setRoleToDelete(null)
          setFeedback({ type: 'success', message: 'Custom role deleted.' })
          await loadRoles()
          onRolesChanged?.()
        } else {
          setFeedback({ type: 'error', message: res.message || 'Failed to delete role.' })
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Error deleting role.' })
      }
    })
  }

  // Filter Modules by Category and Search
  const filteredModules = useMemo(() => {
    const modulesInCat = MODULE_CATEGORIES[selectedCategory]?.modules || []
    return modulesInCat.filter((mod) => {
      const spec = MODULE_ACTION_SPECS[mod]
      if (!spec) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        spec.label.toLowerCase().includes(q) ||
        spec.labelBn.toLowerCase().includes(q) ||
        spec.description.toLowerCase().includes(q) ||
        mod.toLowerCase().includes(q)
      )
    })
  }, [selectedCategory, searchQuery])

  // Count changes compared to original saved role
  const unsavedChangesCount = useMemo(() => {
    if (!selectedRole) return 0
    const original = new Set(selectedRole.permissions || [])
    let diff = 0
    currentPermissions.forEach((p) => {
      if (!original.has(p)) diff++
    })
    original.forEach((p) => {
      if (!currentPermissions.has(p)) diff++
    })
    return diff
  }, [selectedRole, currentPermissions])

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {tBilingual('Roles & Permission Matrix Studio', 'রোল ও পারমিশন স্টুডিও')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define role boundaries, customize permissions per module, and create custom job templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateRoleOpen(true)}
            className="bg-primary hover:bg-primary/90 text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Create Custom Role', 'নতুন রোল তৈরি')}
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            'p-3 rounded-xl border text-xs flex items-center justify-between',
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          )}
        >
          <span>{feedback.message}</span>
          <Button variant="ghost" size="sm" onClick={() => setFeedback(null)} className="h-5 px-1.5 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role Navigation Column */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Role Template ({Array.isArray(roles) ? roles.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading roles...</div>
              ) : (
                (Array.isArray(roles) ? roles : []).map((role) => {
                  const isSelected = selectedRoleId === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between group',
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary dark:bg-primary/15 dark:border-primary/50 dark:text-white font-semibold shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                      )}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{role.name}</span>
                          {role.name_bn && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">({role.name_bn})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          {role.permissions?.length || 0} permissions granted
                        </div>
                      </div>

                      {role.is_system ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 shrink-0">
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30 shrink-0">
                          Custom
                        </Badge>
                      )}
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Matrix Editor Column */}
        <div className="lg:col-span-9 space-y-4">
          {selectedRole ? (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-xs">
              {/* Role Header & Save Toolbar */}
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {selectedRole.name}
                        {selectedRole.name_bn && (
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({selectedRole.name_bn})</span>
                        )}
                      </CardTitle>

                      {selectedRole.is_system ? (
                        <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          System Role
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30 text-[10px]">
                          Custom Role
                        </Badge>
                      )}

                      {!selectedRole.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditRoleName(selectedRole.name)
                            setEditRoleNameBn(selectedRole.name_bn || '')
                            setEditRoleDesc(selectedRole.description || '')
                            setIsEditRoleOpen(true)
                          }}
                          className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedRole.description || 'Configured permission template for team members.'}
                    </CardDescription>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2">
                    {unsavedChangesCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse">
                        {unsavedChangesCount} unsaved change(s)
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPermissions(new Set(selectedRole.permissions || []))
                        setFeedback(null)
                      }}
                      disabled={unsavedChangesCount === 0 || isPending}
                      className="border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSaveMatrix}
                      disabled={unsavedChangesCount === 0 || isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isPending ? 'Saving...' : 'Save Permissions'}
                    </Button>

                    {!selectedRole.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRoleToDelete(selectedRole)
                          setIsDeleteConfirmOpen(true)
                        }}
                        className="text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 h-8 px-2 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Category Selector Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-slate-200 dark:border-slate-800/80 no-scrollbar">
                  {(Object.keys(MODULE_CATEGORIES) as ModuleCategory[]).map((catKey) => {
                    const isSelected = selectedCategory === catKey
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setSelectedCategory(catKey)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer',
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white border border-slate-900 dark:border-slate-700 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                        )}
                      >
                        {tBilingual(MODULE_CATEGORIES[catKey].labelEn, MODULE_CATEGORIES[catKey].labelBn)}
                      </button>
                    )
                  })}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Search & Fast Batch Category Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Filter module or action..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1 font-medium">Batch:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategoryAction(selectedCategory, 'view_all')}
                      className="h-7 px-2 text-[11px] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      + Grant View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategoryAction(selectedCategory, 'grant_all')}
                      className="h-7 px-2 text-[11px] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      + Grant All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategoryAction(selectedCategory, 'revoke_delete')}
                      className="h-7 px-2 text-[11px] border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      - Revoke Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCategoryAction(selectedCategory, 'clear_all')}
                      className="h-7 px-2 text-[11px] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Clear Category
                    </Button>
                  </div>
                </div>

                {/* Module Permission Matrix Table */}
                <div className="space-y-3">
                  {filteredModules.map((moduleKey) => {
                    const spec = MODULE_ACTION_SPECS[moduleKey]
                    if (!spec) return null

                    return (
                      <div
                        key={moduleKey}
                        className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 p-3.5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-2.5">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {spec.label}
                              <span className="text-slate-500 dark:text-slate-400 font-normal">({spec.labelBn})</span>
                              <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                {moduleKey}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{spec.description}</div>
                          </div>
                        </div>

                        {/* Action Checkboxes */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {spec.actions.map((act) => {
                            const code = `${moduleKey}.${act}`
                            const isChecked = currentPermissions.has(code)
                            const isHighRisk = HIGH_RISK_PERMISSIONS.has(code)

                            return (
                              <button
                                key={act}
                                type="button"
                                onClick={() => handleTogglePermission(moduleKey, act)}
                                className={cn(
                                  'p-2 rounded-lg border text-left transition-all text-xs flex items-center justify-between gap-1.5 cursor-pointer',
                                  isChecked
                                    ? isHighRisk
                                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200 font-medium shadow-2xs'
                                      : 'bg-primary/10 dark:bg-primary/20 border-primary/40 dark:border-primary/50 text-primary dark:text-primary-foreground font-medium shadow-2xs'
                                    : isHighRisk
                                      ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:border-rose-300 dark:hover:border-rose-900/50'
                                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                )}
                              >
                                <span className="truncate flex items-center gap-1">
                                  {isHighRisk && <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />}
                                  {ACTION_LABELS[act]?.label || act}
                                </span>

                                {isChecked ? (
                                  <div
                                    className={cn(
                                      'w-4 h-4 rounded flex items-center justify-center text-white shrink-0',
                                      isHighRisk ? 'bg-rose-600' : 'bg-primary'
                                    )}
                                  >
                                    <Check className="w-3 h-3" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700 shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-md shadow-xs p-10 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-300">No Role Selected / কোনো রোল নির্বাচন করা হয়নি</p>
              <p className="text-xs text-slate-500 mt-1">Please select a role from the left menu or click reload to refresh permissions.</p>
              <Button variant="outline" size="sm" onClick={loadRoles} className="mt-4 border-slate-200 dark:border-slate-700 text-xs">
                Reload Roles / রোল রিফ্রেশ করুন
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* CREATE ROLE MODAL */}
      <ModalDialog
        open={isCreateRoleOpen}
        onOpenChange={setIsCreateRoleOpen}
        title="Create Custom Role Template (নতুন রোল তৈরি)"
        description="Define a new role with a custom name, Bengali label, and baseline permission set."
      >
        <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Role Name (English)</Label>
            <Input
              type="text"
              required
              placeholder="e.g. Pre-Press Lead, Shift Supervisor"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Role Name (বাংলা - ঐচ্ছিক)</Label>
            <Input
              type="text"
              placeholder="যেমনঃ প্রি-প্রেস প্রধান, শিফট সুপারভাইজার"
              value={newRoleNameBn}
              onChange={(e) => setNewRoleNameBn(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Clone Permissions from Existing Template</Label>
            <select
              value={newRoleBaseSlug}
              onChange={(e) => setNewRoleBaseSlug(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none"
            >
              {(Array.isArray(roles) ? roles : []).map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name} ({r.permissions?.length || 0} permissions)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Description</Label>
            <Input
              type="text"
              placeholder="Brief description of responsibilities..."
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateRoleOpen(false)}
              className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-xs font-semibold">
              {isPending ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* EDIT ROLE DETAILS MODAL */}
      <ModalDialog
        open={isEditRoleOpen}
        onOpenChange={setIsEditRoleOpen}
        title="Edit Custom Role Details"
        description="Update the name and description of this custom role template."
      >
        <form onSubmit={handleSaveRoleDetails} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Role Name (English)</Label>
            <Input
              type="text"
              required
              value={editRoleName}
              onChange={(e) => setEditRoleName(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Role Name (বাংলা)</Label>
            <Input
              type="text"
              value={editRoleNameBn}
              onChange={(e) => setEditRoleNameBn(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Description</Label>
            <Input
              type="text"
              value={editRoleDesc}
              onChange={(e) => setEditRoleDesc(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditRoleOpen(false)}
              className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-primary text-xs font-semibold">
              {isPending ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* DELETE ROLE CONFIRM */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDeleteRole}
        title="Delete Custom Role Template?"
        message={`Are you sure you want to permanently delete "${roleToDelete?.name}"? Users assigned to this role will revert to General Staff baseline.`}
        confirmText="Delete Role"
        isDestructive={true}
      />
    </div>
  )
}
