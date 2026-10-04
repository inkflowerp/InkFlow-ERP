'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useI18n } from '@/i18n/context'
import { ROLE_NAMES_BN } from './roles-matrix-tab'
import {
  Shield,
  Briefcase,
  GitBranch,
  Eye,
  AlertTriangle,
  Sliders,
  Loader2,
  Check,
  Lock,
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
  isUserBusinessOwner,
} from '@/lib/auth/rbac.client'
import { resolveUserRole, resolveUserDataScope } from './user-resolvers'
import { updateUserAccessAndPermissionsAction } from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'
import { cn } from '@/lib/utils'

interface EditUserAccessDialogProps {
  isOpen: boolean
  onClose: () => void
  user: CompanyUserWithProfile | null
  roles: RoleRow[]
  branches: BranchRow[]
  companyId: string
  tenantSlug: string
  allUsers?: CompanyUserWithProfile[]
  onSuccess: () => void
  onOpenAdvancedPermissions?: (user: CompanyUserWithProfile) => void
}

const RESPONSIBILITY_NAMES_BN: Record<string, string> = {
  'Material Request': 'উপাদান রিকুইজিশন',
  'Sales': 'বিক্রয়',
  'Quotation': 'কোটেশন',
  'Customer Management': 'গ্রাহক পরিচালনা',
  'Production': 'উৎপাদন',
  'Delivery': 'ডেলিভারি',
  'Design': 'ডিজাইন',
  'Approval': 'অনুমোদন',
  'Revision': 'সংশোধন',
  'Finishing': 'ফিনিশিং',
  'Machine Operation': 'মেশিন পরিচালনা',
  'Printing': 'প্রিন্টিং',
  'Inventory': 'ইনভেন্টরি',
  'Accounts': 'হিসাবরক্ষণ',
  'HR': 'মানবসম্পদ',
  'Installation': 'ইনস্টলেশন',
}

const DATA_SCOPE_OPTIONS: { id: DataScope; label: string; labelBn: string; desc: string; descBn: string }[] = [
  { id: 'own', label: 'My Work', labelBn: 'নিজের কাজ', desc: 'Only records created by or assigned to this user', descBn: 'শুধুমাত্র নিজের তৈরি বা সরাসরি বরাদ্দকৃত রেকর্ড' },
  { id: 'assigned', label: 'Assigned Work', labelBn: 'বরাদ্দকৃত কাজ', desc: 'Records explicitly assigned to this user or their queue', descBn: 'ব্যবহারকারী বা তার কিউ-তে নির্ধারিত রেকর্ড' },
  { id: 'department', label: 'Department', labelBn: 'বিভাগীয় কাজ', desc: 'All records belonging to the user’s designated department', descBn: 'ব্যবহারকারীর নির্ধারিত বিভাগের সকল রেকর্ড' },
  { id: 'branch', label: 'Branch', labelBn: 'শাখা ব্যাপী', desc: 'All records in the user’s primary or authorized branch', descBn: 'ব্যবহারকারীর প্রধান বা অনুমোদিত শাখার সকল রেকর্ড' },
  { id: 'company', label: 'Entire Company', labelBn: 'সমগ্র প্রতিষ্ঠান', desc: 'Universal access across all branches and departments', descBn: 'প্রতিষ্ঠানব্যাপী সকল শাখা ও বিভাগের উন্মুক্ত অ্যাক্সেস' },
]

export function EditUserAccessDialog({
  isOpen,
  onClose,
  user,
  roles = [],
  branches = [],
  companyId,
  tenantSlug,
  allUsers = [],
  onSuccess,
  onOpenAdvancedPermissions,
}: EditUserAccessDialogProps) {
  const { showToast } = useToast()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<string[]>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [additionalBranchIds, setAdditionalBranchIds] = useState<string[]>([])
  const [selectedScope, setSelectedScope] = useState<DataScope>('assigned')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isTargetOwner = useMemo(() => {
    if (!user) return false
    return isUserBusinessOwner(user)
  }, [user])

  const isLastActiveOwner = useMemo(() => {
    if (!user || !isTargetOwner) return false
    const activeOwners = (allUsers || []).filter(
      (u) => u.status === 'active' && isUserBusinessOwner(u)
    )
    return activeOwners.length <= 1 && user.status === 'active'
  }, [user, isTargetOwner, allUsers])

  // Initialize form state when user changes
  useEffect(() => {
    if (user) {
      const resolved = resolveUserRole(user, roles)
      const userIsOwner = isUserBusinessOwner(user) || resolved.slug === 'business_owner' || resolved.slug === 'owner'

      // Locate role row in roles list
      let matchedRole = roles.find((r) => r.id === user.roles?.[0]?.id)
      if (!matchedRole && userIsOwner) {
        matchedRole = roles.find((r) => r.slug === 'business_owner' || r.slug === 'owner')
      }
      if (!matchedRole) {
        matchedRole = roles.find((r) => r.slug === resolved.slug)
      }
      const rId = matchedRole?.id || roles[0]?.id || ''
      setSelectedRoleId(rId)

      let initialResps = [...(user.responsibilities || [])]
      if (userIsOwner && !initialResps.includes('business_owner')) {
        initialResps.unshift('business_owner')
      }
      setSelectedResponsibilities(initialResps)

      setPrimaryBranchId(user.branch_id || branches[0]?.id || '')
      setAdditionalBranchIds(
        (user.authorized_branch_ids || []).filter((id) => id !== user.branch_id)
      )

      const initialScope = userIsOwner
        ? 'company'
        : (resolveUserDataScope(user, resolved.slug) as DataScope)
      setSelectedScope(initialScope)
    }
  }, [user, roles, branches, isOpen])

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null
  }, [roles, selectedRoleId])

  const initialRoleId = user?.roles?.[0]?.id || ''
  const isRoleChanged = selectedRoleId !== '' && selectedRoleId !== initialRoleId

  // When changing role, suggest responsibility presets
  const handleRoleChange = (newRoleId: string) => {
    if (isLastActiveOwner) {
      showToast({
        type: 'error',
        title: isBn ? 'সুরক্ষা সতর্কতা' : 'Protection Alert',
        message: isBn
          ? 'সর্বশেষ সক্রিয় ব্যবসা স্বত্বাধিকারীর রোল পরিবর্তন করা যাবে না। প্রথমে অন্য কাউকে স্বত্বাধিকারী করুন।'
          : 'Cannot remove or demote the last active Business Owner. Assign or transfer ownership first.',
      })
      return
    }

    setSelectedRoleId(newRoleId)
    const targetRole = roles.find((r) => r.id === newRoleId)
    if (targetRole) {
      const targetIsOwner = targetRole.slug === 'business_owner' || targetRole.slug === 'owner'
      const presets = getResponsibilityPresetsForRole(targetRole.slug || targetRole.name)
      if (targetIsOwner && !presets.includes('business_owner')) {
        presets.unshift('business_owner')
      }
      setSelectedResponsibilities(presets)
      const defaultScope = targetIsOwner ? 'company' : getPracticalDefaultDataScope(targetRole.slug || targetRole.name)
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
      const targetRole = roles.find((r) => r.id === selectedRoleId)
      const isRoleOwner = targetRole?.slug === 'business_owner' || targetRole?.slug === 'owner'
      const shouldBeOwner = isRoleOwner || (isTargetOwner && !isRoleChanged)

      // Guard: Cannot demote last active owner
      if (isLastActiveOwner && !shouldBeOwner) {
        showToast({
          type: 'error',
          title: isBn ? 'অনুমতি অস্বীকৃত' : 'Permission Denied',
          message: isBn
            ? 'সর্বশেষ সক্রিয় ব্যবসা স্বত্বাধিকারীর রোল পরিবর্তন করা যাবে না। প্রথমে অন্য কাউকে স্বত্বাধিকারী করুন।'
            : 'Cannot remove or demote the last active Business Owner. Assign or transfer ownership first.',
        })
        setIsSubmitting(false)
        return
      }

      // Build data scopes dictionary
      const finalScope = shouldBeOwner ? 'company' : selectedScope
      const scopesDict: Record<string, DataScope> = {
        customers: finalScope,
        quotations: finalScope,
        orders: finalScope,
        design: finalScope === 'company' ? 'company' : 'assigned',
        invoices: finalScope === 'company' ? 'company' : finalScope,
        payments: finalScope === 'company' ? 'company' : finalScope,
        production: finalScope === 'company' ? 'company' : 'assigned',
        machineries: finalScope,
        inventory: finalScope === 'company' ? 'company' : 'branch',
        reports: finalScope === 'company' ? 'company' : 'branch',
        delivery: finalScope,
      }

      const allAuthorizedBranches = Array.from(
        new Set([primaryBranchId, ...additionalBranchIds].filter(Boolean))
      )

      let finalResponsibilities = [...selectedResponsibilities]
      if (shouldBeOwner && !finalResponsibilities.includes('business_owner')) {
        finalResponsibilities.unshift('business_owner')
      }

      const res = await updateUserAccessAndPermissionsAction({
        companyUserId: user.id,
        companyId,
        tenantSlug,
        roleId: selectedRoleId,
        responsibilities: finalResponsibilities,
        branchId: primaryBranchId || null,
        authorizedBranchIds: allAuthorizedBranches,
        dataScopes: scopesDict,
      })

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Access Updated',
          titleBn: 'এক্সেস আপডেট করা হয়েছে',
          message: isBn
            ? 'ব্যবহারকারীর রোল, দায়িত্ব ও শাখা অ্যাক্সেস সফলভাবে সংরক্ষিত হয়েছে।'
            : 'User role, responsibilities, and branch access saved successfully.',
        })
        onSuccess()
        onClose()
      } else {
        showToast({
          type: 'error',
          title: 'Update Failed',
          titleBn: 'আপডেট ব্যর্থ হয়েছে',
          message: res.message || res.error || (isBn ? 'ব্যবহারকারীর অ্যাক্সেস আপডেট করা সম্ভব হয়নি' : 'Failed to update user access'),
        })
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || (isBn ? 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে' : 'An unexpected error occurred'),
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
      title={tBilingual('Edit User Access', 'ব্যবহারকারীর অ্যাক্সেস সম্পাদনা')}
      description={tBilingual(
        `Configure access rights, operational duties, and branch scope for ${userName}.`,
        `${userName}-এর জন্য অ্যাক্সেস ক্ষমতা, দায়িত্ব ও শাখা স্কোপ নির্ধারণ করুন।`
      )}
      hideFooter={true}
      size="2xl"
    >
      <div className="space-y-5 pt-1">
        {/* Last Active Owner Protection Banner */}
        {isLastActiveOwner && (
          <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs text-foreground flex items-center gap-2.5 shadow-2xs">
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <span className="font-semibold text-primary">
                {tBilingual('Last Active Business Owner Protection:', 'সর্বশেষ সক্রিয় স্বত্বাধিকারী সুরক্ষা:')}
              </span>{' '}
              {tBilingual(
                'This user is the sole active Business Owner. The role template cannot be demoted and universal company data access is enforced.',
                'এই ব্যবহারকারী প্রতিষ্ঠানের একমাত্র সক্রিয় স্বত্বাধিকারী। এই রোলটি ডিমোট করা যাবে না এবং সার্বজনীন প্রতিষ্ঠান অ্যাক্সেস বলবৎ থাকবে।'
              )}
            </div>
          </div>
        )}

        {/* 1. Primary Role Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Role Template', 'রোল টেমপ্লেট')}
            </Label>
            {isTargetOwner && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                {tBilingual('Business Owner Account', 'ব্যবসা স্বত্বাধিকারী অ্যাকাউন্ট')}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roles.map((r) => {
              const isSelected = selectedRoleId === r.id
              const isNonOwnerOption = r.slug !== 'business_owner' && r.slug !== 'owner'
              const isDisabledByProtection = isLastActiveOwner && isNonOwnerOption

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => !isDisabledByProtection && handleRoleChange(r.id)}
                  disabled={isDisabledByProtection}
                  className={cn(
                    'p-2.5 rounded-lg border text-left transition-all relative',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary font-semibold shadow-2xs'
                      : 'border-border hover:bg-muted text-foreground',
                    isDisabledByProtection && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-xs font-semibold truncate">
                      {isBn ? (r.name_bn || ROLE_NAMES_BN[r.slug || ''] || ROLE_NAMES_BN[r.name] || r.name) : r.name}
                    </div>
                    {isDisabledByProtection && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {r.name_bn || r.slug}
                  </div>
                </button>
              )
            })}
          </div>

          {isRoleChanged && !isLastActiveOwner && (
            <div className="p-2.5 bg-warning-surface border border-warning/30 rounded-lg text-xs text-warning flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <span>
                {tBilingual(
                  'Role changed. Default permissions and responsibility presets have been updated.',
                  'রোল পরিবর্তিত হয়েছে। ডিফল্ট অনুমতি এবং দায়িত্ব প্রিসেট আপডেট করা হয়েছে।'
                )}
              </span>
            </div>
          )}
        </div>

        {/* 2. Responsibilities Multi-select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Assigned Responsibilities', 'নির্ধারিত দায়িত্বসমূহ')} ({selectedResponsibilities.length})
            </Label>
            <span className="text-xs text-muted-foreground">
              {tBilingual('Select all duties performed', 'সকল কার্যকর দায়িত্ব নির্বাচন করুন')}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-3 border border-border rounded-lg bg-muted/40">
            {PRACTICAL_RESPONSIBILITIES.map((resp) => {
              const isChecked = selectedResponsibilities.includes(resp)
              return (
                <button
                  key={resp}
                  type="button"
                  onClick={() => toggleResponsibility(resp)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer',
                    isChecked
                      ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                      : 'bg-card text-foreground border border-border hover:border-input'
                  )}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                  <span>{isBn ? (RESPONSIBILITY_NAMES_BN[resp] || resp) : resp}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Branch Access & Data Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Primary Branch', 'প্রধান শাখা')}
            </Label>
            <select
              value={primaryBranchId}
              onChange={(e) => setPrimaryBranchId(e.target.value)}
              className="w-full text-sm rounded-lg border border-input bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {isBn ? ((b as any).name_bn || b.name) : b.name} {(b as any).is_head_office || (b as any).is_main ? (isBn ? '(প্রধান)' : '(Main)') : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Data Scope', 'ডেটা স্কোপ')}
            </Label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as DataScope)}
              disabled={isLastActiveOwner || selectedRole?.slug === 'business_owner' || selectedRole?.slug === 'owner'}
              className="w-full text-sm rounded-lg border border-input bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {DATA_SCOPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {isBn ? opt.labelBn : opt.label} — {isBn ? opt.descBn : opt.desc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Company Scope Alert */}
        {selectedScope === 'company' && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-foreground flex items-start gap-2 shadow-2xs">
            <Eye className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div>
              <strong className="text-primary">{tBilingual('Entire Company Scope:', 'সমগ্র প্রতিষ্ঠান স্কোপ:')}</strong>{' '}
              {tBilingual(
                'This user will have visibility into company-wide orders, customers, and operations allowed by their role permissions.',
                'এই ব্যবহারকারী তাদের রোলের অনুমতি অনুযায়ী প্রতিষ্ঠানব্যাপী সকল অর্ডার, গ্রাহক ও কার্যক্রমে প্রবেশ করতে পারবেন।'
              )}
            </div>
          </div>
        )}

        {/* Additional Branches (if more than 1 branch in company) */}
        {branches.length > 1 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {tBilingual('Additional Authorized Branches', 'অতিরিক্ত অনুমোদিত শাখাসমূহ')}
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
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer',
                        isChecked
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {isChecked && <Check className="h-3 w-3 text-primary" />}
                      <span>{isBn ? ((b as any).name_bn || b.name) : b.name}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Permission Preview & Customize Link */}
        <div className="p-3 bg-muted/60 border border-border rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-foreground">
              {defaultPermissionsCount} {tBilingual('Default Permissions', 'ডিফল্ট অনুমতি')}
            </span>
            <span className="text-muted-foreground ml-1.5">
              {tBilingual('based on ', 'ভিত্তি: ')}
              {isBn
                ? (ROLE_NAMES_BN[selectedRole?.slug || ''] || ROLE_NAMES_BN[selectedRole?.name || ''] || selectedRole?.name || 'রোল')
                : (selectedRole?.name || 'role')}
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
              className="text-xs gap-1.5 h-7 border-border hover:bg-muted"
            >
              <Sliders className="h-3 w-3 text-primary" />
              {tBilingual('Customize Permissions', 'অনুমতি কাস্টমাইজ করুন')}
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            {tBilingual('Cancel', 'বাতিল')}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || !selectedRoleId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {tBilingual('Save Changes', 'পরিবর্তন সংরক্ষণ করুন')}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
