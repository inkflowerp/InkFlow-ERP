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
 onRemoveLogin: (user: CompanyUserWithProfile) => void
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
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
        {isBn ? 'সমগ্র প্রতিষ্ঠান' : 'Entire Company'}
      </span>
    )
  }
  if (s === 'branch') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
        {isBn ? 'শাখা' : 'Branch'}
      </span>
    )
  }
  if (s === 'department') {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800">
        {isBn ? 'বিভাগ' : 'Department'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-foreground border border-border">
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
 onRemoveLogin,
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

 const roleName = user.role?.name || user.roles?.[0]?.name || 'Staff'
 const isCurrentUser = currentUserId && (user.user_id === currentUserId || user.id === currentUserId)
 const isUserActive = user.status === 'active'
 const isUserInvited = user.status === 'invited'
 const isUserDisabled = user.status === 'disabled'
 const lastLogin = user.last_login_at || (user.profile as any)?.last_sign_in_at
 const responsibilities = getResponsibilityPresetsForRole(roleName)
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
          <div className="w-10 h-10 rounded-full bg-muted text-foreground font-bold text-xs flex items-center justify-center border border-border flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate text-sm">
                {user.profile?.full_name || user.linked_employee?.name || tBilingual('Unnamed User', 'নামহীন ব্যবহারকারী')}
              </span>
              {isCurrentUser && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-700 bg-blue-50/50">{tBilingual('You', 'আপনি')}</Badge>
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
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
        </div>
      </div>

      {/* Row 2: Linked Workforce Employee Banner */}
      <div className="bg-muted rounded-lg p-2.5 border border-border /60 flex items-center justify-between gap-2">
        {user.linked_employee ? (
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">{tBilingual('Linked Employee', 'সংযুক্ত কর্মী')}</div>
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"/>
              <span className="truncate">{user.linked_employee.name}</span>
              {user.linked_employee.employee_id_number && (
                <span className="font-mono text-[10px] bg-card px-1 rounded border border-border">
                  {user.linked_employee.employee_id_number}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"/>
            <span className="text-[11px] font-medium">{tBilingual('No linked workforce record', 'কোনো কর্মী প্রোফাইল সংযুক্ত নেই')}</span>
          </div>
        )}

        <Button
 variant="ghost"size="sm"onClick={() => onLinkEmployee(user)}
 className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 flex-shrink-0 font-medium min-h-[36px]">
          {user.linked_employee ? tBilingual('Change', 'পরিবর্তন') : tBilingual('Link', 'যুক্ত করুন')}
        </Button>
      </div>

      {/* Row 3: Role, Scope & Branch */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">Role & Scope</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md border', getRoleBadgeStyle(roleName))}>
              {isBn ? (ROLE_NAMES_BN[roleName] || roleName) : roleName}
            </span>
            {getDataScopeBadge(user.data_scope || (user as any).dataScope, isBn)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">{tBilingual('Branch Access', 'শাখা অ্যাক্সেস')}</div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
            <span className="truncate">{getBranchName(user.branch_id)}</span>
          </div>
        </div>
      </div>

      {/* Row 4: Responsibilities */}
      {topResponsibilities.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="text-[11px] text-muted-foreground">{tBilingual('Assigned Duties', 'নির্ধারিত দায়িত্ব')}</div>
          <div className="flex flex-wrap gap-1">
            {topResponsibilities.map((resp) => (
              <span
                key={resp}
                className="inline-flex items-center text-[10px] bg-muted text-foreground px-2 py-0.5 rounded border border-border"
              >
                {isBn ? (RESPONSIBILITY_NAMES_BN[resp] || resp) : resp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Last Login Meta & Touch Action Buttons */}
      <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground"/>
          <span>
            {lastLogin ? formatDateTime(lastLogin, isBn ? 'bn' : 'en') : tBilingual('Never logged in', 'কখনও লগইন করেননি')}
          </span>
        </div>

        {/* Buttons (min-h-[44px] touch target for accessibility) */}
        <div className="flex items-center gap-2">
          <Button
 variant="outline"size="sm"onClick={() => onEditAccess(user)}
 className="h-10 min-h-[44px] px-3 text-xs font-medium text-foreground border-border">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-600"/>
            {tBilingual('Access', 'অ্যাক্সেস')}
          </Button>

          <Button
 variant="default"size="sm"onClick={() => onViewDetails(user)}
 className="h-10 min-h-[44px] px-3.5 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground">
            <Eye className="w-3.5 h-3.5 mr-1.5"/>
            {tBilingual('Details', 'বিস্তারিত')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
 variant="ghost"size="sm"className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 text-muted-foreground hover:text-foreground dark:hover:text-foreground">
                <MoreVertical className="w-4 h-4"/>
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end"className="w-48">
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <KeyRound className="w-4 h-4 mr-2 text-amber-600"/>
                <span>{tBilingual('Reset Password', 'পাসওয়ার্ড রিসেট')}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {!isCurrentUser && (
                <DropdownMenuItem
 onClick={() => onToggleStatus(user)}
 className={isUserActive ? 'text-amber-600' : 'text-emerald-600'}
                >
                  {isUserActive ? (
                    <>
                      <UserX className="w-4 h-4 mr-2"/>
                      <span>Disable Login</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2"/>
                      <span>Enable Login</span>
                    </>
                  )}
                </DropdownMenuItem>
              )}

              {!isCurrentUser && (
                <DropdownMenuItem
 onClick={() => onRemoveLogin(user)}
 className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/40">
                  <Trash2 className="w-4 h-4 mr-2"/>
                  <span>Remove Login</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
