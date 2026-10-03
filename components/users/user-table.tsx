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
} from 'lucide-react'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { getResponsibilityPresetsForRole } from '@/lib/auth/rbac.client'
import { formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

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
 onRemoveLogin: (user: CompanyUserWithProfile) => void
 onRefresh: () => void
}

function getRoleBadgeStyle(roleName: string) {
 const norm = roleName.toLowerCase()
 if (norm.includes('owner')) {
 return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  }
 if (norm.includes('manager') || norm.includes('admin')) {
 return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
  }
 if (norm.includes('sales')) {
 return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  }
 if (norm.includes('design')) {
 return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
  }
 if (norm.includes('operator') || norm.includes('production')) {
 return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
  }
 if (norm.includes('account') || norm.includes('cashier')) {
 return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
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
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
        {isBn ? 'সমগ্র প্রতিষ্ঠান' : 'Entire Company'}
      </span>
    )
  }
  if (s === 'branch') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
        {isBn ? 'শাখা' : 'Branch'}
      </span>
    )
  }
  if (s === 'department') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800">
        {isBn ? 'বিভাগ' : 'Department'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
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
    if (!b) return isBn ? 'শাখা' : 'Branch'
    if (isBn) {
      if ((b as any).name_bn) return (b as any).name_bn
      return b.name
        .replace(/Head Office/gi, 'প্রধান কার্যালয়')
        .replace(/Main Branch/gi, 'প্রধান শাখা')
        .replace(/Main/gi, 'প্রধান শাখা')
        .replace(/Branch/gi, 'শাখা')
    }
    return b.name
  }

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
              <th scope="col"className="px-5 py-3.5">{tBilingual('User', 'ব্যবহারকারী')}</th>
              <th scope="col"className="px-4 py-3.5">{tBilingual('Linked Employee', 'সংযুক্ত কর্মী')}</th>
              <th scope="col"className="px-4 py-3.5">{tBilingual('Role & Scope', 'রোল ও পরিসর')}</th>
              <th scope="col"className="px-4 py-3.5">{tBilingual('Key Responsibilities', 'মূল দায়িত্ব')}</th>
              <th scope="col"className="px-4 py-3.5">{tBilingual('Branch Access', 'শাখা অ্যাক্সেস')}</th>
              <th scope="col" className="px-4 py-3.5 text-center">{tBilingual('Status', 'স্ট্যাটাস')}</th>
              <th scope="col"className="px-4 py-3.5">{tBilingual('Last Login', 'সর্বশেষ লগইন')}</th>
              <th scope="col"className="px-5 py-3.5 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-border/80">
            {users.map((u) => {
 const roleName = u.role?.name || u.roles?.[0]?.name || 'Staff'
 const isCurrentUser = currentUserId && (u.user_id === currentUserId || u.id === currentUserId)
 const isOwner = roleName.toLowerCase().includes('owner')
 const initials = getUserInitials(u)
 const responsibilities = getResponsibilityPresetsForRole(roleName)
 const topResponsibilities = responsibilities.slice(0, 2)
 const extraCount = responsibilities.length - topResponsibilities.length
 const isUserActive = u.status === 'active'
 const isUserInvited = u.status === 'invited'
 const isUserDisabled = u.status === 'disabled'
 const lastLogin = u.last_login_at || (u.profile as any)?.last_sign_in_at

 return (
                <tr
 key={u.id}
 onClick={() => onViewDetails(u)}
 className="hover:bg-muted/70 dark:hover:bg-muted/40 cursor-pointer transition-colors group">
                  {/* Column 1: User Identity */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-xs flex items-center justify-center border border-border flex-shrink-0 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate text-sm">
                            {u.profile?.full_name || u.linked_employee?.name || tBilingual('Unnamed User', 'নামহীন ব্যবহারকারী')}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50/50">{tBilingual('You', 'আপনি')}</Badge>
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
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"/>
                          <span className="truncate">{u.linked_employee.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {u.linked_employee.employee_id_number && (
                            <span className="font-mono bg-muted px-1 rounded text-[10px] border border-border">
                              {u.linked_employee.employee_id_number}
                            </span>
                          )}
                          <span className="truncate">{u.linked_employee.role || u.linked_employee.department || tBilingual('Workforce', 'কর্মী')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium">
                          <AlertCircle className="w-3 h-3 text-amber-500"/>
                          {tBilingual('No Employee Profile', 'কর্মী প্রোফাইল নেই')}
                        </span>
                        <Button
 variant="ghost"size="sm"onClick={() => onLinkEmployee(u)}
 className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40">
 Link
                        </Button>
                      </div>
                    )}
                  </td>

                  {/* Column 3: Role & Data Scope */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', getRoleBadgeStyle(roleName))}>
                        {isBn ? (ROLE_NAMES_BN[roleName] || roleName) : roleName}
                      </span>
                      {getDataScopeBadge(u.data_scope || (u as any).dataScope, isBn)}
                    </div>
                  </td>

                  {/* Column 4: Key Responsibilities */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {topResponsibilities.length > 0 ? (
 topResponsibilities.map((resp) => (
                          <span
                            key={resp}
                            className="inline-flex items-center text-[10px] bg-muted text-foreground px-1.5 py-0.5 rounded border border-border /80 font-normal truncate"
                          >
                            {isBn ? (RESPONSIBILITY_NAMES_BN[resp] || resp) : resp}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">{tBilingual('Standard duties', 'সাধারণ দায়িত্ব')}</span>
                      )}
                      {extraCount > 0 && (
                        <span
 className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border"title={tBilingual('Click row to view all duties', 'সকল দায়িত্ব দেখতে ক্লিক করুন')}>+{extraCount} {tBilingual('more', 'আরো')}</span>
                      )}
                    </div>
                  </td>

                  {/* Column 5: Branch Access */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-foreground">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
                      <span className="truncate max-w-[130px] font-medium">
                        {getBranchName(u.branch_id)}
                      </span>
                    </div>
                    {u.user_branch_access && u.user_branch_access.length > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-5">
                        +{u.user_branch_access.length - 1} {isBn ? 'অতিরিক্ত শাখা' : 'extra branch'}
                      </span>
                    )}
                  </td>

                  {/* Column 6: Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {isUserActive && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                        {tBilingual('Active', 'সক্রিয়')}
                      </span>
                    )}
                    {isUserInvited && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>
                        {tBilingual('Invited', 'আমন্ত্রিত')}
                      </span>
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
 className="px-5 py-3.5 whitespace-nowrap text-right"onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
 variant="ghost"size="sm"onClick={() => onViewDetails(u)}
 className="h-8 px-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"title={tBilingual('View Full Profile & Diagnostics', 'সম্পূর্ণ প্রোফাইল ও বিবরণ দেখুন')}>
                        <Eye className="w-4 h-4 mr-1"/>
                        <span className="text-xs">{tBilingual('View', 'দেখুন')}</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
 variant="ghost"size="sm"className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="w-4 h-4"/>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end"className="w-48">
                          <DropdownMenuItem onClick={() => onEditAccess(u)}>
                            <Shield className="w-4 h-4 mr-2 text-blue-600"/>
                            <span>Edit Access & Role</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onLinkEmployee(u)}>
                            <UserCheck className="w-4 h-4 mr-2 text-emerald-600"/>
                            <span>{u.linked_employee ? tBilingual('Change Employee', 'কর্মী পরিবর্তন করুন') : tBilingual('Link Employee', 'কর্মী সংযুক্ত করুন')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onResetPassword(u)}>
                            <KeyRound className="w-4 h-4 mr-2 text-amber-600"/>
                            <span>{tBilingual('Send Password Reset', 'পাসওয়ার্ড রিসেট পাঠান')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {!isCurrentUser && (
                            <DropdownMenuItem
 onClick={() => onToggleStatus(u)}
 className={isUserActive ? 'text-amber-600' : 'text-emerald-600'}
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

                          {!isCurrentUser && (
                            <DropdownMenuItem
 onClick={() => onRemoveLogin(u)}
 className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40">
                              <Trash2 className="w-4 h-4 mr-2"/>
                              <span>{tBilingual('Remove Login', 'লগইন মুছে ফেলুন')}</span>
                            </DropdownMenuItem>
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
