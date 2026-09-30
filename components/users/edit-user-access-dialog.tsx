'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Briefcase,
  GitBranch,
  Eye,
  AlertTriangle,
  Sliders,
  Loader2,
  Check,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { DataScope } from '@/types/rbac.types'
import {
  PRACTICAL_RESPONSIBILITIES,
  getResponsibilityPresetsForRole,
  getPracticalDefaultDataScope,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '@/lib/auth/rbac.client'
import { updateUserAccessAndPermissionsAction } from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'

interface EditUserAccessDialogProps {
  isOpen: boolean
  onClose: () => void
  user: CompanyUserWithProfile | null
  roles: RoleRow[]
  branches: BranchRow[]
  companyId: string
  tenantSlug: string
  onSuccess: () => void
  onOpenAdvancedPermissions?: (user: CompanyUserWithProfile) => void
}

const DATA_SCOPE_OPTIONS: { id: DataScope; label: string; labelBn: string; desc: string }[] = [
  { id: 'own', label: 'My Work', labelBn: 'নিজের কাজ', desc: 'Only records created by or assigned to this user' },
  { id: 'assigned', label: 'Assigned Work', labelBn: 'বরাদ্দকৃত কাজ', desc: 'Records explicitly assigned to this user or their queue' },
  { id: 'department', label: 'Department', labelBn: 'বিভাগীয় কাজ', desc: 'All records belonging to the user’s designated department' },
  { id: 'branch', label: 'Branch', labelBn: 'শাখা ব্যাপী', desc: 'All records in the user’s primary or authorized branch' },
  { id: 'company', label: 'Entire Company', labelBn: 'সমগ্র প্রতিষ্ঠান', desc: 'Universal access across all branches and departments' },
]

export function EditUserAccessDialog({
  isOpen,
  onClose,
  user,
  roles = [],
  branches = [],
  companyId,
  tenantSlug,
  onSuccess,
  onOpenAdvancedPermissions,
}: EditUserAccessDialogProps) {
  const { showToast } = useToast()

  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<string[]>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [additionalBranchIds, setAdditionalBranchIds] = useState<string[]>([])
  const [selectedScope, setSelectedScope] = useState<DataScope>('assigned')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form state when user changes
  useEffect(() => {
    if (user) {
      const currentRole = user.roles?.[0]
      const rId = currentRole?.id || roles[0]?.id || ''
      setSelectedRoleId(rId)
      setSelectedResponsibilities(user.responsibilities || [])
      setPrimaryBranchId(user.branch_id || branches[0]?.id || '')
      setAdditionalBranchIds(
        (user.authorized_branch_ids || []).filter((id) => id !== user.branch_id)
      )
      const primaryScope = user.data_scopes?.orders || user.data_scopes?.customers || 'assigned'
      setSelectedScope(primaryScope)
    }
  }, [user, roles, branches, isOpen])

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null
  }, [roles, selectedRoleId])

  const initialRoleId = user?.roles?.[0]?.id || ''
  const isRoleChanged = selectedRoleId !== '' && selectedRoleId !== initialRoleId

  // When changing role, suggest responsibility presets
  const handleRoleChange = (newRoleId: string) => {
    setSelectedRoleId(newRoleId)
    const targetRole = roles.find((r) => r.id === newRoleId)
    if (targetRole) {
      const presets = getResponsibilityPresetsForRole(targetRole.slug || targetRole.name)
      setSelectedResponsibilities(presets)
      const defaultScope = getPracticalDefaultDataScope(targetRole.slug || targetRole.name)
      setSelectedScope(defaultScope)
    }
  }

  const toggleResponsibility = (resp: string) => {
    setSelectedResponsibilities((prev) =>
      prev.includes(resp) ? prev.filter((r) => r !== resp) : [...prev, resp]
    )
  }

  const toggleAdditionalBranch = (bId: string) => {
    setAdditionalBranchIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    )
  }

  // Count default permissions preview
  const defaultPermissionsCount = useMemo<number>(() => {
    if (!selectedRole?.slug) return 0
    const matrix = (DEFAULT_RESPONSIBILITY_MATRICES as Record<string, any>)[selectedRole.slug]
    if (!matrix) return 0
    let count = 0
    for (const mod of Object.values(matrix)) {
      if (mod && typeof mod === 'object') {
        count += Object.values(mod).filter(Boolean).length
      }
    }
    return count
  }, [selectedRole])

  const handleSave = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      // Build data scopes dictionary
      const scopesDict: Record<string, DataScope> = {
        customers: selectedScope,
        quotations: selectedScope,
        orders: selectedScope,
        design: selectedScope === 'company' ? 'company' : 'assigned',
        invoices: selectedScope === 'company' ? 'company' : selectedScope,
        payments: selectedScope === 'company' ? 'company' : selectedScope,
        production: selectedScope === 'company' ? 'company' : 'assigned',
        machineries: selectedScope,
        inventory: selectedScope === 'company' ? 'company' : 'branch',
        reports: selectedScope === 'company' ? 'company' : 'branch',
        delivery: selectedScope,
      }

      const allAuthorizedBranches = Array.from(
        new Set([primaryBranchId, ...additionalBranchIds].filter(Boolean))
      )

      const res = await updateUserAccessAndPermissionsAction({
        companyUserId: user.id,
        companyId,
        tenantSlug,
        responsibilities: selectedResponsibilities,
        branchId: primaryBranchId || null,
        authorizedBranchIds: allAuthorizedBranches,
        dataScopes: scopesDict,
      })

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Access Updated',
          titleBn: 'এক্সেস আপডেট করা হয়েছে',
          message: 'User role, responsibilities, and branch access saved successfully.',
        })
        onSuccess()
        onClose()
      } else {
        showToast({
          type: 'error',
          title: 'Update Failed',
          titleBn: 'আপডেট ব্যর্থ হয়েছে',
          message: res.message || res.error || 'Failed to update user access',
        })
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || 'An unexpected error occurred',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const userName = user?.profile?.full_name || user?.invited_email || 'Team User'

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Edit User Access"
      description={`Configure access rights, operational duties, and branch scope for ${userName}.`}
      hideFooter={true}
      size="2xl"
    >
      <div className="space-y-5 pt-1">
        {/* 1. Primary Role Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Role Template
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roles.map((r) => {
              const isSelected = selectedRoleId === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{r.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {r.name_bn || r.slug}
                  </div>
                </button>
              )
            })}
          </div>

          {isRoleChanged && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Role changed. Default permissions and responsibility presets have been updated.</span>
            </div>
          )}
        </div>

        {/* 2. Responsibilities Multi-select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Responsibilities ({selectedResponsibilities.length})
            </Label>
            <span className="text-[11px] text-slate-400">Select all duties performed</span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
            {PRACTICAL_RESPONSIBILITIES.map((resp) => {
              const isChecked = selectedResponsibilities.includes(resp)
              return (
                <button
                  key={resp}
                  type="button"
                  onClick={() => toggleResponsibility(resp)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isChecked
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                  <span>{resp}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Branch Access */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Primary Branch
            </Label>
            <select
              value={primaryBranchId}
              onChange={(e) => setPrimaryBranchId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {(b as any).is_head_office ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data Scope
            </Label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as DataScope)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {DATA_SCOPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} — {opt.desc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Company Scope Alert */}
        {selectedScope === 'company' && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
            <Eye className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <strong>Entire Company Scope:</strong> This user will have visibility into company-wide orders, customers, and operations allowed by their role permissions.
            </div>
          </div>
        )}

        {/* Additional Branches (if more than 1 branch in company) */}
        {branches.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Additional Authorized Branches
            </Label>
            <div className="flex flex-wrap gap-2">
              {branches
                .filter((b) => b.id !== primaryBranchId)
                .map((b) => {
                  const isChecked = additionalBranchIds.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleAdditionalBranch(b.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3 text-blue-600" />}
                      <span>{b.name}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Permission Preview & Customize Link */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {defaultPermissionsCount} Default Permissions
            </span>
            <span className="text-slate-500 dark:text-slate-400 ml-1.5">
              based on {selectedRole?.name || 'role'}
            </span>
          </div>

          {onOpenAdvancedPermissions && user && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onOpenAdvancedPermissions(user)
              }}
              className="text-xs gap-1.5 h-7"
            >
              <Sliders className="h-3 w-3" />
              Customize Permissions
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || !selectedRoleId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
