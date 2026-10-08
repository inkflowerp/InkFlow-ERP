'use client'

import React from 'react'
import { useI18n } from '@/i18n/context'
import { ROLE_NAMES_BN } from './roles-matrix-tab'
import {
 User,
 Shield,
 Briefcase,
 GitBranch,
 KeyRound,
 MoreVertical,
 UserCheck,
 UserX,
 Trash2,
 Edit2,
 AlertCircle,
 Eye,
 CheckCircle2,
 Clock,
 Lock,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getResponsibilityPresetsForRole, isUserBusinessOwner } from '@/lib/auth/rbac.client'
import { formatDateTime, formatBranchName } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { resolveUserRole, resolveUserDataScope, resolveUserResponsibilities } from './user-resolvers'

interface UserCardProps {
 user: CompanyUserWithProfile
 roles: RoleRow[]
 branches: BranchRow[]
 currentUserId?: string
 tenantSlug: string
 companyId: string
 onViewDetails: (user: CompanyUserWithProfile) => void
 onEditAccess: (user: CompanyUserWithProfile) => void
 onLinkEmployee: (user: CompanyUserWithProfile) => void
 onToggleStatus: (user: CompanyUserWithProfile) => void
 onResetPassword: (user: CompanyUserWithProfile) => void
  onResendInvitation?: (user: CompanyUserWithProfile) => void
  onCustomizePermissions?: (user: CompanyUserWithProfile) => void
 onRemoveLogin: (user: CompanyUserWithProfile) => void
 isLastActiveOwner?: boolean
}

function getRoleBadgeStyle(roleName: string) {
 const norm = roleName.toLowerCase()
 if (norm.includes('owner')) {
 return 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border'
  }
 if (norm.includes('manager') || norm.includes('admin')) {
 return 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border'
  }
 if (norm.includes('sales')) {
 return 'bg-success-surface text-success border-success-border bg-success-surface text-success border-success-border'
  }
 if (norm.includes('design')) {
 return 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border'
  }
 if (norm.includes('operator') || norm.includes('production')) {
 return 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-warning border-warning-border'
  }
 if (norm.includes('account') || norm.includes('cashier')) {
 return 'bg-primary/10 text-primary border-primary/20 bg-primary/10 text-primary border-border'
  }
 return 'bg-muted text-foreground border-border '
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

function getDataScopeBadge(scope?: string, isBn?: boolean) {
  const s = scope || 'branch'
  if (s === 'company') {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-warning-surface text-warning border border-warning-border bg-warning-surface text-warning border-warning-border whitespace-nowrap">
        {isBn ? 'সমগ্র প্রতিষ্ঠান' : 'Entire Company'}
      </span>
    )
  }
  if (s === 'branch') {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 bg-primary/10 text-primary border-border whitespace-nowrap">
        {isBn ? 'শাখা' : 'Branch'}
      </span>
    )
  }
  if (s === 'department') {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-success-surface text-success border border-success-border bg-success-surface text-success border-success-border whitespace-nowrap">
        {isBn ? 'বিভাগ' : 'Department'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-foreground border border-border whitespace-nowrap">
      {isBn ? 'বরাদ্দকৃত / নিজস্ব' : 'Assigned / Own'}
    </span>
  )
}

export function UserCard({
 user,
 roles,
 branches,
 currentUserId,
 tenantSlug,
 companyId,
 onViewDetails,
 onEditAccess,
 onLinkEmployee,
 onToggleStatus,
 onResetPassword,
  onResendInvitation,
  onCustomizePermissions,
  onRemoveLogin,
 isLastActiveOwner,
}: UserCardProps) {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
 const branchMap = React.useMemo(() => {
 const map = new Map<string, BranchRow>()
 branches.forEach((b) => map.set(b.id, b))
 return map
  }, [branches])
  const getBranchName = (bId?: string | null) => {
    if (!bId) return isBn ? 'প্রধান শাখা' : 'Main Branch'
    const b = branchMap.get(bId)
    return formatBranchName(b?.name, isBn ? 'bn' : 'en', (b as any)?.name_bn)
  }

  const resolvedRole = resolveUserRole(user, roles)
  const roleName = resolvedRole.name
  const roleNameBn = resolvedRole.nameBn
  const resolvedScope = resolveUserDataScope(user, resolvedRole.slug)
  const isCurrentUser = currentUserId && (user.user_id === currentUserId || user.id === currentUserId)
  const isUserActive = user.status === 'active'
  const isUserInvited = user.status === 'invited'
  const isUserDisabled = user.status === 'disabled'
  const lastLogin = user.last_login_at || (user.profile as any)?.last_sign_in_at
  const responsibilities = resolveUserResponsibilities(user, resolvedRole.slug)
  const topResponsibilities = responsibilities.slice(0, 3)

 const name = user.profile?.full_name || user.linked_employee?.name || user.profile?.email || 'User'
 const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0])
    .join('')
    .toUpperCase()

 return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3.5">
      {/* Top Header: Identity & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={user.profile?.avatar_url || user.linked_employee?.profile_picture_url || (user.linked_employee as any)?.avatar_url || null}
            fallback={initials}
            className="w-10 h-10 border border-border flex-shrink-0 text-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate text-sm">
                {user.profile?.full_name || user.linked_employee?.name || tBilingual('Unnamed User', 'নামহীন ব্যবহারকারী')}
              </span>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs py-0 px-1.5 border-primary/20 text-primary bg-primary/10/50">{tBilingual('You', 'আপনি')}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.profile?.email || tBilingual('No email registered', 'কোনো ইমেইল নেই')}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex-shrink-0">
          {isUserActive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success text-success bg-success-surface bg-success-surface px-2 py-0.5 rounded-full border border-success-border border-success-border">
              <span className="w-1.5 h-1.5 rounded-full bg-success"/>
              {tBilingual('Active', 'সক্রিয়')}
            </span>
          )}
          {isUserInvited && (
            <div className="flex flex-col items-end gap-0.5">
              {user.is_expired ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-destructive shrink-0"/>
                  {tBilingual('Expired', 'মেয়াদোত্তীর্ণ')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning text-warning bg-warning-surface bg-warning-surface px-2 py-0.5 rounded-full border border-warning-border border-warning-border whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"/>
                  {tBilingual('Invited', 'আমন্ত্রিত')}
                </span>
              )}
              {user.invitation_expires_at && !user.is_expired && (
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {(() => {
                    const diffMs = new Date(user.invitation_expires_at).getTime() - Date.now()
                    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                    return daysLeft > 0
                      ? tBilingual(`Expires in ${daysLeft}d`, `${daysLeft} দিন বাকি`)
                      : tBilingual('Expiring today', 'আজই মেয়াদ শেষ')
                  })()}
                </span>
              )}
            </div>
          )}
          {isUserDisabled && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"/>
              {tBilingual('Disabled', 'নিষ্ক্রিয়')}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Linked Workforce Employee Banner */}
      <div className="bg-muted rounded-lg p-2.5 border border-border /60 flex items-center justify-between gap-2">
        {user.linked_employee ? (
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground font-medium">{tBilingual('Linked Employee', 'সংযুক্ত কর্মী')}</div>
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <UserCheck className="w-3.5 h-3.5 text-success text-success flex-shrink-0"/>
              <span className="truncate">{user.linked_employee.name}</span>
              {user.linked_employee.employee_id_number && (
                <span className="font-mono text-xs bg-card px-1 rounded border border-border">
                  {user.linked_employee.employee_id_number}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-warning text-warning">
            <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0"/>
            <span className="text-xs font-medium">{tBilingual('No linked workforce record', 'কোনো কর্মী প্রোফাইল সংযুক্ত নেই')}</span>
          </div>
        )}

        <Button
 variant="ghost"size="sm"onClick={() => onLinkEmployee(user)}
 className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 text-primary flex-shrink-0 font-medium min-h-[36px]">
          {user.linked_employee ? tBilingual('Change', 'পরিবর্তন') : tBilingual('Link', 'যুক্ত করুন')}
        </Button>
      </div>

      {/* Row 3: Role, Scope & Branch */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{tBilingual('Role & Scope', 'রোল ও পরিসর')}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap', getRoleBadgeStyle(roleName))}>
              {isBn ? roleNameBn : roleName}
            </span>
            {getDataScopeBadge(resolvedScope, isBn)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{tBilingual('Branch Access', 'শাখা অ্যাক্সেস')}</div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
            <span className="truncate">{getBranchName(user.branch_id)}</span>
          </div>
        </div>
      </div>

      {/* Row 4: Responsibilities */}
      {topResponsibilities.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="text-xs text-muted-foreground">{tBilingual('Assigned Duties', 'নির্ধারিত দায়িত্ব')}</div>
          <div className="flex flex-wrap gap-1">
            {topResponsibilities.map((resp) => (
              <span
                key={resp}
                className="inline-flex items-center text-xs bg-muted text-foreground px-2 py-0.5 rounded-md border border-border font-medium"
              >
                {isBn ? (RESPONSIBILITY_NAMES_BN[resp] || resp) : resp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Last Login Meta & Touch Action Buttons */}
      <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground"/>
          <span>
            {lastLogin ? formatDateTime(lastLogin, isBn ? 'bn' : 'en') : tBilingual('Never logged in', 'কখনও লগইন করেননি')}
          </span>
        </div>

        {/* Buttons (min-h-[44px] touch target for accessibility) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditAccess(user)}
            className="h-10 min-h-[44px] px-3 text-xs font-medium text-foreground border-border">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-primary"/>
            {tBilingual('Access', 'অ্যাক্সেস')}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onViewDetails(user)}
            className="h-10 min-h-[44px] px-3.5 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
            <Eye className="w-3.5 h-3.5 mr-1.5"/>
            {tBilingual('Details', 'বিস্তারিত')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                <MoreVertical className="w-4 h-4"/>
                <span className="sr-only">{tBilingual('More options', 'আরো অপশন')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEditAccess(user)}>
                <Shield className="w-4 h-4 mr-2 text-primary"/>
                <span>{tBilingual('Edit Access & Role', 'অ্যাক্সেস ও রোল সম্পাদনা')}</span>
              </DropdownMenuItem>
              {onCustomizePermissions && (
                <DropdownMenuItem onClick={() => onCustomizePermissions(user)}>
                  <Sliders className="w-4 h-4 mr-2 text-primary"/>
                  <span>{tBilingual('Permission Overrides', 'পারমিশন ওভাররাইড')}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <KeyRound className="w-4 h-4 mr-2 text-warning"/>
                <span>{tBilingual('Reset Password', 'পাসওয়ার্ড রিসেট')}</span>
              </DropdownMenuItem>
              {isUserInvited && onResendInvitation && (
                <DropdownMenuItem onClick={() => onResendInvitation(user)}>
                  <RefreshCw className="w-4 h-4 mr-2 text-primary"/>
                  <span>{tBilingual('Resend Invitation', 'পুনরায় আমন্ত্রণ পাঠান')}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {!isCurrentUser && !isLastActiveOwner && (
                <DropdownMenuItem
                  onClick={() => onToggleStatus(user)}
                  className={isUserActive ? 'text-warning' : 'text-success'}
                >
                  {isUserActive ? (
                    <>
                      <UserX className="w-4 h-4 mr-2"/>
                      <span>{tBilingual('Disable Login', 'লগইন নিষ্ক্রিয় করুন')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2"/>
                      <span>{tBilingual('Enable Login', 'লগইন সক্রিয় করুন')}</span>
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {!isCurrentUser && !isLastActiveOwner && (
                <DropdownMenuItem
                  onClick={() => onRemoveLogin(user)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2"/>
                  <span>{tBilingual('Remove Login', 'লগইন মুছে ফেলুন')}</span>
                </DropdownMenuItem>
              )}

              {isLastActiveOwner && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 italic">
                  <Lock className="w-3 h-3 text-warning shrink-0" />
                  <span>{tBilingual('Sole active owner protected', 'একমাত্র সক্রিয় স্বত্বাধিকারী সুরক্ষিত')}</span>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

