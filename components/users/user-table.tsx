'use client'

import React from 'react'
import { useI18n } from '@/i18n/context'
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
  ExternalLink,
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

interface UserTableProps {
 users: CompanyUserWithProfile[]
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
 onRefresh: () => void
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

import { ROLE_NAMES_BN } from './roles-matrix-tab'

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

export function UserTable({
 users,
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
}: UserTableProps) {
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


  const activeOwnersCount = React.useMemo(() => {
    return users.filter((u) => u.status === 'active' && isUserBusinessOwner(u)).length
  }, [users])

 const getUserInitials = (user: CompanyUserWithProfile) => {
 const name = user.profile?.full_name || user.linked_employee?.name || user.profile?.email || 'U'
 const parts = name.trim().split(/\s+/)
 if (parts.length >= 2) {
 return (parts[0][0] + parts[1][0]).toUpperCase()
    }
 return name.slice(0, 2).toUpperCase()
  }

 return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/75 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th scope="col" className="px-5 py-3.5 whitespace-nowrap">{tBilingual('User', 'ব্যবহারকারী')}</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{tBilingual('Linked Employee', 'সংযুক্ত কর্মী')}</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{tBilingual('Role & Scope', 'রোল ও পরিসর')}</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{tBilingual('Key Responsibilities', 'মূল দায়িত্ব')}</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{tBilingual('Branch Access', 'শাখা অ্যাক্সেস')}</th>
              <th scope="col" className="px-4 py-3.5 text-center whitespace-nowrap">{tBilingual('Status', 'স্ট্যাটাস')}</th>
              <th scope="col" className="px-4 py-3.5 whitespace-nowrap">{tBilingual('Last Login', 'সর্বশেষ লগইন')}</th>
              <th scope="col" className="px-5 py-3.5 text-right whitespace-nowrap min-w-[110px]">{tBilingual('Actions', 'অ্যাকশন')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border/80">
            {users.map((u) => {
              const resolvedRole = resolveUserRole(u, roles)
              const roleName = resolvedRole.name
              const roleNameBn = resolvedRole.nameBn
              const isCurrentUser = currentUserId && (u.user_id === currentUserId || u.id === currentUserId)
              const initials = getUserInitials(u)
              const responsibilities = resolveUserResponsibilities(u, resolvedRole.slug)
              const topResponsibilities = responsibilities.slice(0, 2)
              const extraCount = responsibilities.length - topResponsibilities.length
              const isUserActive = u.status === 'active'
              const isUserInvited = u.status === 'invited'
              const isUserDisabled = u.status === 'disabled'
              const lastLogin = u.last_login_at || (u.profile as any)?.last_sign_in_at
              const resolvedScope = resolveUserDataScope(u, resolvedRole.slug)
              const isRowOwner = isUserBusinessOwner(u)
              const isLastActiveOwner = isRowOwner && isUserActive && activeOwnersCount <= 1

 return (
                <tr
 key={u.id}
 onClick={() => onViewDetails(u)}
 className="hover:bg-muted/70 dark:hover:bg-muted/40 cursor-pointer transition-colors group">
                  {/* Column 1: User Identity */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={u.profile?.avatar_url || u.linked_employee?.profile_picture_url || (u.linked_employee as any)?.avatar_url || null}
                        fallback={initials}
                        className="w-9 h-9 border border-border flex-shrink-0 group-hover:border-border transition-colors text-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate text-sm">
                            {u.profile?.full_name || u.linked_employee?.name || tBilingual('Unnamed User', 'নামহীন ব্যবহারকারী')}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 border-primary/20 text-primary text-primary bg-primary/10/50">{tBilingual('You', 'আপনি')}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.profile?.email || tBilingual('No email registered', 'কোনো ইমেইল নেই')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Linked Workforce Employee */}
                  <td className="px-4 py-3.5"onClick={(e) => e.stopPropagation()}>
                    {u.linked_employee ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-success text-success flex-shrink-0"/>
                          <span className="truncate">{u.linked_employee.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {u.linked_employee.employee_id_number && (
                            <span className="font-mono bg-muted px-1 rounded text-xs border border-border">
                              {u.linked_employee.employee_id_number}
                            </span>
                          )}
                          <span className="truncate">{u.linked_employee.role || u.linked_employee.department || tBilingual('Workforce', 'কর্মী')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-warning text-warning bg-warning-surface bg-warning-surface px-2 py-1 rounded-md border border-warning-border border-warning-border font-medium whitespace-nowrap shrink-0">
                          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0"/>
                          {tBilingual('No Employee Profile', 'কর্মী প্রোফাইল নেই')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLinkEmployee(u)}
                          className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 text-primary dark:hover:bg-primary/10 font-medium whitespace-nowrap shrink-0">
                          {tBilingual('Link', 'যুক্ত করুন')}
                        </Button>
                      </div>
                    )}
                  </td>

                  {/* Column 3: Role & Data Scope */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap', getRoleBadgeStyle(roleName))}>
                        {isBn ? roleNameBn : roleName}
                      </span>
                      {getDataScopeBadge(resolvedScope, isBn)}
                    </div>
                  </td>

                  {/* Column 4: Key Responsibilities */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                      {topResponsibilities.length > 0 ? (
                        topResponsibilities.map((resp) => (
                          <span
                            key={resp}
                            className="inline-flex items-center text-xs bg-muted text-foreground px-2 py-0.5 rounded-md border border-border font-medium whitespace-nowrap"
                          >
                            {isBn ? (RESPONSIBILITY_NAMES_BN[resp] || resp) : resp}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic whitespace-nowrap">{tBilingual('Standard duties', 'সাধারণ দায়িত্ব')}</span>
                      )}
                      {extraCount > 0 && (
                        <span
                          className="inline-flex items-center text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border font-medium whitespace-nowrap"
                          title={tBilingual('Click row to view all duties', 'সকল দায়িত্ব দেখতে ক্লিক করুন')}
                        >
                          +{extraCount} {tBilingual('more', 'আরো')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Column 5: Branch Access */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-foreground">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                      <span className="truncate max-w-[140px] font-medium">
                        {getBranchName(u.branch_id)}
                      </span>
                    </div>
                    {u.user_branch_access && u.user_branch_access.length > 1 && (
                      <span className="text-xs text-muted-foreground ml-5 block mt-0.5">
                        +{u.user_branch_access.length - 1} {isBn ? 'অতিরিক্ত শাখা' : 'extra branch'}
                      </span>
                    )}
                  </td>

                  {/* Column 6: Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {isUserActive && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success text-success bg-success-surface bg-success-surface px-2 py-0.5 rounded-full border border-success-border border-success-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"/>
                        {tBilingual('Active', 'সক্রিয়')}
                      </span>
                    )}
                    {isUserInvited && (
                      <div className="flex flex-col items-center gap-0.5">
                        {u.is_expired ? (
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
                        {u.invitation_expires_at && !u.is_expired && (
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {(() => {
                              const diffMs = new Date(u.invitation_expires_at).getTime() - Date.now()
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
                  </td>

                  {/* Column 7: Last Login */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                    {lastLogin ? (
                      <div className="flex items-center gap-1.5"title={new Date(lastLogin).toLocaleString()}>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground"/>
                        <span>{formatDateTime(lastLogin, isBn ? 'bn' : 'en')}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">{tBilingual('Never logged in', 'কখনও লগইন করেননি')}</span>
                    )}
                  </td>

                  {/* Column 8: Actions */}
                  <td
                    className="px-5 py-3.5 whitespace-nowrap text-right min-w-[110px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(u)}
                        className="h-8 px-2 text-muted-foreground hover:text-primary dark:hover:text-primary font-medium"
                        title={tBilingual('View Full Profile & Diagnostics', 'সম্পূর্ণ প্রোফাইল ও বিবরণ দেখুন')}>
                        <Eye className="w-4 h-4 mr-1 shrink-0"/>
                        <span className="text-xs">{tBilingual('View', 'দেখুন')}</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                            <span className="sr-only">{tBilingual('Open menu', 'মেনু খুলুন')}</span>
                            <MoreVertical className="w-4 h-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onEditAccess(u)}>
                            <Shield className="w-4 h-4 mr-2 text-primary"/>
                            <span>{tBilingual('Edit Access & Role', 'অ্যাক্সেস ও রোল সম্পাদনা')}</span>
                          </DropdownMenuItem>
                          {onCustomizePermissions && (
                            <DropdownMenuItem onClick={() => onCustomizePermissions(u)}>
                              <Sliders className="w-4 h-4 mr-2 text-primary"/>
                              <span>{tBilingual('Permission Overrides', 'পারমিশন ওভাররাইড')}</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onLinkEmployee(u)}>
                            <UserCheck className="w-4 h-4 mr-2 text-success"/>
                            <span>{u.linked_employee ? tBilingual('Change Employee', 'কর্মী পরিবর্তন করুন') : tBilingual('Link Employee', 'কর্মী সংযুক্ত করুন')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onResetPassword(u)}>
                            <KeyRound className="w-4 h-4 mr-2 text-warning"/>
                            <span>{tBilingual('Send Password Reset', 'পাসওয়ার্ড রিসেট পাঠান')}</span>
                          </DropdownMenuItem>
                          {isUserInvited && onResendInvitation && (
                            <DropdownMenuItem onClick={() => onResendInvitation(u)}>
                              <RefreshCw className="w-4 h-4 mr-2 text-primary"/>
                              <span>{tBilingual('Resend Invitation', 'পুনরায় আমন্ত্রণ পাঠান')}</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {!isCurrentUser && !isLastActiveOwner && (
                            <DropdownMenuItem
                              onClick={() => onToggleStatus(u)}
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
                              onClick={() => onRemoveLogin(u)}
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
